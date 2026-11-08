# Journal des décisions

Chaque décision d'architecture ou de périmètre est consignée ici : ce qui a été choisi, pourquoi, et les alternatives écartées.
Format : une entrée par décision, numérotée, jamais supprimée (si une décision est remplacée, on l'indique et on ajoute la nouvelle).

---

## D1. Node 22 et TypeScript strict

- **Décision** : Node 22 (LTS) et TypeScript en mode strict.
- **Pourquoi** : stack du client pour lequel la mission est prévue (Node/TS sur AWS) ; le typage strict sécurise le domaine et documente le code.
- **Alternatives écartées** : autres langages ; aucune techno n'était imposée, mais rien ne justifiait de s'éloigner du contexte client.

## D2. Pas de NestJS : architecture hexagonale explicite avec Hono

- **Décision** : domaine pur, ports (interfaces) et adaptateurs écrits à la main, injection des dépendances au point d'entrée ; Hono comme routeur HTTP.
- **Pourquoi** : pour quatre à six endpoints sur Lambda, NestJS alourdit le bundle et le démarrage à froid, et masque l'architecture derrière ses conventions. Ici les frontières sont visibles dans l'arborescence et testables isolément. Hono est léger, typé, et tourne aussi bien sur Lambda qu'en local.
- **Alternatives écartées** : NestJS (pertinent pour une API amenée à grossir avec une équipe nombreuse) ; Express (vieillissant, typage faible).

## D3. AWS serverless : API Gateway HTTP API, une Lambda, DynamoDB

- **Décision** : une seule Lambda contenant le routeur, exposée par API Gateway HTTP API ; persistance DynamoDB.
- **Pourquoi** : alignement avec la stack client, coût quasi nul, aucun serveur à maintenir. Une Lambda unique simplifie le déploiement, le test local et mutualise les démarrages à froid.
- **Alternatives écartées** : une Lambda par route (granularité IAM et scaling fins, mais configuration multipliée sans gain à cette échelle) ; conteneur sur ECS ou Cloud Run (plus d'infrastructure à maintenir).

## D4. Terraform pour l'infrastructure

- **Décision** : toute l'infrastructure est décrite en Terraform, avec un state distant (S3 + verrou).
- **Pourquoi** : outil standard du marché, indépendant du langage applicatif, maîtrisé.
- **Alternatives écartées** : AWS CDK (tout en TypeScript, mais lié à AWS) ; SAM (moins adapté à une infra qui dépasse la seule Lambda).

## D5. Intégration continue dès le début du projet

- **Décision** : workflow GitHub Actions (lint, typecheck, tests) mis en place dans les premiers tickets ; le déploiement automatique est ajouté avec l'infrastructure.
- **Pourquoi** : chaque push est vérifié depuis le premier jour ; la qualité est garantie en continu plutôt que contrôlée à la fin.
- **Alternatives écartées** : CI ajoutée en fin de projet (risque de découvrir tard des régressions).

## D6. Persistance DynamoDB alimentée depuis le JSON fourni

- **Décision** : les données de `headtohead.json` sont chargées dans DynamoDB par un script d'initialisation, réutilisé en local et sur AWS.
- **Pourquoi** : l'endpoint de création impose une persistance. Sur Lambda, le système de fichiers est en lecture seule et éphémère : écrire dans le JSON est impossible.
- **Alternatives écartées** : modifier le fichier JSON (impossible en serverless) ; base relationnelle RDS (surdimensionnée et payante pour ce modèle d'accès).

## D7. Images servies par S3 et CloudFront ; la base stocke des clés

- **Statut** : format des clés de photos précisé par D18 (`players/{id}/{hash}.webp`).
- **Décision** : bucket S3 privé, lu uniquement par CloudFront (Origin Access Control). En base, on stocke des clés (`players/{id}.webp`) ; l'URL publique est construite à la réponse à partir de `CDN_BASE_URL`.
- **Pourquoi** : plus de dépendance au domaine tiers d'origine ; changer de domaine ou de CDN ne demande aucune migration de données. CloudFront fait partie de la stack client.
- **Alternatives écartées** : conserver les URLs d'origine (dépendance externe sans garantie) ; servir les images via la Lambda (coûteux, limité à 6 Mo par réponse).

## D8. Drapeaux normalisés par pays

- **Décision** : un seul fichier par pays (`flags/{code}.svg`), l'URL du drapeau se déduit du code pays du joueur.
- **Pourquoi** : le jeu initial duplique le drapeau des USA sur deux joueuses ; la normalisation évite la duplication et rend le drapeau cohérent pour tout nouveau joueur.
- **Alternatives écartées** : une image de drapeau par joueur (duplication).

## D9. Upload de photo par URL S3 présignée

- **Statut** : remplacée par D24 (POST présigné et traitement asynchrone).
- **Décision** : `POST /players/{id}/picture` renvoie une URL de téléversement présignée ; le client envoie le fichier directement dans S3. L'URL impose le type d'image et une taille maximale.
- **Pourquoi** : l'image ne transite pas par la Lambda (limite de 6 Mo, encodage base64 coûteux) ; la création d'un joueur reste un JSON simple.
- **Alternatives écartées** : image en base64 dans le `POST /players` (lourd, limité, mélange les responsabilités).

## D10. Environnement local avec Docker Compose

- **Décision** : `docker compose up` lance DynamoDB Local et LocalStack (S3), crée la table et le bucket, puis charge les données. Un mode « mémoire » (variable d'environnement) permet aussi de lancer l'API sans aucune dépendance.
- **Pourquoi** : n'importe quel relecteur peut tester le projet en une commande, sans compte AWS, avec la même configuration qu'en production à l'adresse près.
- **Alternatives écartées** : SAM local (lourd, lié à l'outillage AWS) ; MinIO (possible, mais LocalStack reproduit plus fidèlement les URLs présignées S3).

## D11. Drapeaux issus d'un jeu libre, avec correspondance CIO vers ISO

- **Décision** : les drapeaux proviennent de `flag-icons` (licence MIT, SVG) pour tous les pays, y compris les quatre du jeu initial. Une table de correspondance convertit les codes pays des données (codes olympiques CIO, ex. `SUI`) en codes ISO (ex. `CH`).
- **Pourquoi** : le serveur d'origine n'héberge que les quatre drapeaux du jeu de données (une trentaine d'autres pays testés renvoient 404). Une source unique garantit des drapeaux homogènes et permet de créer un joueur de n'importe quel pays.
- **Alternatives écartées** : récupérer les drapeaux d'origine (seulement quatre, formats et dimensions hétérogènes) ; générer les drapeaux (complexité sans valeur ajoutée).

## D12. Liste des pays exposée et validée à la création

- **Décision** : `GET /countries` renvoie les pays disponibles (code, nom, drapeau) ; `POST /players` refuse un code pays inconnu (400).
- **Pourquoi** : un client (le front par exemple) peut proposer une liste de choix ; on garantit qu'un joueur créé a toujours un drapeau valide.

## D13. Front minimal et cache, en bonus

- **Décision** : une page HTML/JS statique, sans framework, servie par CloudFront, réalisée uniquement une fois l'API, le déploiement et la documentation terminés. Cache : images avec cache long et clés versionnées ; réponses `GET` de l'API avec `Cache-Control` court et `ETag`.
- **Pourquoi** : rendre visibles les images et démontrer le flux complet de création avec upload, sans détourner l'effort d'un test orienté back-end.
- **Alternatives écartées** : framework front (React, Vue) : hors sujet pour un test back-end.

## D14. Identifiant généré par le serveur, via un compteur atomique

- **Décision** : `POST /players` n'accepte pas d'`id` dans le corps de la requête ; le serveur l'attribue et le renvoie dans le header `Location`. L'identifiant reste numérique, produit par un compteur atomique DynamoDB (élément dédié incrémenté par `UpdateItem` avec `ADD`), initialisé par le script de seed au plus grand id existant (102). Un `409 Conflict` est renvoyé si un joueur portant déjà le même prénom et le même nom existe.
- **Pourquoi** : sémantique REST du `POST` (le serveur crée la ressource et choisit son URI) ; cohérence avec les identifiants numériques du jeu initial ; le compteur atomique évite que deux créations simultanées obtiennent le même identifiant.
- **Alternatives écartées** : identifiant fourni par le client (relève d'un `PUT /players/{id}`, et oblige le client à connaître les identifiants libres) ; UUID (incohérent avec les identifiants numériques existants) ; « plus grand id + 1 » calculé à la lecture (collision possible en cas de créations concurrentes).

## D15. Format de `GET /stats`

- **Décision** :
  ```json
  {
    "bestCountries": { "winRatio": 1, "countries": [{ "code": "SRB", "wins": 5, "matches": 5 }] },
    "averageBmi": 23.36,
    "medianHeightCm": 185
  }
  ```
  En cas d'égalité sur le meilleur ratio, tous les pays ex aequo sont renvoyés. Sur une liste de joueurs vide : `200` avec `winRatio: null`, `countries: []`, `averageBmi: null`, `medianHeightCm: null`. L'IMC est arrondi à deux décimales ; les unités figurent dans les noms de champs.
- **Pourquoi** : choisir un seul pays parmi des ex aequo serait arbitraire. Les statistiques d'un ensemble vide sont indéfinies, mais la ressource existe : ce n'est pas une erreur.
- **Alternatives écartées** : renvoyer le premier pays trouvé (arbitraire, non déterministe) ; erreur 404 ou 422 sur liste vide (la ressource `/stats` existe toujours).

## D16. Identifiant non numérique : 400

- **Décision** : `GET /players/abc` renvoie `400` (paramètre invalide), `GET /players/999` renvoie `404`.
- **Pourquoi** : un identifiant mal formé est une erreur de requête, pas une ressource absente.

## D17. Le modèle stocke des clés d'images dès le premier ticket

- **Décision** : le domaine, le seed et la persistance manipulent des clés d'images dès le départ ; les URLs d'origine ne transitent jamais par le modèle. En local, `CDN_BASE_URL` pointe vers LocalStack.
- **Pourquoi** : éviter de changer le modèle en cours de route quand S3 arrive.

## D18. Clés de photos versionnées par hash du contenu

- **Décision** : `players/{id}/{hash}.webp`, où `hash` est un hash court du fichier final. Les drapeaux gardent une clé fixe (`flags/{iso}.svg`), car ils ne changent pas.
- **Pourquoi** : une nouvelle photo produit une nouvelle clé ; le cache CloudFront peut donc être long et immuable sans jamais servir une image périmée, et sans invalidation.
- **Alternatives écartées** : clé fixe + cache long (nouvelle photo invisible jusqu'à expiration) ; clé fixe + invalidation CloudFront (coûteuse et lente) ; numéro de version (à gérer et stocker, alors que le hash est déterministe).

## D19. Référentiel des pays dans le domaine dès le départ

- **Statut** : mode de production du référentiel précisé par D33 (table générée, committée dans le domaine).
- **Décision** : le référentiel des pays (code CIO, code ISO, nom en français) est un module du domaine disponible dès le ticket domaine ; `POST /players` refuse un pays inconnu dès sa première version. Seul l'endpoint `GET /countries` arrive plus tard. Noms en français via `i18n-iso-countries` (locale `fr`), correspondance CIO → ISO maintenue dans une table versionnée.
- **Pourquoi** : la validation du pays fait partie de la règle métier de création, pas d'une fonctionnalité optionnelle. Les noms en français suivent la langue des données d'origine et de l'audience.
- **Alternatives écartées** : valider le pays plus tard (l'API accepterait des données incohérentes entre-temps) ; noms en anglais (rien ne le justifie ici).

## D20. Modèle DynamoDB : une seule table, clés préfixées, index par type

- **Décision** : une table unique.
  - `PK = PLAYER#{id}` : un joueur.
  - `PK = NAME#{prénom}#{nom}` (normalisé) : élément d'unicité.
  - `PK = COUNTER#player` : compteur d'identifiants.
  - Un index secondaire global (GSI) `entityType` permet de lister les joueurs par une `Query`, sans jamais lire les éléments techniques ; le tri final (rank, puis points) se fait en mémoire.
- **Pourquoi** : c'est l'usage idiomatique de DynamoDB (et celui du client) ; la liste évite le Scan ; le volume rend le tri en mémoire négligeable.
- **Alternatives écartées** : tables séparées (plus simples à lire, mais multiplient l'infra pour un gain nul) ; Scan filtré (lit et facture aussi les éléments techniques, ordre non garanti).

## D21. Unicité des joueurs garantie par transaction

- **Décision** : la création écrit le joueur et l'élément `NAME#…` dans un même `TransactWriteItems`, avec une condition `attribute_not_exists` sur l'élément de nom. En cas d'échec de la condition : `409`. La comparaison des noms ignore la casse et les accents, supprime les espaces en trop.
- **Pourquoi** : « je lis, puis j'écris » laisse passer deux créations simultanées identiques. La transaction rend l'unicité atomique.
- **Alternatives écartées** : vérification préalable par lecture (condition de course) ; pas de contrôle de doublon (données incohérentes).

## D22. Seed idempotent

- **Décision** : relancer le seed réécrit les joueurs initiaux, mais ne fait monter le compteur qu'au besoin : mise à jour conditionnelle (le compteur n'est fixé au plus grand id initial que s'il est absent ou inférieur).
- **Pourquoi** : relancer le seed ne doit jamais provoquer de collision avec des joueurs créés depuis.

## D23. Images initiales normalisées et versionnées dans le dépôt

- **Décision** : les photos et drapeaux initiaux sont préparés une fois par un script (`sharp`), puis committés. Le seed les copie dans S3 sans réseau externe.
- **Pourquoi** : seed reproductible, rapide, indépendant de la disponibilité du serveur d'origine.

## D24. Upload de photo : POST présigné et traitement asynchrone

- **Décision** : `POST /players/{id}/picture` renvoie `200` avec un formulaire POST présigné (`content-length-range`, type d'image imposé, expiration courte) vers `uploads/{id}/…`. Un événement S3 déclenche une Lambda qui valide l'image, la convertit en WebP, l'écrit sous sa clé hashée, puis met à jour la clé photo du joueur. Les fichiers bruts de `uploads/` expirent au bout d'un jour (règle de cycle de vie).
- **Pourquoi** : un PUT présigné ne permet pas de limiter la taille. Le traitement asynchrone garantit que le joueur ne pointe jamais vers une image invalide ou non normalisée. `200` car aucune ressource n'est créée à cette URI.
- **Alternatives écartées** : PUT présigné (pas de limite de taille) ; mise à jour de la clé dès la génération de l'URL (le joueur pointerait vers un fichier peut-être jamais envoyé ou invalide).
- **Repli** : si le temps manque, cette fonctionnalité passe en « ce que je ferais ensuite ».

## D25. Tests unitaires et tests d'intégration séparés

- **Décision** : `npm test` exécute les tests unitaires (dépôt en mémoire, aucun réseau) ; `npm run test:integration` exécute les tests de contrat et de concurrence sur DynamoDB Local. La CI lance DynamoDB Local en conteneur de service.
- **Pourquoi** : des tests unitaires rapides et sans dépendance ; les garanties propres à DynamoDB (transactions, compteur) testées sur une vraie implémentation.

## D26. OpenAPI dès les premières routes

- **Décision** : les routes sont déclarées avec `@hono/zod-openapi` ; la spécification OpenAPI est générée à partir des schémas Zod et servie avec Swagger UI.
- **Pourquoi** : la documentation reste toujours synchrone avec le code ; la faire après coup obligerait à réécrire les routes.

## D27. Pagination simple

- **Décision** : `limit` et un curseur opaque (position encodée), sur la liste triée en mémoire.
- **Pourquoi** : suffisant et honnête pour ce volume ; documenté comme limite connue (au-delà de quelques milliers de joueurs, on passerait à un index trié).

## D28. Protection contre les abus et maîtrise des coûts

- **Statut** : remplacée par D32 (limite de débit relevée, concurrence réservée ajustée, budget en USD).
- **Décision** : limite de débit sur le stage API Gateway (10 requêtes/s, pics à 20), plafond de concurrence réservée sur la Lambda, alerte AWS Budgets à 5 €.
- **Pourquoi** : les routes d'écriture sont publiques ; ces trois verrous plafonnent l'usage et le coût sans complexité.
- **Limite connue** : la limitation d'API Gateway HTTP API est globale, pas par adresse IP. Une limite par IP nécessite AWS WAF (payant) devant CloudFront : à proposer avec l'authentification des routes d'écriture.

## D29. Branche `main` protégée

- **Décision** : ruleset GitHub sur `main` : passage obligatoire par une pull request, interdiction du force push et de la suppression, et vérification CI obligatoire dès qu'elle existe.
- **Pourquoi** : le code fusionné est toujours passé par la CI ; chaque modification est traçable jusqu'à son ticket.

## D30. Lambdas en arm64, `sharp` empaqueté pour Linux

- **Décision** : toutes les Lambdas tournent sur arm64 (Graviton). Le bundle esbuild garde `sharp` en dépendance externe, installé pour la cible `linux-arm64` au moment du packaging.
- **Pourquoi** : arm64 coûte environ 20 % de moins à performance égale. `sharp` repose sur un binaire natif : celui installé sur le poste de développement ne fonctionne pas dans la Lambda.
- **Alternatives écartées** : x86_64 (plus cher, sans bénéfice ici) ; couche Lambda `sharp` tierce (dépendance externe non maîtrisée).

## D31. Stratégie de test du traitement des photos

- **Décision** : la fonction de traitement (validation, conversion, hash, mise à jour du joueur) est testée unitairement ; le POST présigné et l'upload sont testés en local sur LocalStack ; le déclenchement par l'événement S3 est vérifié sur AWS.
- **Pourquoi** : émuler l'invocation d'une Lambda par un événement S3 dans LocalStack demande Docker dans Docker, pour un gain faible ; la logique est couverte par les tests unitaires, et le câblage par la vérification sur l'environnement déployé.
- **Alternatives écartées** : test de bout en bout complet sur LocalStack (lourd et fragile).

## D32. Limite de débit relevée et concurrence réservée modeste (remplace D28)

- **Décision** :
  - limite de débit sur le stage API Gateway : 50 requêtes/s, pics à 100 ;
  - concurrence réservée : 10 pour la Lambda de l'API, 2 pour la Lambda de traitement des photos ;
  - alerte AWS Budgets à 5 USD par mois (AWS Budgets compte en dollars ; budget `tenisu-monthly-5usd` créé dans la console, hors Terraform).
- **Pourquoi** : les routes publiques sont plafonnées à deux niveaux. La limite de débit borne le nombre de requêtes ; la concurrence réservée borne le nombre d'exécutions simultanées, donc le coût Lambda, même si la limite de débit était mal réglée. Dix environnements d'exécution traitent largement 50 requêtes/s pour des réponses de quelques dizaines de millisecondes. Le quota du compte (400 exécutions simultanées en `eu-north-1`) permet ces réservations tout en laissant les 100 exécutions non réservées exigées par AWS.
- **Alternatives écartées** : valeurs de D28 (10 requêtes/s, trop basses pour une démonstration ou un test de charge léger) ; aucune concurrence réservée (un seul verrou, celui d'API Gateway).
- **Limite connue** : la limitation d'API Gateway HTTP API est globale, pas par adresse IP (voir « Hors périmètre »).

## D33. Référentiel des pays généré une fois et committé

- **Décision** : `scripts/generate-countries.ts` produit `src/domain/countries.generated.ts`, une simple table de données committée. Le script part de la correspondance CIO → ISO (`scripts/ioc-to-iso.ts`) et échoue si un pays n'a pas de nom français (`i18n-iso-countries`) ou pas de drapeau (`flag-icons`). Ces deux bibliothèques restent des dépendances de développement. La liste des 206 codes CIO a été recoupée avec la liste publique des comités nationaux olympiques.
- **Pourquoi** : le domaine reste sans aucune dépendance, comme l'impose l'architecture, et ne charge pas de bibliothèque dans la Lambda. La table se relit dans une PR, et tout code accepté par l'API a forcément un nom et un drapeau.
- **Alternatives écartées** : importer `i18n-iso-countries` dans le domaine (contraire à la règle d'architecture) ; passer par un port et un adaptateur (de l'indirection pour des données statiques).

## D34. Valeurs des joueurs validées aux entrées du système

- **Décision** : `Player` est un type, sans contrôle des valeurs à l'exécution. Elles sont validées à chaque entrée du système : les schémas Zod de `POST /players` (`http/`) et la conversion du JSON initial utilisée par le seed. Bornes : `weightGrams`, `heightCm`, `age` et `rank` entiers strictement positifs, `points` entier positif ou nul, `lastResults` composé de 0 et de 1. Une valeur hors bornes donne `400` ; poster une taille à 0 ne crée donc aucun joueur et ne peut pas produire un IMC infini. Le seed rejette une valeur invalide au lieu de la convertir.
- **Pourquoi** : une seule responsabilité par couche. Le domaine calcule sur des données déjà garanties et reste composé de fonctions simples, sans validation dupliquée.
- **Alternatives écartées** : contrôler les valeurs dans le domaine en plus de Zod (double validation pour deux seules entrées) ; ignorer les valeurs invalides dans `computeStatistics` (masquerait une donnée corrompue au lieu de l'empêcher d'entrer).
- **Limite connue** : la garantie repose sur les entrées, pas sur le type. Toute nouvelle entrée de données devra appliquer les mêmes règles, et une valeur écrite directement en base contournerait la validation.

## D35. Conséquences assumées du modèle DynamoDB

- **Décision** : l'identifiant est réservé par le compteur avant la transaction de création. Un `409` consomme donc un identifiant : la suite des id peut avoir des trous. La liste des joueurs passe par le GSI, dont les lectures sont à cohérence éventuelle : un joueur tout juste créé peut manquer pendant un court instant dans `GET /players`, alors que `GET /players/{id}` lit la table avec une lecture fortement cohérente. Une annulation pour `TransactionConflict` sur l'élément de nom est traitée comme un doublon (`409`).
- **Pourquoi** : une transaction DynamoDB ne renvoie pas la valeur d'un compteur incrémenté, il faut donc le lire avant. Les id n'ont aucune valeur métier : leur seule exigence est l'unicité. Un GSI ne propose pas de lecture fortement cohérente, et le décalage est sans conséquence ici. Un `TransactionConflict` sur le nom signifie qu'une création simultanée du même nom est en cours.
- **Alternatives écartées** : vérifier le nom avant de réserver l'id (une lecture de plus à chaque création, pour éviter des trous sans importance) ; Scan fortement cohérent de la table pour la liste (exclu par D20).

---

## Choix sur les données

- **Tri « du meilleur au moins bon »** : `rank` croissant, puis `points` décroissants en cas d'égalité, puis `id` croissant pour que l'ordre ne dépende jamais de la base (DynamoDB ne garantit pas d'ordre, et la pagination a besoin d'un ordre stable). Les circuits masculin et féminin sont mélangés et leurs points ne sont pas comparables ; les données sont par ailleurs incohérentes (Nadal n°1 avec 1 982 points, Djokovic n°2 avec 2 542). Le classement fourni fait donc foi.
- **Unités** : `weight` est en grammes, `height` en centimètres ; conversion en kg et en m pour l'IMC.
- **Ratio de victoires par pays** : total des victoires du pays divisé par le total de ses matchs (champ `last`, 1 = victoire), et non moyenne des ratios des joueurs.
- **Médiane de la taille** : moyenne des deux valeurs centrales quand le nombre de joueurs est pair.
- **Images hétérogènes** : photos de 379×603 à 1632×2448, formats PNG et WebP ; elles sont normalisées (taille, WebP) à l'import.
- **Valeurs attendues sur le jeu initial** : pays = Serbie (5/5), IMC moyen ≈ 23,36, médiane = 185 cm.

## Hors périmètre (et ce que je ferais ensuite)

- **Authentification des routes d'écriture** : non demandée ; je proposerais un authorizer JWT sur API Gateway (Cognito ou fournisseur d'identité du client).
- **Limite de débit par adresse IP** : AWS WAF devant CloudFront (voir D32).
- **Index trié pour la pagination** : si le volume dépassait quelques milliers de joueurs (voir D27).
