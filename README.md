# Tenisu API

[![CI](https://github.com/SteeveO/tenisu-api/actions/workflows/ci.yml/badge.svg)](https://github.com/SteeveO/tenisu-api/actions/workflows/ci.yml)

API REST de statistiques de joueurs de tennis, réalisée pour le test technique L'Atelier.

> Projet en cours de construction : ce README sera complété au fil des tickets (lancement local, URL déployée, exemples de requêtes).

## Stack

Node 22, TypeScript strict, [Hono](https://hono.dev) dans une Lambda AWS derrière API Gateway, DynamoDB, S3 + CloudFront, Terraform, Vitest. Les choix sont justifiés dans le [journal des décisions](docs/decisions.md).

## Démarrage

Aucun compte AWS n'est nécessaire.

Avec Docker ou Podman, sans installer Node :

```bash
docker compose up   # ou : podman compose up
```

L'API répond sur http://localhost:3000 et sa documentation sur http://localhost:3000/docs. La commande lance DynamoDB Local et LocalStack (S3), charge les joueurs et les images, puis démarre l'API. Après une modification du code ou des données, ajouter `--build`.

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

## Scripts

| Commande                     | Rôle                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `npm run dev`                | API locale sur DynamoDB Local, rechargée à chaque modification |
| `npm run dev:memory`         | API locale en mémoire, sans conteneur                          |
| `npm test`                   | tests unitaires (aucun réseau)                                 |
| `npm run test:coverage`      | tests unitaires avec rapport de couverture                     |
| `npm run test:integration`   | tests d'intégration sur DynamoDB Local                         |
| `npm run lint`               | ESLint (dont les règles d'architecture) et Prettier            |
| `npm run format`             | formate le code avec Prettier                                  |
| `npm run generate:countries` | régénère le référentiel des pays du domaine                    |
| `npm run prepare:images`     | prépare une fois les photos et drapeaux committés              |
| `npm run seed`               | ajoute les données manquantes et les images, idempotent        |
| `npm run typecheck`          | vérification des types (`tsc --noEmit`)                        |

## Déploiement

Un push sur `main` déploie l'API sur AWS avec Terraform, une fois la CI réussie, via OIDC et sans clé AWS stockée. La première mise en place se fait une seule fois avec un compte administrateur :

```bash
aws sso login --profile tenisu
cd infra/bootstrap
AWS_PROFILE=tenisu terraform init
AWS_PROFILE=tenisu terraform apply
```

## Architecture

Architecture hexagonale : le métier ne dépend de rien, l'infrastructure dépend du métier.

```
src/
  domain/        # entités et règles métier : fonctions pures, sans aucune dépendance
  application/   # cas d'usage : orchestrent le domaine via les ports
  ports/         # interfaces (PlayerRepository, ImageStorage…)
  adapters/      # implémentations des ports : in-memory, DynamoDB, S3
  http/          # routes Hono, validation, traduction des erreurs en HTTP
  seed/          # conversion validée des données initiales
  handler.ts     # point d'entrée Lambda : assemble les dépendances
  server.ts      # point d'entrée local, même assemblage que handler.ts
scripts/         # seed, préparation des images
assets/          # données et images initiales, committées
infra/           # Terraform
docs/            # journal des décisions
```

Les dépendances pointent vers l'intérieur (`http` → `application` → `domain`). Cette règle n'est pas qu'une convention : ESLint refuse qu'un fichier du domaine importe une autre couche, AWS, Hono ou Zod, et qu'un cas d'usage importe un adaptateur.

Les drapeaux proviennent de [flag-icons](https://github.com/lipis/flag-icons) (licence MIT, copiée dans `assets/images/flags/LICENSE`).
