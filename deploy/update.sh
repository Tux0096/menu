#!/bin/bash
# Обновление прода QR-меню на уже настроенном сервере (запускается из GitHub Actions или вручную).
#   BRANCH=main bash deploy/update.sh
# Секреты берутся из переменных окружения и дописываются в menu-api/.env (в репозиторий не попадают):
#   FCM_SERVICE_ACCOUNT, ALERT_TELEGRAM_BOT_TOKEN, ALERT_TELEGRAM_CHAT_ID, SENTRY_DSN, OPENROUTER_API_KEY, IIKO_API_LOGIN, IIKO_CLIENT_SECRET, IIKO_MENU_API_LOGIN, IIKO_MENU_CLIENT_SECRET, IIKO_APP_ID, IIKO_EXTERNAL_MENU_ID, ADMIN_PASSWORD, MANAGER_PASSWORD, WAITER_PASSWORD
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
# menu-api требует Node 22 (engines в package.json): на старой версии ставим Node 22 из NodeSource, sharp пересоберётся при npm ci
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "  Node $NODE_MAJOR < 22 — устанавливаю Node 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  hash -r
  echo "  Node: $(node -v)"
fi
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
# Какие секреты пришли из GitHub (только факт, без значений)
for v in OPENROUTER_API_KEY IIKO_API_LOGIN IIKO_CLIENT_SECRET IIKO_MENU_API_LOGIN IIKO_MENU_CLIENT_SECRET IIKO_APP_ID IIKO_EXTERNAL_MENU_ID IIKO_BAR_API_LOGIN IIKO_BAR_APP_ID IIKO_BAR_CLIENT_SECRET IIKO_BAR_ORGANIZATION_ID FCM_SERVICE_ACCOUNT ALERT_TELEGRAM_BOT_TOKEN ALERT_TELEGRAM_CHAT_ID SENTRY_DSN CLOUDPAYMENTS_PUBLIC_ID CLOUDPAYMENTS_API_SECRET IIKO_PAYMENT_TYPE_ID IIKO_BAR_PAYMENT_TYPE_ID; do
  if [ -n "${!v:-}" ]; then echo "  секрет $v: задан"; else echo "  секрет $v: —"; fi
done
[ -n "${OPENROUTER_API_KEY:-}" ] && set_env OPENROUTER_API_KEY "$OPENROUTER_API_KEY"
[ -n "${IIKO_API_LOGIN:-}" ] && set_env IIKO_API_LOGIN "$IIKO_API_LOGIN"
[ -n "${IIKO_CLIENT_SECRET:-}" ] && set_env IIKO_CLIENT_SECRET "$IIKO_CLIENT_SECRET"
[ -n "${IIKO_MENU_API_LOGIN:-}" ] && set_env IIKO_MENU_API_LOGIN "$IIKO_MENU_API_LOGIN"
[ -n "${IIKO_MENU_CLIENT_SECRET:-}" ] && set_env IIKO_MENU_CLIENT_SECRET "$IIKO_MENU_CLIENT_SECRET"
[ -n "${IIKO_APP_ID:-}" ] && set_env IIKO_APP_ID "$IIKO_APP_ID"
# Второй iiko (бар с алкоголем): свой ключ, ID приложения и секрет клиента
[ -n "${IIKO_BAR_API_LOGIN:-}" ] && set_env IIKO_BAR_API_LOGIN "$IIKO_BAR_API_LOGIN"
[ -n "${IIKO_BAR_APP_ID:-}" ] && set_env IIKO_BAR_APP_ID "$IIKO_BAR_APP_ID"
[ -n "${IIKO_BAR_CLIENT_SECRET:-}" ] && set_env IIKO_BAR_CLIENT_SECRET "$IIKO_BAR_CLIENT_SECRET"
[ -n "${IIKO_BAR_ORGANIZATION_ID:-}" ] && set_env IIKO_BAR_ORGANIZATION_ID "$IIKO_BAR_ORGANIZATION_ID"
[ -n "${IIKO_EXTERNAL_MENU_ID:-}" ] && set_env IIKO_EXTERNAL_MENU_ID "$IIKO_EXTERNAL_MENU_ID"
# Дополнительные ключи iiko (секрет IIKO_KEYS: «Название = ключ» по строке) — в .env одной строкой base64; печатаем только названия
if [ -n "${IIKO_KEYS:-}" ]; then
  set_env IIKO_KEYS_B64 "$(printf '%s' "$IIKO_KEYS" | base64 -w0)"
  printf '%s\n' "$IIKO_KEYS" | sed -n 's/^[[:space:]]*\([^=#][^=]*\)=.*/  ключ iiko «\1»: задан/p' | sed 's/[[:space:]]*»/»/'
