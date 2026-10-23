#!/bin/bash
# Проверка резервной копии: восстановить последний дамп во временную БД menu_restore_check, сравнить число строк
# ключевых таблиц с рабочей БД и удалить временную БД. Рабочая БД не меняется.
#   bash deploy/restore-check.sh                 — последний menu-*.dump из BACKUP_DIR
#   bash deploy/restore-check.sh /path/file.dump — конкретный дамп (например pre-deploy-*.dump)
# Код выхода 0 — копия восстанавливается и данные на месте; 1 — нет (таблицы нет или она пуста, хотя в рабочей БД есть строки).
# Расхождение чисел само по себе не ошибка: рабочая БД ушла вперёд с момента дампа (показываем разницу).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=lib-pg.sh
. ./lib-pg.sh

BACKUP_DIR="${BACKUP_DIR:-/var/backups/menu}"
CHECK_DB="${CHECK_DB:-menu_restore_check}"
TABLES="${CHECK_TABLES:-restaurants staff_users guests products menu_overrides table_sessions table_order_items table_payments visit_feedback audit_log reservations schema_steps}"

DUMP="${1:-}"
[ -n "$DUMP" ] || DUMP=$(ls -1t "$BACKUP_DIR"/menu-2*.dump 2>/dev/null | head -1 || true)
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "restore-check: дамп не найден в $BACKUP_DIR" >&2; exit 1; }
[ "$CHECK_DB" != "$PG_DATABASE" ] || { echo "restore-check: временная БД совпадает с рабочей — отказ" >&2; exit 1; }
echo "restore-check: дамп $DUMP ($(date -r "$DUMP" '+%F %T'), $PG_MODE)"

cleanup() { pg dropdb --if-exists "$CHECK_DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT
pg dropdb --if-exists "$CHECK_DB" >/dev/null
pg createdb "$CHECK_DB"
# --no-owner: пользователь на тестовой машине может отличаться; ошибки отдельных объектов не прячем, но не останавливаем проверку
if ! pg pg_restore --no-owner --no-privileges -d "$CHECK_DB" < "$DUMP" 2> >(grep -v '^$' >&2); then
  echo "restore-check: pg_restore сообщил об ошибках (см. выше) — сверяю то, что восстановилось" >&2
fi

count() { pg psql -X -At -d "$1" -c "SELECT count(*) FROM $2" 2>/dev/null || echo "нет"; }
BAD=0
printf '%-24s %12s %12s\n' "таблица" "в дампе" "в рабочей БД"
for t in $TABLES; do
  r=$(count "$CHECK_DB" "$t"); l=$(count "$PG_DATABASE" "$t")
  note=""
  if [ "$l" = "нет" ]; then note="(в рабочей БД таблицы нет)"
  elif [ "$r" = "нет" ]; then note="ОШИБКА: таблицы нет в дампе"; BAD=1
  elif [ "$r" = "0" ] && [ "$l" != "0" ]; then note="ОШИБКА: в дампе пусто"; BAD=1
  elif [ "$r" != "$l" ]; then note="(разница $((l - r)))"; fi
  printf '%-24s %12s %12s  %s\n' "$t" "$r" "$l" "$note"
done

if [ "$BAD" -ne 0 ]; then echo "restore-check: ПРОВАЛ — копия неполная" >&2; tg_alert "проверка восстановления не прошла ($(basename "$DUMP"))"; exit 1; fi
echo "restore-check: OK — дамп восстановился, данные на месте"
