# Ouvrir le site sur ltdd.com (ou un autre domaine)

Ce guide couvre **l’achat du nom**, le **DNS**, la **configuration du projet** et le **déploiement HTTPS**.

## 1. Nom de domaine

1. Achetez **ltdd.com** (ou un autre) chez un registrar : Gandi, OVH, Cloudflare, Namecheap, etc.
2. Dans la zone DNS du domaine, créez :

| Type | Nom | Valeur |
|------|-----|--------|
| **A** | `@` | IP publique de votre serveur (VPS) |
| **A** | `www` | même IP (ou CNAME `www` → `ltdd.com`) |

Propagation DNS : souvent 5 min à 48 h. Vérifiez avec :

```bash
nslookup ltdd.com
```

## 2. Serveur (VPS)

Il vous faut une machine accessible sur Internet avec **Docker** et **Docker Compose**, ports **80** et **443** ouverts (pare-feu + security group cloud).

Exemples d’hébergeurs : OVH VPS, Scaleway, Hetzner, DigitalOcean, etc.

Sur le serveur :

```bash
git clone https://github.com/VOTRE_COMPTE/le-temps-d-un-delice.git
cd le-temps-d-un-delice
copy .env.example .env   # Linux : cp .env.example .env
```

## 3. Fichier `.env` à la racine (production)

Adaptez au minimum :

```env
APP_DOMAIN=ltdd.com
ACME_EMAIL=votre@email.com

POSTGRES_PASSWORD=un-mot-de-passe-long-et-unique
JWT_SECRET=une-chaine-secrete-longue-et-aleatoire
SEED_DATABASE=false

CORS_ORIGIN=https://ltdd.com,https://www.ltdd.com
```

- **APP_DOMAIN** : domaine sans `https://` (utilisé par Caddy pour le certificat SSL).
- **ACME_EMAIL** : email pour Let’s Encrypt (obligatoire pour HTTPS auto).
- **CORS_ORIGIN** : doit lister **exactement** les URLs que les navigateurs utilisent (en prod : en `https://`).

Si vous utilisez **un autre domaine** (ex. `letempsdundelice.fr`), remplacez `ltdd.com` partout dans `.env` et, si besoin, `server_name` dans `frontend/nginx.conf`.

## 4. Lancer en production (HTTPS)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- **Caddy** écoute sur 80/443, obtient un certificat SSL et envoie le trafic vers le conteneur **frontend** (nginx + React).
- L’API reste sur `/api` (proxy nginx → backend), comme en local sur le port 8080.

Site : **https://ltdd.com** (pour **www** aussi, ajoutez `www.{$APP_DOMAIN}` dans `deploy/Caddyfile` et un enregistrement DNS `www`)

## 5. Développement local avec le nom ltdd.com (optionnel)

Sans VPS, vous pouvez tester le nom en local :

1. Éditez le fichier hosts :
   - Windows : `C:\Windows\System32\drivers\etc\hosts`
   - Ajoutez : `127.0.0.1 ltdd.com www.ltdd.com`
2. Lancez Docker comme d’habitude : `docker compose up -d --build`
3. Ouvrez **http://ltdd.com:8080** (le port **8080** reste en mode dev ; pas de Caddy local par défaut).

Pour simuler la prod en local (port 80 + HTTPS), utilisez la stack prod seulement si les ports 80/443 sont libres sur votre machine.

## 6. Ce qui a été configuré dans le code

| Fichier | Rôle |
|---------|------|
| `frontend/nginx.conf` | Accepte les requêtes pour `ltdd.com`, `www`, `localhost` |
| `docker-compose.yml` | `CORS_ORIGIN` par défaut inclut ltdd.com (surchargeable via `.env`) |
| `docker-compose.prod.yml` | Caddy + HTTPS, PostgreSQL non exposé sur Internet |
| `deploy/Caddyfile` | Reverse proxy + certificats pour `APP_DOMAIN` |

Le frontend appelle l’API en **relatif** (`/api`), donc **aucun changement de code** n’est nécessaire quand vous changez de domaine.

## 7. Checklist avant mise en ligne

