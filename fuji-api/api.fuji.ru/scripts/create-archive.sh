#!/usr/bin/env bash
# Три zip-архива: сайт (fuji.ru), бэк (api.fuji.ru), админка (admin.fuji.ru). Без .env, node_modules, по .gitignore, без api.fuji.ru/public

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
cd "$ROOT"

# Сайт: fuji.ru
zip -r -q "$ROOT/fuji-site-$STAMP.zip" fuji.ru \
  -x "fuji.ru/node_modules*" \
  -x "fuji.ru/.env*" \
  -x "fuji.ru/.git*" \
  -x "fuji.ru/logs*" \
  -x "fuji.ru/*.log" \
  -x "fuji.ru/.idea*" \
  -x "fuji.ru/.vscode*" \
  -x "fuji.ru/.fleet*" \
  -x "fuji.ru/.DS_Store" \
  -x "fuji.ru/dist*" \
  -x "fuji.ru/tmp*" \
  -x "fuji.ru/.nuxt*" \
  -x "fuji.ru/.output*" \
  -x "fuji.ru/.data*" \
  -x "fuji.ru/.nitro*" \
  -x "fuji.ru/.cache*" \
  -x "fuji.ru/nuxt.d.ts" \
  -x "fuji.ru/static/sw.js" \
  -x "fuji.ru/static/uploads*" \
  -x "fuji.ru/build-version.txt" \
  -x "fuji.ru/ios*" \
  -x "fuji.ru/android*"

# Бэк: api.fuji.ru
zip -r -q "$ROOT/fuji-api-$STAMP.zip" api.fuji.ru \
  -x "api.fuji.ru/node_modules*" \
  -x "api.fuji.ru/.env*" \
  -x "api.fuji.ru/.git*" \
  -x "api.fuji.ru/logs*" \
  -x "api.fuji.ru/*.log" \
  -x "api.fuji.ru/.idea*" \
  -x "api.fuji.ru/.vscode*" \
  -x "api.fuji.ru/.fleet*" \
  -x "api.fuji.ru/.DS_Store" \
  -x "api.fuji.ru/dist*" \
  -x "api.fuji.ru/tmp*" \
  -x "api.fuji.ru/public*" \
  -x "api.fuji.ru/build/Release*" \
  -x "api.fuji.ru/coverage*" \
  -x "api.fuji.ru/.nyc_output*" \
  -x "api.fuji.ru/.grunt*" \
  -x "api.fuji.ru/jspm_packages*" \
  -x "api.fuji.ru/.npm*" \
  -x "api.fuji.ru/.node_repl_history" \
  -x "api.fuji.ru/profile*" \
  -x "api.fuji.ru/*clinic*" \
  -x "api.fuji.ru/*flamegraph*" \
  -x "api.fuji.ru/.serviceAccountKey.js" \
  -x "api.fuji.ru/lib-cov*" \
  -x "api.fuji.ru/.lock-wscript"

# Админка: admin.fuji.ru
zip -r -q "$ROOT/fuji-admin-$STAMP.zip" admin.fuji.ru \
  -x "admin.fuji.ru/node_modules*" \
  -x "admin.fuji.ru/.env*" \
  -x "admin.fuji.ru/.git*" \
  -x "admin.fuji.ru/logs*" \
  -x "admin.fuji.ru/*.log" \
  -x "admin.fuji.ru/.idea*" \
  -x "admin.fuji.ru/.vscode*" \
  -x "admin.fuji.ru/.fleet*" \
  -x "admin.fuji.ru/.DS_Store" \
  -x "admin.fuji.ru/dist*" \
  -x "admin.fuji.ru/tmp*" \
  -x "admin.fuji.ru/.nuxt*" \
  -x "admin.fuji.ru/.output*" \
  -x "admin.fuji.ru/.data*" \
  -x "admin.fuji.ru/.nitro*" \
  -x "admin.fuji.ru/.cache*"

echo "Сайт:   $ROOT/fuji-site-$STAMP.zip"
echo "Бэк:    $ROOT/fuji-api-$STAMP.zip"
echo "Админка: $ROOT/fuji-admin-$STAMP.zip"
