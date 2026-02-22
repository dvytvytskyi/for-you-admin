#!/bin/bash

# Configuration
HOST="135.181.201.185"
USER="root"
PASS="xTVvPEwrpaF4"
REMOTE_DIR="/root/admin-panel"

echo "📦 Creating deployment package..."

# Create temporary directory for deployment
TMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TMP_DIR"

# Copy entire project to temp directory
echo "Copying project files..."
rsync -av --exclude='node_modules' \
  --exclude='.git' \
  --exclude='docker-data' \
  --exclude='*.dump' \
  --exclude='dataset_*' \
  --exclude='dist' \
  --exclude='.next' \
  ./ "$TMP_DIR/"

# Create archive
cd "$TMP_DIR/.."
ARCHIVE_NAME="admin_deploy_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$ARCHIVE_NAME" $(basename "$TMP_DIR")

echo "📤 Uploading to server..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no "$ARCHIVE_NAME" $USER@$HOST:/root/

echo "🚀 Deploying on server..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$HOST <<EOF
set -e

echo "📂 Preparing deployment directory..."
cd /root

# Backup existing deployment if it exists
if [ -d "$REMOTE_DIR" ]; then
  echo "Creating backup of current deployment..."
  mv "$REMOTE_DIR" "${REMOTE_DIR}_backup_\$(date +%Y%m%d_%H%M%S)" || true
fi

# Extract new deployment
echo "Extracting new deployment..."
tar -xzf "$ARCHIVE_NAME"
mv $(basename "$TMP_DIR") admin-panel

cd $REMOTE_DIR

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

echo "🏗️  Building new images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to start..."
sleep 15

echo "📊 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "🔍 Checking backend logs..."
docker-compose -f docker-compose.prod.yml logs --tail=50 admin-panel-backend

echo "✅ Deployment completed!"
echo ""
echo "Services status:"
docker ps | grep for-you-admin-panel

echo ""
echo "🌐 Admin panel should be available at: https://admin.foryou-realestate.com"

# Cleanup
rm -f /root/$ARCHIVE_NAME

EOF

# Local cleanup
rm -rf "$TMP_DIR"
rm -f "$(dirname "$TMP_DIR")/$ARCHIVE_NAME"

echo "🎉 Deployment script completed!"
echo ""
echo "Next steps:"
echo "1. Check if services are running: ssh root@$HOST 'docker ps'"
echo "2. View backend logs: ssh root@$HOST 'cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml logs -f admin-panel-backend'"
echo "3. View frontend logs: ssh root@$HOST 'cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml logs -f admin-panel-frontend'"