fi
# База сотрудников «Фуджи Тим» (вход на of. по табельному): строка подключения — в .env base64 (пароль со спецсимволами не ломает файл)
if [ -n "${FUJI_TEAM_DATABASE_URL:-}" ]; then
  set_env FUJI_TEAM_DATABASE_URL_B64 "$(printf '%s' "$FUJI_TEAM_DATABASE_URL" | base64 -w0)"
  echo "  база «Фуджи Тим»: задана"
fi
[ -n "${FUJI_TEAM_SSL:-}" ] && set_env FUJI_TEAM_SSL "$FUJI_TEAM_SSL"
# Онлайн-оплата CloudPayments: ключи есть — оплата в меню включается
[ -n "${CLOUDPAYMENTS_PUBLIC_ID:-}" ] && set_env CLOUDPAYMENTS_PUBLIC_ID "$CLOUDPAYMENTS_PUBLIC_ID"
[ -n "${CLOUDPAYMENTS_API_SECRET:-}" ] && set_env CLOUDPAYMENTS_API_SECRET "$CLOUDPAYMENTS_API_SECRET"
if [ -n "${CLOUDPAYMENTS_PUBLIC_ID:-}" ] && [ -n "${CLOUDPAYMENTS_API_SECRET:-}" ]; then set_env PAYMENTS_ENABLED true; fi
# Оповещения в Telegram (падения, БД, диск, лимиты) и Sentry — необязательно; нет значений — всё работает как раньше
[ -n "${ALERT_TELEGRAM_BOT_TOKEN:-}" ] && set_env ALERT_TELEGRAM_BOT_TOKEN "$ALERT_TELEGRAM_BOT_TOKEN"
[ -n "${ALERT_TELEGRAM_CHAT_ID:-}" ] && set_env ALERT_TELEGRAM_CHAT_ID "$ALERT_TELEGRAM_CHAT_ID"
[ -n "${SENTRY_DSN:-}" ] && set_env SENTRY_DSN "$SENTRY_DSN"
[ -n "${IIKO_PAYMENT_TYPE_ID:-}" ] && set_env IIKO_PAYMENT_TYPE_ID "$IIKO_PAYMENT_TYPE_ID"
[ -n "${IIKO_BAR_PAYMENT_TYPE_ID:-}" ] && set_env IIKO_BAR_PAYMENT_TYPE_ID "$IIKO_BAR_PAYMENT_TYPE_ID"
[ -n "${IIKO_PAYMENT_FISCALIZED_EXTERNALLY:-}" ] && set_env IIKO_PAYMENT_FISCALIZED_EXTERNALLY "$IIKO_PAYMENT_FISCALIZED_EXTERNALLY"
# Push в приложение официанта: JSON ключа Firebase — в .env одной строкой (base64)
if [ -n "${FCM_SERVICE_ACCOUNT:-}" ]; then
  if printf '%s' "$FCM_SERVICE_ACCOUNT" | grep -q '{'; then
    set_env FCM_SERVICE_ACCOUNT "$(printf '%s' "$FCM_SERVICE_ACCOUNT" | base64 -w0)"
  else
    set_env FCM_SERVICE_ACCOUNT "$(printf '%s' "$FCM_SERVICE_ACCOUNT" | tr -d '[:space:]')"
  fi
fi

