#!/bin/bash
# First-time Let's Encrypt certificate acquisition for SHOT.
# Run this ONCE before starting docker-compose.prod.yml normally.
#
# Usage:
#   chmod +x init-letsencrypt.sh
#   ./init-letsencrypt.sh
#
# Set STAGING=1 to test against Let's Encrypt staging (no rate limits).

set -euo pipefail

# ── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in the values."
  exit 1
fi
# shellcheck disable=SC1091
set -o allexport; source .env; set +o allexport

DOMAIN="${DOMAIN:?DOMAIN must be set in .env}"
EMAIL="${CERTBOT_EMAIL:-}"
STAGING="${STAGING:-0}"
COMPOSE="docker compose -f docker-compose.prod.yml"

RSA_KEY_SIZE=4096
DATA_PATH="./data/certbot"

# ── Staging flag ─────────────────────────────────────────────────────────────
STAGING_ARG=""
if [ "$STAGING" -eq 1 ]; then
  echo "NOTE: Using Let's Encrypt STAGING environment (certificates are not trusted)."
  STAGING_ARG="--staging"
fi

# ── Email arg ────────────────────────────────────────────────────────────────
if [ -n "$EMAIL" ]; then
  EMAIL_ARG="-m $EMAIL"
else
  EMAIL_ARG="--register-unsafely-without-email"
fi

# ── Download recommended TLS parameters ──────────────────────────────────────
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || \
   [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$DATA_PATH/conf"
  curl -sSf \
    "https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf" \
    -o "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -sSf \
    "https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem" \
    -o "$DATA_PATH/conf/ssl-dhparams.pem"
fi

# ── Create dummy certificate so nginx can start ───────────────────────────────
if [ ! -e "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "### Creating dummy certificate for $DOMAIN ..."
  mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
  $COMPOSE run --rm --no-deps --entrypoint \
    "openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out    /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
      -subj   /CN=localhost" certbot
fi

# ── Start nginx-proxy (needs dummy cert to boot) ──────────────────────────────
echo "### Starting nginx-proxy ..."
$COMPOSE up --force-recreate -d nginx-proxy

# ── Delete dummy cert, request real one ──────────────────────────────────────
echo "### Removing dummy certificate ..."
$COMPOSE run --rm --no-deps --entrypoint \
  "rm -rf /etc/letsencrypt/live/$DOMAIN \
          /etc/letsencrypt/archive/$DOMAIN \
          /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting certificate for $DOMAIN ..."
$COMPOSE run --rm --no-deps --entrypoint \
  "certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    $EMAIL_ARG \
    -d $DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal" certbot

# ── Reload nginx with real cert ───────────────────────────────────────────────
echo "### Reloading nginx ..."
$COMPOSE exec nginx-proxy nginx -s reload

# ── Bring up the rest of the stack ───────────────────────────────────────────
echo "### Starting all services ..."
$COMPOSE up -d

echo ""
echo "Done! SHOT is running at https://$DOMAIN"
