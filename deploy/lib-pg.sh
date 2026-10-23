#!/bin/bash
# Общие функции для backup.sh и restore-check.sh (подключается через source): параметры БД из menu-api/.env
# и запуск клиентов Postgres либо внутри Docker-контейнера menu-postgres, либо с хоста.
#   MENU_PG_MODE=docker|host|auto (по умолчанию auto: контейнер запущен — docker, иначе клиент на хосте)

REPO_DIR="${REPO_DIR:-/home/ubuntu/menu}"
API_DIR="${API_DIR:-$REPO_DIR/menu-api}"
ENV_FILE="${ENV_FILE:-$API_DIR/.env}"
PG_CONTAINER="${PG_CONTAINER:-menu-postgres}"

# значение из .env без source (пароли со спецсимволами); переменная окружения с тем же именем главнее
env_get() {
  local key="$1" val="${!1:-}"
  if [ -z "$val" ] && [ -f "$ENV_FILE" ]; then
    val=$(grep -E "^$key=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '\r' || true)
    val="${val#\"}"; val="${val%\"}"; val="${val#\'}"; val="${val%\'}"
  fi
  printf '%s' "$val"
}

PG_HOST="$(env_get PG_HOST)"; PG_HOST="${PG_HOST:-localhost}"
PG_PORT="$(env_get PG_PORT)"; PG_PORT="${PG_PORT:-5432}"
PG_USER="$(env_get PG_USER)"; PG_USER="${PG_USER:-postgres}"
PG_DATABASE="$(env_get PG_DATABASE)"; PG_DATABASE="${PG_DATABASE:-menu_db}"
export PGPASSWORD="$(env_get PG_PASSWORD)"; PGPASSWORD="${PGPASSWORD:-postgres}"

DOCKER=""
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then DOCKER="docker"
  elif sudo -n docker info >/dev/null 2>&1; then DOCKER="sudo -n docker"; fi
fi

PG_MODE="${MENU_PG_MODE:-auto}"
if [ "$PG_MODE" = auto ]; then
  if [ -n "$DOCKER" ] && $DOCKER ps --format '{{.Names}}' 2>/dev/null | grep -qx "$PG_CONTAINER"; then PG_MODE=docker; else PG_MODE=host; fi
fi

# pg <команда Postgres> [аргументы] — выполнить клиент (pg_dump, pg_restore, psql, createdb, dropdb) в нужном окружении.
# Пароль передаётся через окружение (PGPASSWORD), в списке процессов его нет. stdin/stdout проходят насквозь.
pg() {
  local cmd="$1"; shift
  if [ "$PG_MODE" = docker ]; then
    $DOCKER exec -i -e PGPASSWORD "$PG_CONTAINER" "$cmd" -U "$PG_USER" "$@"
  else
    "$cmd" -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$@"
  fi
}

# Оповещение в Telegram (если заданы ALERT_TELEGRAM_BOT_TOKEN / ALERT_TELEGRAM_CHAT_ID в .env); сбой отправки не критичен
tg_alert() {
  local token chat; token="$(env_get ALERT_TELEGRAM_BOT_TOKEN)"; chat="$(env_get ALERT_TELEGRAM_CHAT_ID)"
  [ -n "$token" ] && [ -n "$chat" ] || return 0
  curl -fsS -m 10 -o /dev/null "https://api.telegram.org/bot$token/sendMessage" \
    --data-urlencode "chat_id=$chat" --data-urlencode "text=Фуджи меню ($(hostname)): $1" >/dev/null 2>&1 || true
}
