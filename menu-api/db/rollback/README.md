# Откат миграций

`db/migrate.js` — одна идемпотентная миграция: она только добавляет (таблицы, колонки, индексы) и один раз выполняет
«деструктивные» шаги (`schema_steps`, см. ниже). Автоматического `down` нет. Откат — одним из двух способов.

## 1. Основной способ: восстановить дамп перед деплоем

Перед каждой миграцией `deploy/update.sh` делает `pg_dump -Fc` в `/var/backups/menu/pre-deploy-<ГГГГММДД-ЧЧММСС>.dump`
(не получилось — деплой останавливается и миграция не запускается). Откат = вернуть БД из этого файла **и** код прежней версии.

Данные, записанные после деплоя (заказы, оплаты, отзывы), в дамп не попали — они будут потеряны. Если деплой был давно, а
сломалась только часть, лучше способ 2.

```bash
# на сервере, пользователь ubuntu
cd /var/backups/menu && ls -lt pre-deploy-*.dump | head       # выберите дамп ДО нужного деплоя
DUMP=/var/backups/menu/pre-deploy-20261023-043012.dump         # ← подставьте свой файл

sudo systemctl stop menu-api                                    # никто не пишет в БД

# 1) страховочная копия текущего состояния (вдруг откат окажется ошибкой)
bash /home/ubuntu/menu/deploy/backup.sh --pre-deploy

# 2) пересоздать рабочую БД и залить дамп (Postgres 17 в Docker, контейнер menu-postgres; пользователь и имя БД — из menu-api/.env)
sudo docker exec menu-postgres psql -U postgres -d postgres -c "DROP DATABASE menu_db WITH (FORCE)"
sudo docker exec menu-postgres createdb -U postgres menu_db
sudo docker exec -i menu-postgres pg_restore -U postgres -d menu_db --no-owner --exit-on-error < "$DUMP"

# 3) вернуть код прежней версии: GitHub → Actions → Deploy → Run workflow, ветка/тег с прежним коммитом
#    (git branch rollback-<дата> <sha-прежнего-релиза> && git push origin rollback-<дата>); update.sh развернёт его
#    и повторно запустит ТОТ ЖЕ migrate.js той версии — он идемпотентен и на восстановленной БД ничего не сломает.
sudo systemctl start menu-api
curl -fsS http://127.0.0.1:3101/health
```

Без Docker (Postgres на хосте): те же команды без `docker exec …`, с `-h localhost -p 5432` и `PGPASSWORD` из `.env`.

Проверить дамп заранее, ничего не ломая: `bash deploy/restore-check.sh /var/backups/menu/pre-deploy-….dump`
(восстанавливает во временную БД `menu_restore_check` и удаляет её).

## 2. Точечный откат SQL: убрать новые объекты

Новые колонки, таблицы и индексы добавляются «рядом» и старому коду не мешают, поэтому чаще всего достаточно
вернуть **код** прежней версии (Actions → Deploy на старом коммите) — БД трогать не нужно. SQL ниже нужен, если новый
объект мешает (например, индекс тормозит запись или миграция упала на дубликатах).

Перед любым `DROP` — копия: `bash deploy/backup.sh --pre-deploy`. Выполнять в транзакции под тем же пользователем, что и API:

```bash
sudo docker exec -i menu-postgres psql -U postgres -d menu_db -v ON_ERROR_STOP=1 < menu-api/db/rollback/2026-10-ops-hardening.down.sql
```

| Файл | Что убирает |
|---|---|
| `2026-10-ops-hardening.down.sql` | этот релиз: `schema_steps`, `ai_llm_usage`, `restaurants.timezone`, 9 новых индексов, возврат `timestamptz` → `timestamp` (по желанию, закомментировано) |
| `previous-releases.down.sql` | последние релизы: вход по табельному (`staff_users.team_code`), время показа разделов и описание модификаторов бизнес-ланча, Web Push гостю (`guest_push_subscriptions`), правила алкоголя (`restaurants.alcohol_rules`, `table_order_items.age_confirmed_at`), брони (`reservations` и связанные колонки) |

`DROP` колонки или таблицы **удаляет данные в ней безвозвратно** — вернуть можно только из дампа.

## Однократные шаги (`schema_steps`)

Всё, что в `migrate.js` удаляет или переписывает данные и меняет типы (`DELETE` дублей отзывов, `UPDATE` дублей оплат и
`paid_payment_id`, `DROP CONSTRAINT/INDEX`, `ALTER … TYPE`, перенос ключей разделов, `TIMESTAMP → TIMESTAMPTZ`),
выполняется один раз и записывается в таблицу `schema_steps(name, applied_at)`. Чтобы шаг выполнился заново (например,
после восстановления старого дампа это не нужно — таблица вернётся вместе с ним), удалите его строку:

```sql
SELECT * FROM schema_steps ORDER BY applied_at;
DELETE FROM schema_steps WHERE name = 'visit_feedback_dedupe';   -- следующий деплой выполнит шаг снова
```

Новый деструктивный шаг добавляйте только в массив `STEPS` в `migrate.js` под новым именем; имена выполненных шагов не меняйте.

## Если не создался уникальный индекс

Индексы из `SOFT_INDEXES` не останавливают деплой, но при ошибке миграция печатает заметный блок
`!!! МИГРАЦИЯ: индекс не создан …` (и отправляет оповещение в Telegram, если оно настроено). Без такого индекса
защита от дублей (один отзыв на визит, одна оплата официанту на визит, ключ стоп-листа) не работает. Найдите дубли,
уберите их и повторите `node db/migrate.js`.
