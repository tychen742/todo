#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_FILE="$ROOT_DIR/supabase/schema.sql"
ENV_FILE="$ROOT_DIR/.env"

read_env_value() {
  local key="$1"

  if [[ -f "$ENV_FILE" ]]; then
    grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2-
  fi
}

strip_wrapping_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  DB_URL="$(read_env_value SUPABASE_DB_URL || true)"
fi

if [[ -z "$DB_URL" ]]; then
  DB_URL="$(read_env_value DATABASE_URL || true)"
fi

DB_URL="$(strip_wrapping_quotes "$DB_URL")"

DB_HOST="$(strip_wrapping_quotes "${SUPABASE_DB_HOST:-$(read_env_value SUPABASE_DB_HOST || true)}")"
DB_PORT="$(strip_wrapping_quotes "${SUPABASE_DB_PORT:-$(read_env_value SUPABASE_DB_PORT || true)}")"
DB_NAME="$(strip_wrapping_quotes "${SUPABASE_DB_NAME:-$(read_env_value SUPABASE_DB_NAME || true)}")"
DB_USER="$(strip_wrapping_quotes "${SUPABASE_DB_USER:-$(read_env_value SUPABASE_DB_USER || true)}")"
DB_PASSWORD="$(strip_wrapping_quotes "${SUPABASE_DB_PASSWORD:-$(read_env_value SUPABASE_DB_PASSWORD || true)}")"

if [[ -n "$DB_HOST" && -n "$DB_USER" && -n "$DB_PASSWORD" ]]; then
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-postgres}"
  DB_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

if [[ -z "$DB_URL" ]]; then
  cat <<'MSG' >&2
Missing SUPABASE_DB_URL.

Add either this to your local .env file:

SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres

Or these fields, which avoid URL-encoding password characters by hand:

SUPABASE_DB_HOST=aws-1-us-east-1.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.<project-ref>
SUPABASE_DB_PASSWORD=<database-password>

Get the values from Supabase Dashboard -> Connect -> Shared Pooler.
Do not commit .env.
MSG
  exit 1
fi

PSQL_BIN="${PSQL_BIN:-}"

if [[ -z "$PSQL_BIN" ]] && command -v psql >/dev/null 2>&1; then
  PSQL_BIN="$(command -v psql)"
fi

if [[ -z "$PSQL_BIN" && -x /opt/homebrew/opt/libpq/bin/psql ]]; then
  PSQL_BIN="/opt/homebrew/opt/libpq/bin/psql"
fi

if [[ -z "$PSQL_BIN" && -x /usr/local/opt/libpq/bin/psql ]]; then
  PSQL_BIN="/usr/local/opt/libpq/bin/psql"
fi

if [[ -z "$PSQL_BIN" ]]; then
  cat <<'MSG' >&2
Missing psql.

Install PostgreSQL client tools, then run:

npm run db:apply
MSG
  exit 1
fi

if [[ -n "${DB_PASSWORD:-}" ]]; then
  PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" "$DB_URL" --set ON_ERROR_STOP=on --file "$SCHEMA_FILE"
else
  "$PSQL_BIN" "$DB_URL" --set ON_ERROR_STOP=on --file "$SCHEMA_FILE"
fi
