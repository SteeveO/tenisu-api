# État actuel du projet

Ce qui est vrai aujourd'hui, à mettre à jour dès qu'une décision change une règle. Les règles de travail et de code sont dans `CLAUDE.md`. Pour connaître le motif d'une décision (`Dn`) ou les alternatives écartées, consulter le journal du cycle : [v1](decisions/v1/decisions.md).

**Cycle en cours :** v1 terminé. Une nouvelle décision ouvre `docs/decisions/v2/decisions.md`, en continuant la numérotation (la prochaine est D45).

## Périmètre

- Routes : voir `CLAUDE.md`. Spécification sur `/openapi.json`, Swagger UI sur `/docs` (D26).
- Non réalisés : upload de photo (D24), front (D13), authentification, limite par adresse IP, domaine personnalisé. Voir « Hors périmètre » dans le journal v1.
- Les joueurs créés par l'API ont `picture: null`.

## Contrat de l'API

- Format de `headtohead.json` conservé (D36) ; unités documentées dans OpenAPI, noms explicites dans le domaine.
- Corps strict sur la structure, tolérant sur la casse des codes `sex` et `country.code` (D36).
- `GET /players` : `{ players, nextCursor }` ; filtres `sex`, `country` ; `limit` de 1 à 100, 100 par défaut ; curseur par position dans le tri ; pays inconnu → `400` (D42).
- `GET /countries` : `{ countries: [{ code, name, picture }] }`, tri français, cache d'un jour (D41).
- `GET /stats` : format de D15. `GET /health` : `200`, sans accès à la base (D43).
- CORS ouvert à toutes les origines pour `GET` et `POST` ; `Location` et `X-Request-Id` exposés (D40).

## Validation et données

- Valeurs validées à chaque entrée (`POST /players`, seed), pas dans le domaine (D34). Bornes : taille 100–250 cm, poids 30 000–200 000 g (D36), âge 1–100.
- Le référentiel des pays est généré une fois et committé ; 206 codes CIO (D33).
- Le seed insère ce qui manque, n'écrase aucun joueur et ne fait jamais redescendre le compteur (D22, D37).
- Un `409` consomme un identifiant ; `GET /players` peut être en léger retard sur une création (GSI) ; un `TransactionConflict` est relancé, jusqu'à trois tentatives au total (D35).

## Images

- Bucket S3 privé, lu uniquement par CloudFront (D7, D39). En base : des clés, jamais d'URL (D17).
- Photos `players/{id}/{hash}.webp`, immuables un an (D18, D39). Drapeaux `flags/{iso}.svg`, cache d'un jour (D11, D39).
- Images initiales préparées une fois par `sharp`, committées dans `assets/images/` (D23, D37).

## Observabilité

- Un journal JSON par requête via le port `Logger` (Powertools) ; seules les `500` sont des erreurs (D43).
- Sur AWS, `X-Request-Id` vaut le `function_request_id` des journaux (D43).

## Environnement et livraison

- Local : `docker compose up` lance tout, API comprise ; `docker compose up -d seed` pour développer avec `npm run dev` ; `npm run dev:memory` sans conteneur (D37). LocalStack figé en 4.9.2 volontairement (D37).
- AWS (`eu-north-1`) : API Gateway HTTP API, une Lambda arm64, une table DynamoDB, S3, CloudFront ; 50 requêtes/s, pics à 100 ; concurrence réservée à 10 (D3, D30, D32).
- `infra/bootstrap` s'applique à la main : state, OIDC, rôles `tenisu-github-deploy` et `tenisu-github-plan` (D38). Toute nouvelle ressource impose d'y étendre les droits de ces deux rôles.
- Le `sub` OIDC utilise les identifiants immuables de GitHub (D38).
- Une PR reçoit le `terraform plan` en commentaire ; un push sur `main` applique Terraform puis lance le seed (D38, D39).

## Décisions remplacées ou abandonnées

À ne pas appliquer : D9 et D28 (remplacées par D24 et D32), D13 (front abandonné), D24 et D31 (upload non réalisé). Partiellement appliquées : D30 (pas de `sharp` dans la Lambda), D32 (pas de Lambda de traitement des photos).
