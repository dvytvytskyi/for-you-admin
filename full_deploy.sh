#!/bin/bash

# Configuration
PROJECT_NAME="for-you-admin"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting Modular Deployment for $PROJECT_NAME..."

# Step 1: Optimization and Cleanup (before building)
echo "🧹 Cleaning up old Docker images and builders..."
docker system prune -f

# Step 2: Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker compose -f $DOCKER_COMPOSE_FILE down --remove-orphans

# Step 3: Build and Pull Images
echo "🏗 Building images (modularly)..."
# All services build from the same context but with different commands
docker compose -f $DOCKER_COMPOSE_FILE build --pull --force-rm

# Step 4: Start services in background
echo "🆙 Starting services..."
docker compose -f $DOCKER_COMPOSE_FILE up -d

# Step 5: Wait for Database to be ready
echo "⏳ Waiting for Database (admin-panel-db) to initialize..."
HEALTH_CHECK_MAX_RETRIES=20
HEALTH_CHECK_SLEEP=3
RETRIES=0

until [ "$(docker inspect -f '{{.State.Health.Status}}' for-you-admin-panel-postgres-prod)" == "healthy" ] || [ $RETRIES -eq $HEALTH_CHECK_MAX_RETRIES ]; do
    echo "  - Still waiting for DB... ($((RETRIES+1))/$HEALTH_CHECK_MAX_RETRIES)"
    sleep $HEALTH_CHECK_SLEEP
    RETRIES=$((RETRIES+1))
done

# Step 6: Database Migrations
# Run migrations on BOTH backend services (if needed, usually one is enough as they share DB)
echo "📦 Running backend database migrations..."
docker exec for-you-admin-api-prod npm run migration:run

echo "🖼 Cleaning up property photos on production..."
docker exec for-you-admin-api-prod npx ts-node src/scripts/total-wipe-secondary.ts

# Step 7: Final Cleanup
echo "♻️ Finalizing cleanup (removing dangling images)..."
docker image prune -f

echo "✨ Modular Deployment Complete!"
echo "📡 Admin Panel accessible at: http://localhost:3001"
echo "⚙️ Public API: Port 4000 (Forwarded by Proxy)"
echo "🔐 Admin Engine: Port 4001 (Forwarded by Proxy)"
