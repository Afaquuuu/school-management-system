#!/usr/bin/env bash
set -euo pipefail

# Oracle Cloud / Ubuntu VPS bootstrap for School Management System
# Run as root on a fresh Ubuntu 22.04/24.04 VM:
#   curl -fsSL <repo>/deploy/setup-vps.sh | bash
# Or after cloning:
#   sudo bash deploy/setup-vps.sh

APP_DIR="/var/www/school-management-system"
APP_USER="ubuntu"
DB_NAME="school_management"
DB_USER="schoolapp"
REPO_URL="https://github.com/Afaquuuu/school-management-system.git"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root (sudo bash deploy/setup-vps.sh)."
  exit 1
fi

read -rsp "Enter PostgreSQL password for user '${DB_USER}': " DB_PASSWORD
echo
read -rsp "Confirm password: " DB_PASSWORD_CONFIRM
echo

if [[ "${DB_PASSWORD}" != "${DB_PASSWORD_CONFIRM}" ]]; then
  echo "Passwords do not match."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating packages..."
apt-get update -y
apt-get upgrade -y

echo "==> Installing Node.js 20, PostgreSQL, Nginx, PM2, Git, UFW..."
apt-get install -y curl git nginx ufw postgresql postgresql-contrib build-essential python3

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "==> Configuring PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "==> Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Oracle Ubuntu images ship iptables rules that only allow SSH before UFW runs.
# Insert HTTP/HTTPS accepts before the REJECT rule so the site is reachable.
if iptables -L INPUT -n | grep -q "reject-with icmp-host-prohibited"; then
  iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT
  iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
  if command -v netfilter-persistent >/dev/null 2>&1; then
    netfilter-persistent save
  elif apt-get install -y iptables-persistent 2>/dev/null; then
    netfilter-persistent save
  fi
fi

echo "==> Preparing app directory..."
mkdir -p "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" /var/www

if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  sed -i "s|postgresql://schoolapp:CHANGE_ME@localhost:5432/school_management|postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}|g" "${APP_DIR}/.env"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
fi

echo "==> Installing dependencies and building app..."
sudo -u "${APP_USER}" bash -lc "cd ${APP_DIR} && npm ci"
sudo -u "${APP_USER}" bash -lc "cd ${APP_DIR} && npm run db:generate"
sudo -u "${APP_USER}" bash -lc "cd ${APP_DIR} && npm run db:deploy"
sudo -u "${APP_USER}" bash -lc "cd ${APP_DIR} && npm run build"

echo "==> Configuring Nginx..."
cp "${APP_DIR}/deploy/nginx/school-app.conf" /etc/nginx/sites-available/school-app.conf
ln -sf /etc/nginx/sites-available/school-app.conf /etc/nginx/sites-enabled/school-app.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "==> Starting app with PM2..."
sudo -u "${APP_USER}" bash -lc "cd ${APP_DIR} && pm2 start deploy/ecosystem.config.cjs"
sudo -u "${APP_USER}" pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}"

mkdir -p "${APP_DIR}/.whatsapp-sessions" "${APP_DIR}/.whatsapp-queue"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/.whatsapp-sessions" "${APP_DIR}/.whatsapp-queue"

echo
echo "Setup complete."
echo "1. Edit ${APP_DIR}/.env if needed (SMTP/WhatsApp test settings stay in Admin UI)."
echo "2. Point Cloudflare A record to this server's public IP."
echo "3. Visit https://your-domain.com/api/health to verify database connection."
echo "4. Open https://your-domain.com/school-auth to register your first school."
