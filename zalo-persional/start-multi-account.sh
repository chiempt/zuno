#!/bin/bash

echo "🚀 Starting Zalo Multi-Account Service..."

# Set environment variables
export CHATWOOT_API_URL=${CHATWOOT_API_URL:-"http://localhost:3000"}
export CHATWOOT_API_TOKEN=${CHATWOOT_API_TOKEN:-"internal_token"}
export ZALO_WEBHOOK_SECRET=${ZALO_WEBHOOK_SECRET:-"default_secret_for_development"}
export NODE_ENV=${NODE_ENV:-"development"}

echo "📋 Configuration:"
echo "  - Chatwoot URL: $CHATWOOT_API_URL"
echo "  - Webhook Secret: ${ZALO_WEBHOOK_SECRET:0:10}..."
echo "  - Environment: $NODE_ENV"

# Start the service
echo "🎯 Starting service..."
npm run start:dev

echo "✅ Service started successfully!"
