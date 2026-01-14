#!/bin/bash

# Configuration
SERVER1_IP="88.99.38.25"
SERVER1_USER="root"
SERVER1_PASS="PgTeNqcgnwWu"

SERVER2_IP="188.245.228.175"
SERVER2_USER="root"
SERVER2_PASS="xWJpWicwHkkU"

REMOTE_DIR="~/migration_worker"

deploy_to_server() {
    local IP=$1
    local USER=$2
    local PASS=$3
    
    echo "--------------------------------------------------"
    echo "🚀 Deploying to $IP..."

    # 1. Create Directory
    sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$USER@$IP" "mkdir -p $REMOTE_DIR"

    # 2. Sync Files (src, package.json, tsconfig.json)
    echo "📦 Syncing files..."
    sshpass -p "$PASS" rsync -av -e "ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' --exclude 'dist' ./package.json ./tsconfig.json ./src "$USER@$IP:$REMOTE_DIR/"

    # 3. Setup Environment (Node.js & Dependencies)
    echo "npm Installing dependencies..."
    sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$USER@$IP" "
        export DEBIAN_FRONTEND=noninteractive
        # Check for Node.js
        if ! command -v node &> /dev/null; then
            echo 'Node.js not found. Installing...'
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
        
        cd $REMOTE_DIR
        npm install
    "
    
    echo "✅ Deployment to $IP complete."
}

# Run Deployments
deploy_to_server $SERVER1_IP $SERVER1_USER $SERVER1_PASS &
PID1=$!

deploy_to_server $SERVER2_IP $SERVER2_USER $SERVER2_PASS &
PID2=$!

wait $PID1
wait $PID2

echo "--------------------------------------------------"
echo "🎉 All deployments finished."
