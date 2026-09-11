#!/bin/sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Fichier .env absent — copie depuis .env.example"
  cp .env.example .env
  echo "Éditez .env (JWT_SECRET, POSTGRES_PASSWORD, DUCKDNS_TOKEN, ACME_EMAIL) puis relancez ce script."
  exit 1
fi

echo "Build et démarrage production (HTTPS)..."
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
# shellcheck disable=SC1091
set -a
. ./.env
set +a
if [ -n "${DUCKDNS_TOKEN:-}" ]; then
  docker compose $COMPOSE_FILES --profile duckdns up -d --build
else
  echo "DUCKDNS_TOKEN vide : mettez l IP du serveur sur https://www.duckdns.org/"
  docker compose $COMPOSE_FILES up -d --build
fi

# shellcheck disable=SC1091
. ./.env 2>/dev/null || true
DOMAIN="${APP_DOMAIN:-ltdd-delice.duckdns.org}"
echo ""
echo "Terminé. Site attendu : https://${DOMAIN}"
echo "Logs Caddy : docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy"
