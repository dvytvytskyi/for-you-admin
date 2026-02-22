#!/bin/bash

# Configuration
SERVER_IP="135.181.201.185"
SERVER_USER="root"
CONTAINER_NAME="for-you-admin-panel-backend-prod"
TEMP_REMOTE_PATH="/tmp/migrate-areas-developers.js"
CONTAINER_SCRIPTS_PATH="/app/dist/scripts/migrate-areas-developers.js"
LOCAL_PATH="./admin-panel-backend/src/scripts/migrate-areas-developers.js"

echo "🚀 Starting migration of Areas and Developers photos to Hetzner..."

# 1. Copy the script to the server host
echo "📦 Copying script to server host..."
scp $LOCAL_PATH $SERVER_USER@$SERVER_IP:$TEMP_REMOTE_PATH

# 2. Copy the script from host to container
echo "📦 Copying script into Docker container..."
ssh $SERVER_USER@$SERVER_IP "docker cp $TEMP_REMOTE_PATH $CONTAINER_NAME:$CONTAINER_SCRIPTS_PATH"

# 3. Run the script inside the Docker container
echo "⚙️  Executing migration script inside the container..."
# Using docker exec without -it to avoid TTY issues
ssh $SERVER_USER@$SERVER_IP "docker exec $CONTAINER_NAME node dist/scripts/migrate-areas-developers.js"

# 4. Cleanup
echo "🧹 Cleaning up temp files..."
ssh $SERVER_USER@$SERVER_IP "rm $TEMP_REMOTE_PATH"
ssh $SERVER_USER@$SERVER_IP "docker exec $CONTAINER_NAME rm $CONTAINER_SCRIPTS_PATH"

echo "✅ Migration process finished!"