- [ ] DNS A `@` et `www` pointent vers le serveur
- [ ] `.env` : mots de passe forts, `SEED_DATABASE=false` en prod
- [ ] `CORS_ORIGIN` = URLs HTTPS du site
- [ ] Ports 80 et 443 ouverts
- [ ] `docker compose ... prod` démarré sans erreur (`docker compose logs caddy`)

## 8. Redirection www → domaine nu (optionnel)

Par défaut, Caddy sert **ltdd.com** et **www.ltdd.com** avec le même contenu. Pour forcer une seule adresse, modifiez `deploy/Caddyfile` (ex. redirection permanente de `www` vers `@`).

---

## 9. Domaine gratuit — options réalistes

Un **.com gratuit fiable** (type « ltdd.com sans payer ») n’existe pratiquement plus : les anciens services gratuits (.tk, .ml, etc.) posent souvent des problèmes (spam, blocages, perte du nom). Pour une démo ou un petit projet, voici ce qui **marche vraiment** avec cette application.

### Option A — Sous-domaine gratuit DuckDNS (recommandé « 0 € » + votre serveur)

[DuckDNS](https://www.duckdns.org/) donne un nom du type **`ltdd.duckdns.org`**, gratuit, avec mise à jour de l’IP (fixe ou box internet).

1. Créez un compte, choisissez un sous-domaine (ex. `ltdd` → `ltdd.duckdns.org`).
2. Pointez-le vers l’**IP publique** de votre machine (VPS ou PC avec ports 80/443 redirigés sur la box).
3. Dans `.env` :

```env
APP_DOMAIN=ltdd.duckdns.org
ACME_EMAIL=votre@email.com
CORS_ORIGIN=https://ltdd.duckdns.org
SEED_DATABASE=false
```

4. Même commande prod : `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`

**Note :** utilisez une seule URL (sans `www`) dans `CORS_ORIGIN` et `APP_DOMAIN`. Le `Caddyfile` du projet ne demande qu’un nom, adapté à DuckDNS.

Caddy + Let’s Encrypt fonctionnent avec `*.duckdns.org` tant que le port **80** est reachable depuis Internet (validation HTTP).

### Option B — URL gratuite de l’hébergeur (sans acheter de nom)

Si vous déployez sur **Railway**, **Render**, **Fly.io**, etc., vous obtenez souvent une URL du type :

- `le-temps-delice.onrender.com`
- `xxx.up.railway.app`

C’est **gratuit** (selon quotas), **HTTPS inclus**, mais ce n’est **pas** `ltdd.com`. Il faut adapter le déploiement (souvent pas le même `docker-compose` qu’un VPS) et mettre dans `.env` :

```env
CORS_ORIGIN=https://votre-app.onrender.com
```

Le nom affiché dans la barre d’adresse sera celui du fournisseur, pas une marque personnalisée.

### Option C — Très bon marché (≈ 1–10 € / an)

Ce n’est pas gratuit, mais c’est la voie la plus propre pour un vrai nom :

- **Cloudflare Registrar** (prix coûtant sur certaines extensions)
- Promotions **.fr** / **.be** chez OVH, Gandi, etc.

Pour une boulangerie visible par des clients, un petit nom de domaine payant reste le meilleur rapport qualité / confiance.

### Option D — Ce qui ne convient pas bien à ce projet

| Idée | Pourquoi |
|------|----------|
| **GitHub Pages** | Héberge seulement du HTML statique — pas PostgreSQL ni l’API Node. |
| **Tunnel éphémère** (ngrok gratuit, trycloudflare.com) | URL qui change ou temporaire — démo uniquement. |
| **Freenom .tk / .ml** | Peu fiable, souvent filtré par les navigateurs ou messageries. |
| **Fichier hosts** (`ltdd.com` → 127.0.0.1) | Uniquement **sur votre PC**, invisible pour le reste du monde. |

### Résumé

| Besoin | Solution |
|--------|----------|
| Gratuit + Docker sur **votre** serveur / box | **DuckDNS** (`xxx.duckdns.org`) + stack prod Caddy |
| Gratuit + pas de VPS | Hébergeur cloud avec **sous-domaine fourni** (Render, Railway…) |
| Nom pro type **ltdd.com** | Domaine payant (~ quelques €/an) + section 1–4 de ce guide |
