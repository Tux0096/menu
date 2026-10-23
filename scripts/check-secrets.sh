#!/usr/bin/env bash
# Грубая проверка репозитория на утёкшие секреты (известные форматы).
# Запуск из любого места: scripts/check-secrets.sh. Код выхода 1 — нашлись подозрительные места.
set -u
cd "$(dirname "$0")/.."
FILES=$(git ls-files | grep -vE '(^|/)(package-lock\.json|node_modules/|\.nuxt/|\.output/)|\.(png|jpe?g|webp|woff2?|svg|ico|gif|pdf|min\.js)$|^scripts/check-secrets\.sh$|^\.gitleaks\.toml$|(^|/)lordicon\.js$')
fail=0
check() {
  local title="$1" re="$2" hits
  hits=$(echo "$FILES" | xargs -d '\n' grep -InE "$re" 2>/dev/null | grep -vE 'example|placeholder|your_|dev-secret-change-me|PG_PASSWORD' | cut -c1-200)
  if [ -n "$hits" ]; then echo "== $title"; echo "$hits"; fail=1; fi
}
check "32 hex рядом с secret/password/token/key" "(secret|passw(or)?d|token|api_?key)[A-Za-z_]*['\"]?[[:space:]]*[:=][[:space:]]*(process\.env\.[A-Z_]+[[:space:]]*\|\|[[:space:]]*)?['\"][0-9a-f]{32}['\"]"
check "ключ OpenRouter/OpenAI (sk-or-, sk-)" "sk-or-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9]{32,}"
check "приватный ключ" "BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY"
check "postgres://user:pass@host" "postgres(ql)?://[A-Za-z0-9_.-]+:[A-Za-z0-9_.%~!*-]+@"
check "CloudPayments public id (pk_ + 32 hex)" "pk_[0-9a-f]{32}"
check "fallback-секрет в коде: SECRET || 'литерал'" "(SECRET|PASSWORD|TOKEN|API_KEY)[A-Z_]*[[:space:]]*\|\|[[:space:]]*['\"][^'\"]{8,}['\"]"
if [ $fail -ne 0 ]; then echo; echo "Найдены подозрительные места. Секреты хранить только в env."; exit 1; fi
echo "Секреты не найдены."
