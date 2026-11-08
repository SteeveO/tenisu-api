# CLAUDE.md

API REST de statistiques de joueurs de tennis, réalisée pour le test technique L'Atelier.
Évaluée sur : propreté et lisibilité du code, architecture, fondamentaux REST, gestion des exceptions, tests unitaires.
Chaque choix doit pouvoir être justifié à l'oral : privilégie le simple et l'explicite au malin.

## Stack

- Node 22, TypeScript strict (pas de `any`, pas de `as` sauf justification en commentaire)
- Hono + `@hono/zod-openapi` (routes, validation et doc OpenAPI au même endroit), dans une seule Lambda derrière API Gateway HTTP API
- DynamoDB (AWS SDK v3, une seule table), S3 + CloudFront pour les images
- Zod pour la validation, Vitest pour les tests, ESLint + Prettier
- Terraform pour l'infra (`infra/`), GitHub Actions pour la CI/CD
- Local : Docker Compose (DynamoDB Local + LocalStack)
- Pas de NestJS ni d'autre framework applicatif

## Commandes

```bash
npm run dev               # API en local via src/server.ts (http://localhost:3000)
npm test                  # tests unitaires (in-memory, aucun réseau)
npm run test:integration  # tests sur DynamoDB Local (docker compose up requis)
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
docker compose up         # DynamoDB Local + LocalStack
npm run seed              # (re)charge les données et images initiales, idempotent
```

Avant de considérer une tâche terminée : `npm run lint && npm run typecheck && npm test` doivent passer.

## Architecture (hexagonale)

```
src/
  domain/        # entités, règles métier, référentiel des pays : fonctions pures, aucune dépendance (ni AWS, ni Hono, ni Zod)
  application/   # cas d'usage : orchestrent le domaine via les ports
  ports/         # interfaces (PlayerRepository, ImageStorage…)
  adapters/      # implémentations : in-memory, DynamoDB, S3
  http/          # routes Hono/OpenAPI, schémas Zod, mapping des erreurs
  handler.ts     # point d'entrée Lambda : assemble les dépendances (injection manuelle)
  server.ts      # point d'entrée local (@hono/node-server), même assemblage que handler.ts
scripts/         # seed, préparation des images (sharp, lancé une fois), génération du référentiel des pays
assets/          # données (headtohead.json) et images initiales déjà normalisées, committées
infra/           # Terraform
```

Règles :

- Les dépendances pointent vers l'intérieur : `http` → `application` → `domain`. Le domaine n'importe jamais rien d'un autre dossier.
- Les adaptateurs implémentent un port ; un même jeu de tests de contrat tourne sur l'implémentation in-memory et DynamoDB.
- Pas de logique métier dans les routes : une route valide, appelle un cas d'usage, formate la réponse.

## REST et erreurs

- Routes : `GET /players`, `GET /players/{id}`, `POST /players`, `GET /stats`, `GET /countries`, `POST /players/{id}/picture`, `GET /health`, `GET /docs`.
- `POST /players` répond `201` avec un header `Location`. L'`id` est généré par le serveur (compteur atomique DynamoDB) ; un `id` dans le corps est refusé (`400`).
- `POST /players/{id}/picture` répond `200` avec un formulaire POST présigné S3.
- Erreurs au format RFC 7807 (`application/problem+json`) via un handler d'erreurs unique :
  `400` validation (y compris id non numérique dans l'URL, pays inconnu), `404` ressource introuvable, `409` joueur déjà existant (même prénom et nom, sans tenir compte de la casse ni des accents), `415` corps non JSON, `500` générique sans détail interne.
- Les erreurs métier sont des classes typées du domaine (`PlayerNotFoundError`…), traduites en HTTP uniquement dans `http/`.
- Format de `GET /stats` : voir D15 (ex aequo tous renvoyés, liste vide = `200` avec `null`).

## Persistance (DynamoDB, une table)

- `PK = PLAYER#{id}` joueur ; `PK = NAME#{prénom}#{nom}` (normalisé) unicité ; `PK = COUNTER#player` compteur.
- La liste des joueurs passe par le GSI `entityType` (Query, jamais de Scan) ; le tri final se fait en mémoire.
- Création = `TransactWriteItems` (joueur + élément de nom avec condition d'absence).
- Le seed est idempotent : il ne fait jamais redescendre le compteur.

## Pièges connus des données

- Tri « du meilleur au moins bon » : `rank` croissant, puis `points` décroissants en cas d'égalité, puis `id` croissant (ordre déterministe).
- `weight` est en grammes, `height` en centimètres : convertir pour l'IMC (kg / m²).
- Ratio de victoires par pays : total des victoires du pays / total de ses matchs (`last`, 1 = victoire), pas la moyenne des ratios.
- Médiane : gérer un nombre pair d'éléments.
- `country.code` est un code CIO (ex. `SUI`), pas ISO : passer par le référentiel des pays du domaine.
- En base, stocker des clés d'images, jamais d'URL complète : photos `players/{id}/{hash}.webp`, drapeaux `flags/{iso}.svg` ; l'URL est construite avec `CDN_BASE_URL`.
- Valeurs attendues sur le jeu initial : pays = SRB (5/5), IMC moyen ≈ 23,36, médiane = 185 cm.

## Tests

- Le domaine est testé en priorité, cas limites compris (liste vide, égalités, nombre pair).
- Tests unitaires : adaptateur in-memory, aucun réseau. Tests d'intégration (contrat, transactions, concurrence) : DynamoDB Local.
- Un bug corrigé = un test qui le reproduit.

## Conventions

- Code, noms et commentaires en anglais ; README, docs, tickets, commits et PR en français.
- La branche `main` est protégée : tout passe par une pull request dont la CI est verte.
- Branche, commits et PR contiennent l'identifiant Linear : branche `ten-12-images-s3`, PR `TEN-12 Images S3 + CloudFront`. Un ticket par PR.
- Le job de CI s'appelle `ci` (nom utilisé par la protection de branche).
- Toute décision d'architecture ou de périmètre est ajoutée à `docs/decisions.md` (quoi, pourquoi, alternatives écartées).
- Ne jamais committer de secret ni de clé AWS ; l'accès AWS en CI passe par OIDC.

## Infra

- Région : eu-north-1 (Stockholm). CloudFront est global ; un éventuel certificat ACM pour un domaine personnalisé doit être créé en us-east-1.
- Profil AWS local : `tenisu` (IAM Identity Center, `aws sso login --profile tenisu`, puis `AWS_PROFILE=tenisu`).
- Lambdas en arm64 ; `sharp` installé pour `linux-arm64` au packaging (D30).
- Throttling API Gateway : 50 req/s, burst 100 ; reserved concurrency 10 (API) et 2 (traitement des photos) ; budget 5 USD/mois hors Terraform (D32).

## Hors périmètre (sauf ticket explicite)

Authentification, limite de débit par adresse IP (WAF), autre base de données, framework front.

## Décisions du projet

@docs/decisions.md
