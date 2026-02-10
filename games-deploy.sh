#!/bin/bash
set -e

# Deploy Games Server
echo "🚀 Deploying Games Server..."
cd packages/games_server
fly deploy
cd ../..

# Deploy Games Client
echo "🚀 Deploying Games Client..."
cd packages/games_client
fly deploy
cd ../..

echo "✅ Deployment Complete!"
