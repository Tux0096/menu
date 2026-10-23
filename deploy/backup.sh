#!/bin/bash
# Резервная копия QR-меню: дамп рабочей БД (pg_dump -Fc) + архив menu-api/.env и menu-api/media.
#   bash deploy/backup.sh               — ежедневная копия (systemd timer menu-backup.timer, 04:30)
#   bash deploy/backup.sh --pre-deploy  — только дамп БД «pre-deploy-<дата>.dump» перед миграцией (вызывает update.sh)
# Куда: BACKUP_DIR (по умолчанию /var/backups/menu); старше 14 дней (BACKUP_KEEP_DAYS) удаляется, но три последние остаются всегда.
# В .env лежат VAPID-ключи push, QR_SECRET (без него напечатанные QR перестанут работать) и ключи iiko — архив только для владельца (600).
# Postgres в Docker (menu-postgres): дамп делает pg_dump из контейнера, иначе — клиент на хосте (см. lib-pg.sh).
# Код выхода не 0 — копия не сделана (update.sh в этом случае останавливает деплой).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=lib-pg.sh
. ./lib-pg.sh

MODE="${1:-daily}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/menu}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP=$(date +%Y%m%d-%H%M%S)

fail() { echo "backup: ОШИБКА — $1" >&2; tg_alert "резервная копия не сделана: $1"; exit 1; }
trap 'rm -f "${TMP_FILES[@]:-}" 2>/dev/null || true' EXIT
TMP_FILES=()

mkdir -p "$BACKUP_DIR" 2>/dev/null || sudo -n mkdir -p "$BACKUP_DIR" || fail "нет каталога $BACKUP_DIR"
[ -w "$BACKUP_DIR" ] || { sudo -n chown "$(id -u):$(id -g)" "$BACKUP_DIR" 2>/dev/null || true; }
[ -w "$BACKUP_DIR" ] || fail "нет прав на запись в $BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true
umask 077

# одна копия за раз (ночной таймер и деплой)
exec 9>"$BACKUP_DIR/.lock"
flock -w 600 9 || fail "другая копия идёт больше 10 минут"

# ── 1. Дамп БД ──
# Самый первый деплой: рабочей БД ещё нет (её создаёт миграция) — копировать нечего, деплой не задерживаем
if [ "$MODE" = --pre-deploy ]; then
  EXISTS=$(pg psql -X -At -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$PG_DATABASE'") || fail "Postgres недоступен (проверьте PG_* в $ENV_FILE)"
  [ "$EXISTS" = 1 ] || { echo "backup: БД $PG_DATABASE ещё не создана — копировать нечего"; exit 0; }
fi
case "$MODE" in
  --pre-deploy) DUMP="$BACKUP_DIR/pre-deploy-$STAMP.dump" ;;
  *) DUMP="$BACKUP_DIR/menu-$STAMP.dump" ;;
esac
TMP="$DUMP.part"; TMP_FILES+=("$TMP")
echo "backup: дамп БД $PG_DATABASE ($PG_MODE) → $DUMP"
pg pg_dump -Fc "$PG_DATABASE" > "$TMP" || fail "pg_dump не выполнился (БД недоступна или неверный пароль в $ENV_FILE)"
# дамп должен читаться: pg_restore --list разбирает оглавление архива
pg pg_restore --list < "$TMP" >/dev/null 2>&1 || fail "дамп повреждён (pg_restore --list не прочитал оглавление)"
[ "$(stat -c %s "$TMP")" -gt 1024 ] || fail "дамп подозрительно мал"
mv "$TMP" "$DUMP"
echo "backup: дамп готов, $(du -h "$DUMP" | cut -f1)"

# ── 2. .env и media (только ежедневная копия) ──
if [ "$MODE" != --pre-deploy ]; then
  CONF="$BACKUP_DIR/menu-config-$STAMP.tgz"
  ITEMS=()
  [ -f "$ENV_FILE" ] && ITEMS+=("$(basename "$ENV_FILE")")
  [ -d "$API_DIR/media" ] && ITEMS+=(media)
  if [ "${#ITEMS[@]}" -gt 0 ]; then
    tar -czf "$CONF.part" -C "$API_DIR" "${ITEMS[@]}" || { rm -f "$CONF.part"; fail "архив .env/media не создан"; }
    mv "$CONF.part" "$CONF"
    echo "backup: ${ITEMS[*]} → $CONF, $(du -h "$CONF" | cut -f1)"
  else
    echo "backup: ! ни .env, ни media не найдены в $API_DIR" >&2
  fi
fi

# ── 3. Ротация: старше KEEP_DAYS удаляем, три последние файла каждого вида остаются ──
rotate() {
  local pattern="$1" n=0 f
  while IFS= read -r f; do
    n=$((n + 1))
    [ "$n" -le 3 ] && continue
    [ -n "$(find "$f" -mtime +"$KEEP_DAYS" -print 2>/dev/null)" ] && { rm -f "$f"; echo "backup: удалён старый $(basename "$f")"; }
  done < <(ls -1t "$BACKUP_DIR"/$pattern 2>/dev/null || true)
}
rotate 'menu-2*.dump'
rotate 'menu-config-*.tgz'
rotate 'pre-deploy-*.dump'

# ── 4. Диск: предупреждение, если после копии занято > 85% ──
USED=$(df --output=pcent "$BACKUP_DIR" | tail -1 | tr -dc '0-9')
if [ -n "$USED" ] && [ "$USED" -gt 85 ]; then
  echo "backup: ! диск занят на ${USED}%" >&2
  tg_alert "после резервной копии диск занят на ${USED}% ($BACKUP_DIR)"
fi
echo "backup: готово"
