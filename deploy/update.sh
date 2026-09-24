#!/bin/bash
# Обновление прода QR-меню на уже настроенном сервере (запускается из GitHub Actions или вручную).
#   BRANCH=main bash deploy/update.sh
# Секреты берутся из переменных окружения и дописываются в menu-api/.env (в репозиторий не попадают):
#   OPENROUTER_API_KEY, IIKO_API_LOGIN, ADMIN_PASSWORD, MANAGER_PASSWORD, WAITER_PASSWORD
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/menu}"
BRANCH="${BRANCH:-main}"
API_DIR="$REPO_DIR/menu-api"
ENV_FILE="$API_DIR/.env"

echo "=== 1. Код: $BRANCH ==="
cd "$REPO_DIR"
# Ручные правки на сервере не теряем: сохраняем патч и stash, затем ставим код из GitHub
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  BACKUP_DIR="$HOME/menu-backups"; mkdir -p "$BACKUP_DIR"
  STAMP=$(date +%Y%m%d-%H%M%S)
  git diff > "$BACKUP_DIR/local-changes-$STAMP.patch"
  git stash push -m "prod-local-changes-$STAMP" >/dev/null
  echo "Локальные правки сервера сохранены: $BACKUP_DIR/local-changes-$STAMP.patch и git stash"
  git diff --stat "stash@{0}^" "stash@{0}" | tail -20
fi
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
git log -1 --oneline

echo "=== 2. Зависимости ==="
cd "$API_DIR"
npm ci --omit=dev --no-audit --no-fund

echo "=== 3. .env ==="
[ -f "$ENV_FILE" ] || cp .env.example "$ENV_FILE"

get_env() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true; }
set_env() {
  local key="$1" value="$2"
  if grep -qE "^$key=" "$ENV_FILE"; then
    local tmp; tmp=$(mktemp)
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k {print k"="v; next} {print}' "$ENV_FILE" > "$tmp"
    cat "$tmp" > "$ENV_FILE"; rm -f "$tmp"
  else
    echo "$key=$value" >> "$ENV_FILE"
  fi
}
# задать, только если значения ещё нет (или оно — заглушка из примера)
ensure_env() {
  local cur; cur=$(get_env "$1")
  if [ -z "$cur" ] || [ "$cur" = "change-me-long-random-string" ] || [ "$cur" = "your-iiko-api-login" ]; then set_env "$1" "$2"; fi
}
rand() { openssl rand -hex "${1:-16}"; }

# Секреты из GitHub Secrets перезаписывают значения в .env
[ -n "${OPENROUTER_API_KEY:-}" ] && set_env OPENROUTER_API_KEY "$OPENROUTER_API_KEY"
[ -n "${IIKO_API_LOGIN:-}" ] && set_env IIKO_API_LOGIN "$IIKO_API_LOGIN"

ensure_env AUTH_SECRET "$(rand 32)"
ensure_env QR_RESTAURANT_SLUG "novo-sadovaya"
ensure_env PUBLIC_MENU_URL "https://menu.franchise-fuji.ru"
ensure_env LEGACY_API_URL "https://apiv2.infra-fuji.ru"
ensure_env OPENROUTER_MODEL "openai/gpt-4o-mini"
ensure_env GUEST_AUTH_REQUIRED "true"
# Пароли персонала — используются только при первом создании пользователей.
# Если секреты не заданы — генерируются случайные и хранятся только в .env на сервере.
ensure_env ADMIN_PASSWORD "${ADMIN_PASSWORD:-$(rand 6)}"
ensure_env MANAGER_PASSWORD "${MANAGER_PASSWORD:-$(rand 6)}"
ensure_env WAITER_PASSWORD "${WAITER_PASSWORD:-$(rand 3)}"
chmod 600 "$ENV_FILE"

echo "=== 4. База данных ==="
node db/migrate.js
timeout 60 node db/check-iiko.js || true
(timeout 300 node db/sync-iiko.js 2>&1 | grep -E "✓|!|Ошибка|ошибк|failed|Готово" | tail -20) || echo "iiko: выгрузка пропущена"

echo "=== 5. Сервис ==="
sudo cp "$REPO_DIR/deploy/systemd/menu-api.service" /etc/systemd/system/menu-api.service
sudo systemctl daemon-reload
sudo systemctl enable menu-api >/dev/null
sudo systemctl restart menu-api

echo "=== 6. nginx ==="
NGINX_CONF=/etc/nginx/sites-available/fuji-front
if [ -f "$NGINX_CONF" ]; then sudo cp "$NGINX_CONF" "$NGINX_CONF.bak.$(date +%s)"; fi
sudo cp "$REPO_DIR/deploy/nginx/fuji-front.conf" "$NGINX_CONF"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/fuji-front
if sudo nginx -t 2>/dev/null; then
  sudo systemctl reload nginx
else
  echo "nginx: новый конфиг не прошёл проверку — возвращаю прежний"
  LAST=$(ls -t "$NGINX_CONF".bak.* 2>/dev/null | head -1)
  [ -n "$LAST" ] && sudo cp "$LAST" "$NGINX_CONF" && sudo nginx -t && sudo systemctl reload nginx
  exit 1
fi

echo "=== 7. Проверка ==="
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3101/health; then echo; break; fi
  sleep 2
  [ "$i" = 15 ] && { sudo journalctl -u menu-api -n 50 --no-pager; exit 1; }
done
curl -fsS -o /dev/null -w "catalog: %{http_code}\n" "http://127.0.0.1:3101/api/v1/restaurants/novo-sadovaya/catalog"

echo ""
echo "Готово:"
echo "  Гость:    https://menu.franchise-fuji.ru/?table=5"
echo "  Персонал: https://menu.franchise-fuji.ru/staff/"
echo "  Пароли персонала: $ENV_FILE (ADMIN_PASSWORD / MANAGER_PASSWORD / WAITER_PASSWORD)"
