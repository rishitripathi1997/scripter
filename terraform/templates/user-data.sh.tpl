#!/bin/bash
set -euxo pipefail
exec > /var/log/connectx-user-data.log 2>&1

APP_DIR="/opt/connectx-scripts"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Installing Docker"
dnf update -y
dnf install -y docker git
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
COMPOSE_VERSION="v2.32.4"
curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "==> Cloning application"
rm -rf "$APP_DIR"
git clone "${git_repo_url}" "$APP_DIR"
cd "$APP_DIR"
git checkout "${git_branch}"

echo "==> Writing .env"
cat > .env <<EOF
DEBUG=false
POSTGRES_PASSWORD=${postgres_password}
DATABASE_URL=postgresql+psycopg://connectx:${postgres_password}@db:5432/connectx_scripts
SECRET_KEY=${secret_key}
SESSION_COOKIE_SECURE=false
APP_ENCRYPTION_KEY=${encryption_key}
CORS_ORIGINS=["${cors_origin}"]
SEED_ADMIN_USERNAME=${admin_username}
SEED_ADMIN_PASSWORD=${admin_password}
SEED_ADMIN_ENABLED=true
S3_BUCKET=${s3_bucket}
AWS_REGION=${aws_region}
LOCAL_STORAGE_PATH=/app/data
SCRIPT_RUN_TIMEOUT_SECONDS=600
ASYNC_RUNS_ENABLED=true
SLACK_WEBHOOK_URL=
WEBHOOK_NOTIFICATIONS_ENABLED=false
RUN_DB_MIGRATIONS=true
EOF
chmod 600 .env

echo "==> Building and starting containers"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Bootstrap complete"
