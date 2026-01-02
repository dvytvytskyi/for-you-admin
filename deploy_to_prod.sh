#!/bin/bash

# Configuration
HOST="135.181.201.185"
USER="root"
PASS="xTVvPEwrpaF4"
REMOTE_DIR="/root/admin-panel"

# Files to deploy
FILES=(
  "admin-panel-backend/src/entities/PortfolioItem.ts"
  "admin-panel-backend/src/routes/portfolio.routes.ts"
  "admin-panel-backend/src/routes/projects.routes.ts"
  "admin-panel-backend/src/routes/upload.routes.ts"
  "admin-panel/src/components/user-profile/PortfolioManager.tsx"
  "admin-panel-backend/src/entities/User.ts"
  "admin-panel-backend/src/entities/AmoCrmUser.ts"
  "admin-panel-backend/src/routes/auth.routes.ts"
  "admin-panel-backend/src/routes/users.routes.ts"
  "admin-panel-backend/src/server.ts"
  "admin-panel-backend/src/routes/amo-crm.routes.ts"
  "admin-panel-backend/src/routes/leads.routes.ts"
  "admin-panel-backend/src/routes/analytics.routes.ts"
  "admin-panel-backend/src/services/amo-crm.service.ts"
  "admin-panel-backend/src/services/email.service.ts"
  "admin-panel-backend/src/migrations/010-add-user-amo-crm-relation.sql"
  "admin-panel-backend/src/scripts/seed-news-courses.ts"
  "admin-panel-backend/src/scripts/seed-news-courses.ts"
  "admin-panel/src/app/users/add/page.tsx"
  "admin-panel/src/app/users/[id]/page.tsx"
  "admin-panel/.eslintrc.json"
  "admin-panel/src/components/ui/modal/index.tsx"
  "admin-panel/src/components/form/Select.tsx"
  "admin-panel/src/components/form/form-elements/SelectInputs.tsx"
  "admin-panel-backend/src/services/pdf.service.ts"
  "admin-panel/next.config.js"
  "docker-compose.prod.yml"
)

echo "📦 Packaging files..."
tar -czf deploy_package.tar.gz "${FILES[@]}"

echo "🚀 Transferring files to $HOST..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no deploy_package.tar.gz $USER@$HOST:$REMOTE_DIR/

echo "🛠 Executing remote commands..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$HOST << EOF
  cd $REMOTE_DIR
  
  echo "📂 Extracting files..."
  tar -xzf deploy_package.tar.gz
  rm deploy_package.tar.gz

  echo "⚙️  Updating .env with AmoCRM config if missing..."
  if ! grep -q "AMO_DOMAIN" admin-panel-backend/.env; then
    cat >> admin-panel-backend/.env << 'ENV_EOF'

# AMO CRM Config
AMO_DOMAIN=reforyou.amocrm.ru
AMO_CLIENT_ID=2912780f-a1e4-4d5d-a069-ee01422d8bef
AMO_CLIENT_SECRET=PW0FFyI4WRLzGgKeD7ZTdTFykSMhMNPkCk1WJ6fBzdvmjvc2RQEt1eO6t88fPBhH
AMO_ACCOUNT_ID=31920194
AMO_API_DOMAIN=api-b.amocrm.ru
AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback
ENV_EOF
    echo "✅ .env updated."
  else
    echo "ℹ️  .env already contains AmoCRM config."
  fi

  echo "🗄  Running Database Migration..."
  DB_CONTAINER=$(docker ps -q -f name=admin-panel-postgres-prod)
  if [ -n "$DB_CONTAINER" ]; then
    docker exec -i $DB_CONTAINER psql -U admin -d foryou_admin_panel < admin-panel-backend/src/migrations/010-add-user-amo-crm-relation.sql
  else
    echo "⚠️  Postgres container not found, skipping migration."
  fi

  echo "🏗  Rebuilding and Restarting Services..."
  # Remove existing containers to avoid conflicts
  docker rm -f for-you-admin-panel-backend-prod 41c92101c69f_for-you-admin-panel-backend-prod 2>/dev/null
  docker rm -f for-you-admin-panel-frontend-prod 2>/dev/null
  
  docker-compose -f docker-compose.prod.yml build admin-panel-backend
  docker-compose -f docker-compose.prod.yml build admin-panel-frontend
  
  docker-compose -f docker-compose.prod.yml up -d admin-panel-backend
  docker-compose -f docker-compose.prod.yml up -d admin-panel-frontend

  echo "✅ Deployment Complete!"
  docker ps | grep for-you-admin-panel
EOF

echo "🎉 Done!"
rm deploy_package.tar.gz