ensure_env AUTH_SECRET "$(rand 32)"
# Короткий секрет подписи токенов небезопасен — сервер с ним не запустится; меняем (персонал войдёт заново)
CUR_SECRET=$(get_env AUTH_SECRET)
if [ "${#CUR_SECRET}" -lt 32 ]; then set_env AUTH_SECRET "$(rand 32)"; echo "  AUTH_SECRET был короче 32 символов — заменён"; fi
# Секрет подписи QR столов — задаётся один раз и не меняется (иначе напечатанные QR перестанут работать)
ensure_env QR_SECRET "$(rand 24)"
ensure_env QR_RESTAURANT_SLUG "novo-sadovaya"
ensure_env PUBLIC_MENU_URL "https://menu.franchise-fuji.ru"
ensure_env LEGACY_API_URL "https://apiv2.infra-fuji.ru"
ensure_env OPENROUTER_MODEL "openai/gpt-4o-mini"
ensure_env GUEST_AUTH_REQUIRED "true"
# Вход на of. по коду сотрудника из iiko (карта) — только если значение не задано; в демо-режиме iiko сервер сам остаётся на PIN из админки
ensure_env IIKO_STAFF_LOGIN "on"
# Пароли персонала — используются только при первом создании пользователей.
# Если секреты не заданы — генерируются случайные и хранятся только в .env на сервере.
ensure_env ADMIN_PASSWORD "${ADMIN_PASSWORD:-$(rand 6)}"
ensure_env MANAGER_PASSWORD "${MANAGER_PASSWORD:-$(rand 6)}"
ensure_env WAITER_PASSWORD "${WAITER_PASSWORD:-$(rand 8)}"
chmod 600 "$ENV_FILE"
# Sentry подключается, только если задан SENTRY_DSN; пакет ставим отдельно (npm ci его не знает и убирает)
if [ -n "$(get_env SENTRY_DSN)" ] && [ ! -d node_modules/@sentry/node ]; then
  npm install --no-save --no-audit --no-fund @sentry/node@^8 >/dev/null 2>&1 && echo "  Sentry: пакет установлен" || echo "  ! @sentry/node не установился — ошибки останутся только в журнале"
fi

echo "=== 4. База данных ==="
# Резервная копия БД ПЕРЕД миграцией (pre-deploy-<дата>.dump в /var/backups/menu). Не получилась — деплой останавливаем:
# откат миграции = восстановление этого дампа (README.md → «Бэкап и восстановление», menu-api/db/rollback/README.md)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/menu}"
sudo mkdir -p "$BACKUP_DIR" && sudo chown "$(id -un):$(id -gn)" "$BACKUP_DIR" && sudo chmod 700 "$BACKUP_DIR"
if ! BACKUP_DIR="$BACKUP_DIR" REPO_DIR="$REPO_DIR" bash "$REPO_DIR/deploy/backup.sh" --pre-deploy; then
  echo "ДЕПЛОЙ ОСТАНОВЛЕН: резервная копия перед миграцией не сделана. Работает прежняя версия; миграция не запускалась." >&2
  exit 1
fi
node db/migrate.js
# Пароль администратора задаётся секретом GitHub ADMIN_PASSWORD (вход: логин admin)
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  ADMIN_PASSWORD_RESET="$ADMIN_PASSWORD" node db/set-admin-password.js || echo "  ! пароль администратора не обновлён"
fi
timeout 60 node db/check-iiko.js || true
timeout 60 node db/iiko-sections-probe.js || true
# Меню из iiko сервер выгружает сам: после деплоя — полностью (сбрасываем отметку), дальше раз в сутки
node --input-type=module -e "import pool from './db/pool.js'; await pool.query(\"DELETE FROM settings WHERE name = 'iiko_menu_synced_at'\"); await pool.end();" || true

