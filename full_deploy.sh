#!/bin/bash

# Configuration
HOST="135.181.201.185"
USER="root"
PASS="xTVvPEwrpaF4"
REMOTE_DIR="/root/admin-panel"

echo "🗜 Creating archive..."
# Package everything but exclude node_modules, .git, .next, etc.
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='admin-panel/.next' \
    --exclude='admin-panel-backend/dist' \
    --exclude='admin-panel-backend/node_modules' \
    --exclude='admin-panel/node_modules' \
    --exclude='.env' \
    --exclude='admin-panel/.env*' \
    --exclude='admin-panel-backend/.env*' \
    --exclude='deploy_package.tar.gz' \
    --exclude='full_deploy.sh' \
    -czf deploy_package.tar.gz .

echo "🚀 Transferring files to $HOST..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no deploy_package.tar.gz $USER@$HOST:$REMOTE_DIR/

echo "🛠 Executing remote commands..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$HOST << EOF
  cd $REMOTE_DIR
  
  echo "📂 Extracting files..."
  tar -xzf deploy_package.tar.gz
  rm deploy_package.tar.gz

  echo "🏗  Rebuilding Services..."
  docker-compose -f docker-compose.prod.yml build admin-panel-backend
  docker-compose -f docker-compose.prod.yml build admin-panel-frontend
  
  echo "🛑 Stopping and removing containers..."
  docker-compose -f docker-compose.prod.yml down || true
  # Force remove if still there
  docker rm -f for-you-admin-panel-backend-prod for-you-admin-panel-frontend-prod || true

  echo "🚀 Starting containers..."
  docker-compose -f docker-compose.prod.yml up -d

  echo "✅ Deployment Complete!"
  docker ps | grep for-you-admin-panel
EOF

echo "🎉 Done!"
rm deploy_package.tar.gz
