#!/bin/bash

# Deploy Games Client and Verify
# Usage: ./deploy-and-verify.sh [--no-cache]

set -e

APP_NAME="golf-games-client"
TEST_INVITE="18dc3777-c709-4c7e-91fc-4ec678165052"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying $APP_NAME${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deploy with optional --no-cache flag
if [ "$1" == "--no-cache" ]; then
    echo -e "${YELLOW}📦 Building with --no-cache${NC}"
    fly deploy --no-cache -a "$APP_NAME"
else
    fly deploy -a "$APP_NAME"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Wait a moment for the app to be ready
echo -e "${BLUE}⏳ Waiting for app to be ready...${NC}"
sleep 5

echo ""
echo -e "${BLUE}🔍 Verifying deployment...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check nginx config
echo -e "${BLUE}1. Checking nginx configuration:${NC}"
fly ssh console -a "$APP_NAME" -C "cat /etc/nginx/conf.d/default.conf" 2>/dev/null | head -20
echo ""

# Test backend connectivity
echo -e "${BLUE}2. Testing backend connectivity:${NC}"
if fly ssh console -a "$APP_NAME" -C "wget -qO- --timeout=5 http://golf-games-server.internal:8080/healthz 2>&1" | grep -q "OK"; then
    echo -e "${GREEN}   ✅ Backend is reachable${NC}"
else
    echo -e "${RED}   ❌ Backend not reachable${NC}"
fi
echo ""

# Test public API endpoint
echo -e "${BLUE}3. Testing public API endpoint:${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$APP_NAME.fly.dev/v1/invites/$TEST_INVITE")
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}   ✅ API endpoint responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}   ❌ API endpoint returned HTTP $HTTP_CODE${NC}"
fi
echo ""

# Test static assets
echo -e "${BLUE}4. Testing static assets:${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$APP_NAME.fly.dev/")
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}   ✅ Frontend loading (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}   ❌ Frontend returned HTTP $HTTP_CODE${NC}"
fi
echo ""

# Check recent logs
echo -e "${BLUE}5. Recent logs:${NC}"
fly logs -a "$APP_NAME" --count 20
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo -e "${BLUE}🌐 App URL: https://$APP_NAME.fly.dev${NC}"
echo -e "${BLUE}🔗 Test API: https://$APP_NAME.fly.dev/v1/invites/$TEST_INVITE${NC}"