echo "=== 4б. Админка (adm.menu…/admin/) ==="
# Сборку делает GitHub Actions и кладёт архив в ~/menu-admin-upload; здесь — распаковка с заменой целиком
ADMIN_DIST="$HOME/menu-admin-dist"
ADMIN_TGZ="$HOME/menu-admin-upload/menu-admin.tgz"
if [ -f "$ADMIN_TGZ" ]; then
  rm -rf "$ADMIN_DIST.new" && mkdir -p "$ADMIN_DIST.new"
  if tar -xzf "$ADMIN_TGZ" -C "$ADMIN_DIST.new" && [ -f "$ADMIN_DIST.new/200.html" ]; then
    rm -rf "$ADMIN_DIST.old"
    [ -d "$ADMIN_DIST" ] && mv "$ADMIN_DIST" "$ADMIN_DIST.old"
    mv "$ADMIN_DIST.new" "$ADMIN_DIST"
    rm -f "$ADMIN_TGZ"
    echo "  админка обновлена"
  else
    rm -rf "$ADMIN_DIST.new"
    echo "  ! архив админки повреждён — остаётся прежняя"
  fi
else
  echo "  новой сборки нет — остаётся прежняя"
fi
set_env ADMIN_WEB_DIR "$ADMIN_DIST"

echo "=== 5. Сервис ==="
# Пароль БД: пустой или «postgres» — генерируем новый. Сначала меняем пароль в самом Postgres (docker exec, ALTER USER),
# и только если получилось и новый пароль подошёл по TCP — записываем в .env. Пароль нигде не печатается.
# Делаем перед самым перезапуском API: старый процесс держит соединения со старым паролем, новые подключения — уже с новым.
rotate_pg_password() {
  local cur user container="menu-postgres" newpw
  cur=$(get_env PG_PASSWORD); user=$(get_env PG_USER); user=${user:-postgres}
  if [ -n "$cur" ] && [ "$cur" != "postgres" ]; then echo "  пароль БД: уже свой — не меняю"; return 0; fi
  if ! sudo docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$container"; then
    echo "  пароль БД: контейнер $container не найден (Postgres не в Docker?) — смените пароль вручную"; return 0
  fi
  newpw=$(rand 24)   # hex: безопасно для SQL и .env
  if ! printf "ALTER USER \"%s\" WITH PASSWORD '%s';\n" "$user" "$newpw" \
      | sudo docker exec -i "$container" psql -X -q -U "$user" -d postgres -v ON_ERROR_STOP=1 >/dev/null 2>&1; then
    echo "  ! пароль БД не изменён (ALTER USER не выполнился) — .env не тронут"; return 0
  fi
  # новый пароль должен работать с хоста по TCP, как у API; иначе возвращаем прежний
  if PG_PASSWORD="$newpw" WAIT_DB_SECONDS=10 node "$API_DIR/db/wait-db.js" >/dev/null 2>&1; then
    set_env PG_PASSWORD "$newpw"
    echo "  пароль БД заменён на сгенерированный (записан в $ENV_FILE)"
  else
    printf "ALTER USER \"%s\" WITH PASSWORD '%s';\n" "$user" "${cur:-postgres}" \
      | sudo docker exec -i "$container" psql -X -q -U "$user" -d postgres -v ON_ERROR_STOP=1 >/dev/null 2>&1 \
      && echo "  ! новый пароль БД не подошёл по TCP — возвращён прежний, .env не тронут" \
      || echo "  !!! пароль БД изменён, но проверка не прошла и возврат не удался — проверьте $ENV_FILE и доступ к БД вручную"
  fi
  return 0
}
rotate_pg_password

sudo cp "$REPO_DIR/deploy/systemd/menu-api.service" /etc/systemd/system/menu-api.service
# Ежедневная резервная копия: service + timer (cp и enable идемпотентны)
sudo cp "$REPO_DIR/deploy/systemd/menu-backup.service" /etc/systemd/system/menu-backup.service
sudo cp "$REPO_DIR/deploy/systemd/menu-backup.timer" /etc/systemd/system/menu-backup.timer
# Журнал systemd не должен съедать диск: не больше 500 МБ (drop-in, повторный запуск ничего не меняет)
JOURNALD_DROPIN=/etc/systemd/journald.conf.d/menu.conf
if ! grep -qs '^SystemMaxUse=500M$' "$JOURNALD_DROPIN"; then
  sudo mkdir -p /etc/systemd/journald.conf.d
  printf '[Journal]\nSystemMaxUse=500M\n' | sudo tee "$JOURNALD_DROPIN" >/dev/null
  sudo systemctl restart systemd-journald || echo "  ! journald не перезапустился — лимит применится после перезагрузки"
