# Tenisu API

[![CI](https://github.com/SteeveO/tenisu-api/actions/workflows/ci.yml/badge.svg)](https://github.com/SteeveO/tenisu-api/actions/workflows/ci.yml)

API REST de statistiques de joueurs de tennis, réalisée pour le test technique L'Atelier.

- **API déployée :** https://os6aj9jux6.execute-api.eu-north-1.amazonaws.com
- **Documentation interactive (Swagger UI) :** https://os6aj9jux6.execute-api.eu-north-1.amazonaws.com/docs

## Essayer l'API

```bash
API=https://os6aj9jux6.execute-api.eu-north-1.amazonaws.com

curl "$API/players"                          # joueurs, du meilleur au moins bon
curl "$API/players/52"                       # un joueur
curl "$API/stats"                            # meilleur pays, IMC moyen, taille médiane
curl "$API/countries"                        # pays acceptés à la création
curl "$API/players?sex=F&country=USA&limit=1" # filtres et pagination
curl "$API/health"                           # l'API répond-elle ?
```

Créer un joueur ; relancer la même commande répond `409`, car le nom existe déjà :

```bash
curl -i -X POST "$API/players" \
  -H 'Content-Type: application/json' \
  -d '{
    "firstname": "Carlos",
    "lastname": "Alcaraz",
    "shortname": "C.ALC",
    "sex": "M",
    "country": { "code": "ESP" },
    "data": { "rank": 3, "points": 2000, "weight": 74000, "height": 183, "age": 21, "last": [1, 1, 0] }
  }'
```

| Route               | Rôle                                                     | Réponses                   |
| ------------------- | -------------------------------------------------------- | -------------------------- |
| `GET /players`      | liste triée, filtres `sex`, `country`, `limit`, `cursor` | `200`, `400`               |
| `GET /players/{id}` | un joueur                                                | `200`, `400`, `404`        |
| `POST /players`     | création, avec un header `Location`                      | `201`, `400`, `409`, `415` |
| `GET /stats`        | statistiques demandées                                   | `200`                      |
| `GET /countries`    | pays disponibles, avec leur drapeau                      | `200`                      |
| `GET /health`       | état de l'API                                            | `200`                      |
| `GET /docs`         | Swagger UI (spécification sur `/openapi.json`)           | `200`                      |

Les erreurs suivent la RFC 7807 (`application/problem+json`). Sur AWS, chaque réponse porte un en-tête `X-Request-Id` qui retrouve le journal correspondant dans CloudWatch.

## Lancer le projet en local

Avec Docker ou Podman, sans Node ni compte AWS :

```bash
docker compose up   # ou : podman compose up
```

L'API répond sur http://localhost:3000, sa documentation sur http://localhost:3000/docs. La commande lance DynamoDB Local et LocalStack (S3), charge les joueurs et les images, puis démarre l'API. Après une modification du code ou des données, ajouter `--build`.

Pour développer (Node 22, `nvm use` lit le fichier `.nvmrc`), l'API tourne sur la machine et se recharge à chaque modification :

```bash
npm install
docker compose up -d seed   # tout sauf l'API
npm run dev
```

Sans aucun conteneur, avec les joueurs initiaux en mémoire (les URLs d'images ne répondent pas dans ce mode) :

```bash
npm install
npm run dev:memory
```

## Tests et qualité

```bash
npm test                        # tests unitaires, sans réseau
npm run lint && npm run typecheck

docker compose up -d dynamodb   # laisser quelques secondes à DynamoDB Local pour démarrer
npm run test:integration        # contrat et transactions
```

Le domaine est testé en priorité, cas limites compris. Un même jeu de tests de contrat tourne sur le dépôt en mémoire et sur DynamoDB.

| Commande                     | Rôle                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `npm run dev`                | API locale sur DynamoDB Local, rechargée à chaque modification |
| `npm run dev:memory`         | API locale en mémoire, sans conteneur                          |
| `npm test`                   | tests unitaires                                                |
| `npm run test:coverage`      | tests unitaires avec rapport de couverture                     |
| `npm run test:integration`   | tests d'intégration sur DynamoDB Local                         |
| `npm run lint`               | ESLint (dont les règles d'architecture) et Prettier            |
| `npm run typecheck`          | vérification des types                                         |
| `npm run format`             | formate le code avec Prettier                                  |
| `npm run build`              | bundle de la Lambda                                            |
| `npm run seed`               | ajoute les données manquantes et les images, idempotent        |
| `npm run prepare:images`     | prépare une fois les photos et drapeaux committés              |
| `npm run generate:countries` | régénère le référentiel des pays du domaine                    |

## Architecture

Architecture hexagonale : le métier ne dépend de rien, l'infrastructure dépend du métier.

```
src/
  domain/        # entités et règles métier : fonctions pures, sans aucune dépendance
  application/   # cas d'usage : orchestrent le domaine via les ports
  ports/         # interfaces (PlayerRepository, Logger)
  adapters/      # implémentations des ports : in-memory, DynamoDB
  http/          # routes Hono/OpenAPI, validation, traduction des erreurs en HTTP
  seed/          # conversion validée des données initiales
  handler.ts     # point d'entrée Lambda : assemble les dépendances
  server.ts      # point d'entrée local, même assemblage que handler.ts
scripts/         # seed, préparation des images, génération du référentiel des pays
assets/          # données et images initiales, committées
infra/           # Terraform (infra/bootstrap : state, OIDC, rôles de déploiement)
docs/            # journal des décisions
```

Les dépendances pointent vers l'intérieur (`http` → `application` → `domain`). Cette règle n'est pas qu'une convention : ESLint refuse qu'un fichier du domaine importe une autre couche, AWS, Hono ou Zod, et qu'un cas d'usage importe un adaptateur.

**Stack :** Node 22, TypeScript strict, [Hono](https://hono.dev) et `@hono/zod-openapi` dans une Lambda arm64 derrière API Gateway, DynamoDB, S3 + CloudFront, Terraform, Vitest.

## Décisions clés

Chaque choix est consigné avec son motif et les alternatives écartées dans le [journal des décisions](docs/decisions.md). Les principaux :

- **[D2](docs/decisions.md#d2-pas-de-nestjs--architecture-hexagonale-explicite-avec-hono) — Hono et hexagonal écrit à la main, sans NestJS :** pour quelques routes sur Lambda, les frontières restent visibles et le démarrage à froid court.
- **[D20](docs/decisions.md#d20-modèle-dynamodb--une-seule-table-clés-préfixées-index-par-type) et [D21](docs/decisions.md#d21-unicité-des-joueurs-garantie-par-transaction) — une table DynamoDB, unicité par transaction :** deux créations simultanées du même joueur ne peuvent pas réussir toutes les deux.
- **[D36](docs/decisions.md#d36-lapi-conserve-le-format-de-headtoheadjson) — le format de `headtohead.json` est conservé :** on ne casse pas un contrat de données fourni. Le domaine garde des noms explicites, la traduction se fait dans `http/`.
- **[D34](docs/decisions.md#d34-valeurs-des-joueurs-validées-aux-entrées-du-système) — validation à chaque entrée du système :** une taille à 0 ne peut pas entrer, ni par l'API ni par le seed, donc pas d'IMC infini.
- **[D42](docs/decisions.md#d42-filtres-et-pagination-de-get-players) — pagination par position dans le tri :** une création entre deux pages ne répète ni ne saute aucun joueur.
- **[D38](docs/decisions.md#d38-infrastructure-terraform-et-déploiement-par-oidc) — déploiement par OIDC :** aucune clé AWS stockée, et seul `main` peut déployer.

## Livraison

`main` est protégée : pull request et CI verte obligatoires, ni force push ni suppression, fusion en squash ([D29](docs/decisions.md#d29-branche-main-protégée)). Chaque pull request reçoit en commentaire le `terraform plan` de ses changements, avec un rôle AWS en lecture seule. Un push sur `main` applique Terraform puis charge les données initiales, sans étape manuelle.

La mise en place initiale ne se fait qu'une fois, avec un compte administrateur :

```bash
aws sso login --profile tenisu
cd infra/bootstrap
AWS_PROFILE=tenisu terraform init
AWS_PROFILE=tenisu terraform apply
```

## Limites connues et ce que je ferais ensuite

- **Upload de photos :** non réalisé. Les joueurs créés par l'API gardent `picture: null`. Le flux prévu est décrit dans [D24](docs/decisions.md#d24-upload-de-photo--post-présigné-et-traitement-asynchrone) : POST présigné vers S3, puis traitement asynchrone par une Lambda.
- **Authentification des écritures :** `POST /players` est public. J'ajouterais un authorizer JWT sur API Gateway.
- **Limite de débit par adresse IP :** la limite actuelle (50 requêtes/s) est globale ; une limite par IP passerait par AWS WAF.
- **Index trié :** chaque page relit tous les joueurs, ce qui reste négligeable à ce volume. Au-delà de quelques milliers, un index trié s'imposerait.
- **Domaine personnalisé :** il permettrait notamment d'imposer TLS 1.2 au minimum sur CloudFront, ce que le certificat par défaut ne permet pas.

## Utilisation de l'IA

J'ai réalisé ce projet avec Claude Code, qui a écrit l'essentiel du code. J'ai travaillé ainsi :

- **Le découpage et les décisions sont les miens :** tickets Linear, choix d'architecture et de périmètre, arbitrages. Le front et l'upload de photos ont par exemple été retirés sur décision de ma part.
- **Relecture critique à chaque pull request :** une seconde instance relisait les changements, et je décidais des remarques à retenir. Toutes les pull requests sont passées par la CI avant que je les fusionne.
- **Décisions consignées au fil de l'eau** dans le journal, avec leurs motifs et les alternatives écartées, pour pouvoir justifier chaque choix.

## Faire évoluer le journal des décisions

`docs/decisions.md` sert aussi de contexte à un assistant IA qui découvre le projet. Un fichier unique convient à cette première version. Sur la durée, je l'organiserais par cycle de vie de l'application : un dossier par version majeure (`docs/decisions/v1/`, `v2/`…) qui fige les décisions de ce cycle, à côté d'un document court décrivant l'état actuel, seul chargé par défaut. L'assistant reçoit ainsi la vérité du moment sans relire tout l'historique, et ne consulte une décision passée que pour en connaître le motif.
