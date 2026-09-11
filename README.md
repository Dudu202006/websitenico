# Le Temps d'un Délice

Plateforme de gestion globale pour une boulangerie multi-sites.

**Domaine gratuit prévu :** [https://ltdd-delice.duckdns.org](https://ltdd-delice.duckdns.org) (à activer sur un VPS après clone GitHub — voir ci-dessous).

## GitHub : quel dossier pousser ?

Mettez sur GitHub **tout le dossier racine** du projet (`le-temps-d-un-delice`), pas seulement `frontend` ou `backend`.

Guide pas à pas : **[docs/GITHUB-ET-MISE-EN-LIGNE.md](docs/GITHUB-ET-MISE-EN-LIGNE.md)**

```powershell
cd C:\Users\duche\Projects\le-temps-d-un-delice
git add .
git commit -m "Le Temps d'un Délice"
git branch -M main
git remote add origin https://github.com/VOTRE_COMPTE/le-temps-d-un-delice.git
git push -u origin main
```

Ne pas committer : `.env`, `node_modules/`, `uploads/` (voir `.gitignore`).

## Mise en ligne (domaine gratuit DuckDNS)

1. Réserver **`ltdd-delice`** sur [duckdns.org](https://www.duckdns.org/) → `ltdd-delice.duckdns.org`
2. Sur un **VPS** (Docker, ports 80/443) : `git clone` → `cp .env.example .env` → remplir secrets + `ACME_EMAIL`
3. `./scripts/deploy-production.sh` (Linux) ou `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`

Détails : **[docs/GITHUB-ET-MISE-EN-LIGNE.md](docs/GITHUB-ET-MISE-EN-LIGNE.md)**

## Démarrage local (Docker)

```bash
docker compose up -d --build
```

- Application : http://localhost:8080
- API : http://localhost:8080/api

Copiez `.env.example` → `.env` pour personnaliser (optionnel en local).

## Fonctionnalités

- **Magasins** : inventaire local, commandes vers le centre de production
- **Centre de production** : réception des commandes, stock produits finis et marchandises
- **Administrateur** : vue globale, magasins, alertes de stock

## Stack

- Frontend : React + Vite + TypeScript
- Backend : Node.js + Express + Prisma + PostgreSQL
- Prod : Docker Compose + Caddy (HTTPS)

## Comptes de démonstration

Mot de passe : `demo123`

| Email | Rôle |
|---|---|
| admin@delice.fr | Administrateur |
| benahin@delice.fr | Magasin Ben ahin |
| thiange@delice.fr | Magasin Thiange |
| production@delice.fr | Centre de production |

## Structure du dépôt

```
backend/                  API + Prisma
frontend/                 Interface React
deploy/                   Caddy (HTTPS)
docs/                     Guides GitHub, domaine
scripts/                  deploy-production.sh / .ps1
docker-compose.yml        Dev + local
docker-compose.prod.yml   Production DuckDNS
.env.example              Modèle de configuration
.github/workflows/ci.yml   Tests build à chaque push
```

## CI

À chaque push sur `main` : build frontend + validation Prisma.

## Autres docs

- [docs/GITHUB-ET-MISE-EN-LIGNE.md](docs/GITHUB-ET-MISE-EN-LIGNE.md) — GitHub + DuckDNS + VPS
- [docs/DOMAINE-LTDD.md](docs/DOMAINE-LTDD.md) — domaine payant ou alternatives
