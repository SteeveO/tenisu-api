# Tenisu API

[![CI](https://github.com/SteeveO/tenisu-api/actions/workflows/ci.yml/badge.svg)](https://github.com/SteeveO/tenisu-api/actions/workflows/ci.yml)

API REST de statistiques de joueurs de tennis, réalisée pour le test technique L'Atelier.

> Projet en cours de construction : ce README sera complété au fil des tickets (lancement local, URL déployée, exemples de requêtes).

## Stack

Node 22, TypeScript strict, [Hono](https://hono.dev) dans une Lambda AWS derrière API Gateway, DynamoDB, S3 + CloudFront, Terraform, Vitest. Les choix sont justifiés dans le [journal des décisions](docs/decisions.md).

## Démarrage

Prérequis : Node 22 (`nvm use` lit le fichier `.nvmrc`).

```bash
npm install
npm run dev     # API sur http://localhost:3000
```

## Scripts

| Commande                   | Rôle                                                |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | API en local, rechargée à chaque modification       |
| `npm test`                 | tests unitaires (aucun réseau)                      |
| `npm run test:coverage`    | tests unitaires avec rapport de couverture          |
| `npm run test:integration` | tests d'intégration sur DynamoDB Local              |
| `npm run lint`             | ESLint (dont les règles d'architecture) et Prettier |
| `npm run format`           | formate le code avec Prettier                       |
| `npm run typecheck`        | vérification des types (`tsc --noEmit`)             |

## Architecture

Architecture hexagonale : le métier ne dépend de rien, l'infrastructure dépend du métier.

```
src/
  domain/        # entités et règles métier : fonctions pures, sans aucune dépendance
  application/   # cas d'usage : orchestrent le domaine via les ports
  ports/         # interfaces (PlayerRepository, ImageStorage…)
  adapters/      # implémentations des ports : in-memory, DynamoDB, S3
  http/          # routes Hono, validation, traduction des erreurs en HTTP
  handler.ts     # point d'entrée Lambda : assemble les dépendances
  server.ts      # point d'entrée local, même assemblage que handler.ts
scripts/         # seed, préparation des images
assets/          # données et images initiales, committées
infra/           # Terraform
docs/            # journal des décisions
```

Les dépendances pointent vers l'intérieur (`http` → `application` → `domain`). Cette règle n'est pas qu'une convention : ESLint refuse qu'un fichier du domaine importe une autre couche, AWS, Hono ou Zod, et qu'un cas d'usage importe un adaptateur.
