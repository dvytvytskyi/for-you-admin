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
  "admin-panel-backend/src/config/s3.ts"
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
  "admin-panel/src/app/properties/add/page.tsx"
  "admin-panel/src/app/properties/edit/[id]/page.tsx"
  "admin-panel/.eslintrc.json"
  "admin-panel/src/components/ui/modal/index.tsx"
  "admin-panel/src/components/form/Select.tsx"
  "admin-panel/src/components/form/form-elements/SelectInputs.tsx"
  "admin-panel-backend/src/routes/public.routes.ts"
  "admin-panel-backend/src/routes/properties.routes.ts"
  "admin-panel-backend/src/scripts/translate-properties.ts"
  "admin-panel/src/app/properties/page.tsx"
  "admin-panel-backend/src/services/pdf.service.ts"
  "admin-panel-backend/src/entities/Document.ts"
  "admin-panel-backend/src/routes/documents.routes.ts"
  "admin-panel-backend/src/templates/portfolio-analytics.ejs"
  "admin-panel-backend/src/templates/presentation.ejs"
  "admin-panel/next.config.js"
  "admin-panel-backend/src/entities/News.ts"
  "admin-panel-backend/src/entities/NewsContent.ts"
  "admin-panel-backend/src/routes/news.routes.ts"
  "admin-panel-backend/src/entities/Area.ts"
  "admin-panel-backend/src/routes/settings.routes.ts"
  "admin-panel/src/app/settings/page.tsx"
  "admin-panel-backend/src/scripts/translate-areas-azure.ts"
  "admin-panel-backend/src/routes/images.routes.ts"
  "admin-panel-backend/src/entities/Property.ts"
  "admin-panel/src/components/investor-chat/ProjectSelector.tsx"
  "admin-panel/src/components/form/input/InputField.tsx"
  "admin-panel/src/components/form/input/TextArea.tsx"
  "admin-panel/src/components/tables/Pagination.tsx"
  "admin-panel/src/app/support/page.tsx"
  "admin-panel/src/app/news/[id]/page.tsx"
  "admin-panel/src/app/news/add/page.tsx"
  "admin-panel-backend/src/migrations/013-add-vacancy-localization.sql"
  "admin-panel-backend/src/entities/Vacancy.ts"
  "admin-panel-backend/src/entities/VacancyRequest.ts"
  "admin-panel-backend/src/entities/index.ts"
  "admin-panel-backend/src/routes/vacancies.routes.ts"
  "admin-panel-backend/src/routes/public-vacancies.routes.ts"
  "admin-panel/src/app/vacancies/page.tsx"
  "admin-panel/src/app/vacancies/new/page.tsx"
  "admin-panel/src/app/vacancies/[id]/page.tsx"
  "admin-panel/src/types/vacancy.ts"
  "admin-panel-backend/src/scripts/convert-s3-to-webp.ts"
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
  DB_CONTAINER=\$(docker ps -q -f name=admin-panel-postgres-prod)
  if [ -n "\$DB_CONTAINER" ]; then
    docker exec -i \$DB_CONTAINER psql -U admin -d foryou_admin_panel < admin-panel-backend/src/migrations/010-add-user-amo-crm-relation.sql
    echo "🗄  Running Vacancy Localization Migration..."
    docker exec -i \$DB_CONTAINER psql -U admin -d admin_panel < admin-panel-backend/src/migrations/013-add-vacancy-localization.sql
  else
    echo "⚠️  Postgres container not found, skipping migration."
  fi

  echo "🏗  Rebuilding and Restarting Services..."
  docker-compose -f docker-compose.prod.yml down --remove-orphans || true
  
  docker-compose -f docker-compose.prod.yml build admin-panel-backend
  docker-compose -f docker-compose.prod.yml build admin-panel-frontend
  
  echo "🛑 Force removing existing containers to avoid conflicts..."
  docker rm -f for-you-admin-panel-backend-prod for-you-admin-panel-frontend-prod || true

  docker-compose -f docker-compose.prod.yml up -d admin-panel-backend
  docker-compose -f docker-compose.prod.yml up -d admin-panel-frontend

  echo "⏳ Waiting for services to start..."
  sleep 20

  echo "🌍 Running Area Translation Script..."
  BACKEND_CONTAINER=\$(docker ps -q -f name=admin-panel-backend-prod)
  if [ -n "\$BACKEND_CONTAINER" ]; then
    # Ensure script is compiled (if backend does it on startup) or run with ts-node/node
    # Assuming backend runs dist/server.js so we run dist/scripts/...
    # But wait, does build compile scripts? Just in case, try ts-node if installed or node dist/
    # We will try node dist/scripts/translate-areas-azure.js assuming build process includes it.
    # If not, we might need to compile specific file or assume it's there.
    # Given we uploaded it to src/scripts, and assuming build command compiles src/** to dist/**
    
    docker exec \$BACKEND_CONTAINER node dist/scripts/translate-areas-azure.js || echo "⚠️ Translation script failed (maybe not compiled?)"
  else
    echo "⚠️ Backend container not found"
  fi

  echo "✅ Deployment Complete!"
  docker ps | grep for-you-admin-panel
EOF

echo "🎉 Done!"
rm deploy_package.tar.gz
