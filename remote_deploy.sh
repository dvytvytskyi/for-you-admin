#!/bin/bash

# Remote Deployment Script for For You Admin Panel
# This script deploys the project directly to a remote server

# Configuration - UPDATE THESE VALUES
REMOTE_HOST="135.181.201.185"
REMOTE_USER="root"
REMOTE_PASSWORD="xTVvPEwrpaF4"
REMOTE_PATH="/root/admin-panel-backend/src"  # This seems to be the backend path, but we need the project root
PROJECT_NAME="for-you-admin"
LOCAL_PROJECT_PATH="/Users/vytvytskyi/admin_for_you"  # Update this to your local path

echo "🚀 Starting Remote Deployment to $REMOTE_HOST..."

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Installing..."
    brew install hudochenkov/sshpass/sshpass  # for macOS
    # For Linux: sudo apt install sshpass
fi

# Step 1: Upload project files to server
echo "📤 Uploading project files to server..."
sshpass -p "$REMOTE_PASSWORD" scp -r "$LOCAL_PROJECT_PATH" "$REMOTE_USER@$REMOTE_HOST:/root/$PROJECT_NAME"

# Step 2: Connect to server and run deployment
echo "🔧 Connecting to server and starting deployment..."
sshpass -p "$REMOTE_PASSWORD" ssh "$REMOTE_USER@$REMOTE_HOST" << EOF
    cd /root/$PROJECT_NAME

    # Make deployment script executable
    chmod +x full_deploy.sh

    # Run the deployment
    ./full_deploy.sh

    echo "✅ Deployment completed!"
    echo "📡 Admin Panel: http://$REMOTE_HOST:3001"
    echo "🔗 Public API: http://$REMOTE_HOST:4000"
    echo "⚙️ Admin API: http://$REMOTE_HOST:4001"
EOF

echo "✨ Remote deployment completed successfully!"