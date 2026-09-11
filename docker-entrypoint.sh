#!/bin/sh
set -e

echo "Initialisation de la base de données..."
npx prisma db push --accept-data-loss

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  echo "Chargement des données de démonstration..."
  node prisma/seed.js
fi

echo "Démarrage de l'API..."
exec node src/index.js
