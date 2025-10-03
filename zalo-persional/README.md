# Zalo Personal Service - Chatwoot Integration

## 🚀 Overview

Zalo Personal Service là một NestJS microservice tích hợp với Chatwoot để xử lý tin nhắn Zalo thông qua zca-js library.

## 🔧 Features

- **QR Code Login**: Đăng nhập Zalo bằng QR code
- **Message Handling**: Nhận và gửi tin nhắn từ Zalo
- **Chatwoot Integration**: Tự động forward messages giữa Zalo và Chatwoot
- **Real-time Communication**: Sử dụng EventEmitter để xử lý events
- **Auto Reconnection**: Tự động kết nối lại khi mất kết nối

## 📡 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /metrics` - Service metrics
- `GET /status` - Zalo connection status

### Zalo Operations
- `GET /qr-code` - Generate QR code for Zalo login
- `POST /send-message` - Send message to Zalo
- `POST /webhook` - Handle webhook from Chatwoot

## 🔄 Message Flow

```
Zalo User → zca-js → ZaloService → ChatwootIntegrationService → Chatwoot
Chatwoot → Webhook → ZaloService → zca-js → Zalo User
```

## 🛠️ Usage

### 1. Start the Service
```bash
cd zalo-persional
PORT=3002 pnpm run start:dev
```

### 2. Generate QR Code
```bash
curl http://localhost:3002/qr-code
```

### 3. Check Connection Status
```bash
curl http://localhost:3002/status
```

### 4. Send Message to Zalo
```bash
curl -X POST http://localhost:3002/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "zalo_thread_id",
    "content": "Hello from Chatwoot!",
    "type": "user"
  }'
```

### 5. Handle Webhook from Chatwoot
```bash
curl -X POST http://localhost:3002/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "zalo_thread_id",
    "content": "Response from Chatwoot",
    "type": "user"
  }'
```

## 🔧 Environment Variables

```bash
# Required
PORT=3002
CHATWOOT_API_URL=http://localhost:3000
CHATWOOT_API_TOKEN=your_chatwoot_api_token

# Optional
NODE_ENV=development
LOG_LEVEL=info
```

## 📊 Message Types

### ThreadType.User (1)
- Direct messages from individual users
- Forwarded to Chatwoot as incoming messages

### ThreadType.Group (2)
- Group messages
- Forwarded to Chatwoot with group context

## 🔄 Auto Integration

Service tự động:
1. **Listen** for Zalo messages via zca-js
2. **Forward** messages to Chatwoot via API
3. **Create** conversations and contacts if needed
4. **Handle** webhooks from Chatwoot to send replies

## 🛡️ Security

- Internal API only (requires X-API-Key header)
- IP whitelist for internal networks
- Rate limiting (100 requests/minute)
- Request logging and monitoring

## 📝 Logs

Service logs tất cả activities:
- QR code generation
- Message sending/receiving
- Chatwoot API calls
- Connection status changes
- Error handling

## 🔧 Development

### Project Structure
```
src/
├── app.controller.ts      # Main API endpoints
├── app.service.ts         # Main service logic
├── app.module.ts          # App module configuration
├── zalo/
│   ├── zalo.service.ts    # Zalo integration service
│   ├── zalo.controller.ts # Zalo-specific endpoints
│   └── zalo.module.ts     # Zalo module
└── chatwoot/
    └── chatwoot-integration.service.ts # Chatwoot API integration
```

### Key Components

1. **ZaloService**: Manages zca-js connection and message handling
2. **ChatwootIntegrationService**: Handles Chatwoot API integration
3. **AppService**: Orchestrates message flow between services
4. **EventEmitter**: Enables real-time message forwarding

## 🚨 Error Handling

- Automatic reconnection on connection loss
- Exponential backoff for reconnection attempts
- Comprehensive error logging
- Graceful degradation when services are unavailable

## 📈 Monitoring

- Health check endpoint for service monitoring
- Metrics endpoint for performance monitoring
- Connection status tracking
- Message flow logging