# GitHub + domaine gratuit + mise en ligne

Domaine prévu pour ce projet : **https://ltdd-delice.duckdns.org** (gratuit via [DuckDNS](https://www.duckdns.org/)).

> **GitHub ne fait pas tourner le site** : il héberge le **code**. Pour que l’URL fonctionne, il faut un **serveur** (VPS gratuit ou payant) avec Docker.

---

## 1. Quel dossier mettre sur GitHub ?

Poussez **toute la racine du projet** `le-temps-d-un-delice/` comme dépôt GitHub — **pas** un sous-dossier seul.

```
le-temps-d-un-delice/     ← racine du dépôt GitHub
├── backend/              ← API + Prisma (sans node_modules, sans .env)
├── frontend/             ← React (sans node_modules, sans dist)
├── deploy/               ← Caddy, config domaine
├── docs/
├── .github/workflows/    ← CI
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example          ← modèle (à copier en .env sur le serveur)
├── .gitignore
├── README.md
└── package.json
```

### Ne jamais envoyer sur GitHub

| Exclu | Pourquoi |
|-------|----------|
| `.env` | secrets (JWT, mots de passe) |
| `backend/.env` | idem |
| `node_modules/` | trop lourd, recréé avec `npm ci` |
| `backend/uploads/` | fichiers utilisateurs |
| `dist/` | build recréé par Docker |

Tout cela est déjà listé dans **`.gitignore`**.

### Commandes GitHub (sur votre PC)

```powershell
cd C:\Users\duche\Projects\le-temps-d-un-delice
git add .
git commit -m "Le Temps d'un Délice — prêt déploiement DuckDNS"
git branch -M main
git remote add origin https://github.com/VOTRE_COMPTE/le-temps-d-un-delice.git
git push -u origin main
```

Créez d’abord un dépôt **vide** sur GitHub (sans README).

---

## 2. Réserver le domaine DuckDNS (5 minutes)

1. Allez sur **https://www.duckdns.org/** → connexion (Google, GitHub, etc.).
2. Créez le sous-domaine **`ltdd-delice`** → cela donne **`ltdd-delice.duckdns.org`**.
3. Si le nom est déjà pris, choisissez-en un autre (ex. `ltdd-delice-votre-nom`) et modifiez dans `.env` sur le serveur :
   - `APP_DOMAIN`
   - `DUCKDNS_SUBDOMAIN`
   - `CORS_ORIGIN`
4. Mettez l’**IP publique** de votre serveur dans DuckDNS (ou utilisez le token DuckDNS dans `.env` — voir ci-dessous).

---

## 3. Serveur (VPS) — gratuit possible

Exemples avec offre gratuite ou essai :

- **Oracle Cloud** (Always Free VPS)
- **Google Cloud / AWS** (crédits essai)
- Petit VPS (~3–5 €/mois) : Hetzner, Scaleway, OVH

Sur le VPS (Linux) :

- Installer **Docker** + **Docker Compose**
- Ouvrir les ports **80** et **443** (pare-feu + panel cloud)

---

## 4. Déployer le site (copier-coller)

Sur le **serveur** :

```bash
git clone https://github.com/VOTRE_COMPTE/le-temps-d-un-delice.git
cd le-temps-d-un-delice
cp .env.example .env
nano .env   # ou vi .env
```

Dans **`.env`**, renseignez au minimum :

```env
APP_DOMAIN=ltdd-delice.duckdns.org
ACME_EMAIL=votre@email.com
DUCKDNS_SUBDOMAIN=ltdd-delice
DUCKDNS_TOKEN=votre-token-duckdns

JWT_SECRET=changez-moi-long-secret-aleatoire
POSTGRES_PASSWORD=changez-moi-mot-de-passe-fort
SEED_DATABASE=false
CORS_ORIGIN=https://ltdd-delice.duckdns.org
```

Puis :

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

Ou à la main :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Attendez 1–2 minutes (certificat HTTPS). Ouvrez :

**https://ltdd-delice.duckdns.org**

Comptes démo (si `SEED_DATABASE=false`, ils existent seulement si vous avez seed une fois ; pour la première install prod vous pouvez mettre `SEED_DATABASE=true` une fois puis repasser à `false`) :

- Mot de passe : `demo123`
- `admin@delice.fr`, etc.

---

## 5. Développement local (inchangé)

Sur votre PC :

```powershell
docker compose up -d --build
```

→ http://localhost:8080

Le domaine DuckDNS n’est pas nécessaire en local.

---

## 6. Dépannage rapide

| Problème | Piste |
|----------|--------|
| Site inaccessible | IP DuckDNS = IP du VPS ? Ports 80/443 ouverts ? |
| Erreur CORS | `CORS_ORIGIN` = exactement `https://ltdd-delice.duckdns.org` |
| HTTPS ne part pas | `docker compose logs caddy` — email ACME valide, port 80 reachable |
| API en échec | `docker compose logs backend` |

---

## 7. Résumé

| Étape | Où |
|-------|-----|
| Code source | **GitHub** = dossier racine `le-temps-d-un-delice` |
| Nom gratuit | **DuckDNS** = `ltdd-delice.duckdns.org` |
| Site en ligne | **VPS** + `docker compose ... prod` |
