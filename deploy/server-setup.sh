#!/bin/bash
# Деплой menu + Ollama на Ubuntu VPS
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/menu}"
BRANCH="${BRANCH:-main}"
IIKO_LOGIN="${IIKO_LOGIN:-}"

echo "=== 1. System packages ==="
sudo apt-get update -qq
sudo apt-get install -y -qq git curl nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "=== 2. Ollama ==="
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
sudo systemctl enable ollama
sudo systemctl start ollama
sleep 3
ollama pull qwen2:0.5b || ollama pull llama3.2:1b

echo "=== 3. PostgreSQL (Docker) ==="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker ubuntu
fi
if ! sudo docker ps -a --format '{{.Names}}' | grep -q '^menu-postgres$'; then
  sudo docker run -d --name menu-postgres \
    --restart unless-stopped \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_DB=menu_db \
    -p 127.0.0.1:5432:5432 \
    postgres:17-alpine
  sleep 5
fi

echo "=== 4. Clone / pull repo ==="
if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" https://github.com/Tux0096/menu.git "$REPO_DIR"
  cd "$REPO_DIR"
fi

echo "=== 5. menu-api ==="
cd "$REPO_DIR/menu-api"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

if [ ! -f .env ]; then
  cp .env.example .env
  if [ -n "$IIKO_LOGIN" ]; then
    sed -i "s/your-iiko-api-login/$IIKO_LOGIN/" .env
  fi
fi

if ! PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d menu_db -tAc "SELECT 1 FROM restaurants LIMIT 1" 2>/dev/null | grep -q 1; then
  node db/init.js
  node db/seed.js
fi
node db/migrate-table-orders.js
node db/sync-iiko.js 2>/dev/null || echo "iiko sync skipped (check IIKO_API_LOGIN)"

echo "=== 6. fuji-qr-app build ==="
cd "$REPO_DIR/fuji-qr-app"
npm ci 2>/dev/null || npm install
export NODE_ENV=production
npm run generate

echo "=== 7. systemd menu-api ==="
sudo cp "$REPO_DIR/deploy/systemd/menu-api.service" /etc/systemd/system/menu-api.service
sudo systemctl daemon-reload
sudo systemctl enable menu-api
sudo systemctl restart menu-api

echo "=== 8. nginx ==="
sudo cp "$REPO_DIR/deploy/nginx/fuji-front.conf" /etc/nginx/sites-available/fuji-front
sudo ln -sf /etc/nginx/sites-available/fuji-front /etc/nginx/sites-enabled/fuji-front
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=== Done ==="
curl -s http://127.0.0.1:3101/health || true
echo ""
echo "Site: https://menu.franchise-fuji.ru"
echo "QR:   https://menu.franchise-fuji.ru/?restaurant=leningradskaya&table=5"
