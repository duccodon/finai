#!/bin/sh
set -e

# fallback defaults (matches your docker-compose)
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DATABASE_USER:-${POSTGRES_USER:-user}}
DB_PASS=${DATABASE_PASSWORD:-${POSTGRES_PASSWORD:-user}}
DB_NAME=${DATABASE_NAME:-${POSTGRES_DB:-finai_db}}

# If DATABASE_URL already provided (via services/auth/.env), use it; otherwise build one
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo "Using DATABASE_URL=${DATABASE_URL}"

# wait for DB to be ready
echo "Waiting for DB ${DB_HOST}:${DB_PORT} ..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  printf '.'
  sleep 1
done
echo "\nDB ready."

# In dev: try to create/apply migration (will create migrations folder if bind-mounted)
npx prisma migrate dev --name "auto_$(date +%s)" || true

# generate client and start app
npx prisma generate
exec npm run start:dev