fi
sudo systemctl daemon-reload
sudo systemctl enable menu-api >/dev/null
sudo systemctl enable --now menu-backup.timer >/dev/null
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

echo "=== 6б. Домены персонала: of.menu (официанты), adm.menu (админка) ==="
# Сбой здесь не ломает деплой меню: без сертификата поддомены работают по HTTP, выпуск повторится при следующем деплое
STAFF_CONF=/etc/nginx/sites-available/fuji-staff
STAFF_CERT=/etc/letsencrypt/live/of.menu.franchise-fuji.ru/fullchain.pem
staff_nginx() {
  sudo cp "$REPO_DIR/deploy/nginx/$1" "$STAFF_CONF"
  sudo ln -sf "$STAFF_CONF" /etc/nginx/sites-enabled/fuji-staff
  if sudo nginx -t 2>/dev/null; then sudo systemctl reload nginx; return 0; fi
  echo "  nginx: конфиг $1 не прошёл проверку — поддомены отключены"
  sudo rm -f /etc/nginx/sites-enabled/fuji-staff; sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
  return 1
}
if sudo test -f "$STAFF_CERT"; then
  staff_nginx fuji-staff.conf && echo "  https://of.menu.franchise-fuji.ru и https://adm.menu.franchise-fuji.ru — готово" || true
else
  sudo mkdir -p /var/www/certbot
  if staff_nginx fuji-staff-http.conf; then
    if command -v certbot >/dev/null && sudo certbot certonly --webroot -w /var/www/certbot \
        -d of.menu.franchise-fuji.ru -d adm.menu.franchise-fuji.ru --cert-name of.menu.franchise-fuji.ru \
        --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring 2>&1 | tail -5; then
      if sudo test -f "$STAFF_CERT"; then
        staff_nginx fuji-staff.conf && echo "  сертификат выпущен, HTTPS включён" || true
      else
        echo "  сертификат не выпущен (проверьте A-записи of./adm. → IP сервера) — пока работает HTTP"
      fi
    else
      echo "  certbot недоступен или выпуск не удался — пока работает HTTP"
    fi
  fi
fi

echo "=== 7. Проверка ==="
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3101/health; then echo; break; fi
  sleep 2
  [ "$i" = 15 ] && { sudo journalctl -u menu-api -n 50 --no-pager; exit 1; }
done
echo "Ждём выгрузку меню из iiko (до 60 с)..."
for i in $(seq 1 12); do
  sudo journalctl -u menu-api --since "3 min ago" --no-pager -o cat | grep -q "✓ Готово. Ресторанов" && break
  sleep 5
done
SLUG=$(get_env QR_RESTAURANT_SLUG); SLUG=${SLUG:-novo-sadovaya}
curl -fsS -m 90 "http://127.0.0.1:3101/api/v1/restaurants/$SLUG/catalog" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`меню ${process.argv[1]}: источник ${j.source}, блюд ${j.products.length}, категорий ${(j.groups||[]).length}, стоп-лист ${(j.stopList||[]).length}`)})' "$SLUG" \
  || echo "меню: не удалось получить"
sudo journalctl -u menu-api --since "3 min ago" --no-pager -o cat | grep -E "^catalog|prod API|iiko|→|вернул|по группам|записано|! |Готово|внешнее меню|разбор меню|пример «" | tail -60 || true

echo ""
echo "Резервные копии: $BACKUP_DIR (ежедневно в 04:30, systemctl list-timers menu-backup.timer); проверка: bash $REPO_DIR/deploy/restore-check.sh"
echo "Готово:"
echo "  Гость:    https://menu.franchise-fuji.ru/?table=5"
echo "  Админка:  https://adm.menu.franchise-fuji.ru/ (то же — https://menu.franchise-fuji.ru/admin/)"
echo "  Персонал: https://menu.franchise-fuji.ru/staff/"
echo "  Пароли персонала: $ENV_FILE (ADMIN_PASSWORD / MANAGER_PASSWORD / WAITER_PASSWORD)"
