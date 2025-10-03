# Zalo Personal Service - Security Configuration

## 🔒 Security Features

### 1. API Key Authentication
- All requests require `X-API-Key` header
- Default key: `zalo-service-secret-key` (change in production)
- Set via environment variable: `ZALO_SERVICE_API_KEY`

### 2. Internal Network Only
- Only allows requests from internal IPs:
  - `127.0.0.1`, `::1`, `localhost`
  - Docker networks: `172.16.0.0/12`, `192.168.0.0/16`, `10.0.0.0/8`
- Accepts internal service headers:
  - `X-Internal-Service: true`
  - `X-Chatwoot-Service: true`
  - `X-Zalo-Service: true`

### 3. Rate Limiting
- 100 requests per minute per IP
- Configurable via environment variables
- Automatic cleanup of expired entries

### 4. CORS Protection
- Only allows origins from Chatwoot services
- Restricted headers and methods
- Credentials support for internal services

### 5. Security Headers (Helmet)
- Content Security Policy
- HSTS (HTTP Strict Transport Security)
- XSS Protection
- Frame Options

## 🚀 Usage

### Health Check (No Auth Required)
```bash
curl http://localhost:3002/health
```

### Internal API Calls (Auth Required)
```bash
curl -H "X-API-Key: zalo-service-secret-key" \
     -H "X-Internal-Service: true" \
     http://localhost:3002/webhook
```

### From Chatwoot Rails App
```ruby
# In your Rails service
response = HTTParty.post(
  'http://localhost:3002/send-message',
  headers: {
    'X-API-Key' => ENV['ZALO_SERVICE_API_KEY'],
    'X-Chatwoot-Service' => 'true',
    'Content-Type' => 'application/json'
  },
  body: { message: 'Hello Zalo' }.to_json
)
```

## 🔧 Environment Variables

```bash
# Required
ZALO_SERVICE_API_KEY=your-secret-key-here
PORT=3002

# Optional
CHATWOOT_API_URL=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## 📊 Monitoring

### Health Endpoint
- `GET /health` - Service status and uptime
- `GET /metrics` - Memory usage and performance metrics

### Logging
- All requests are logged with IP, method, URL, status, and duration
- Structured logging for easy monitoring

## 🛡️ Production Security Checklist

- [ ] Change default API key
- [ ] Use HTTPS in production
- [ ] Configure proper firewall rules
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Use environment-specific CORS origins
- [ ] Enable request/response logging
- [ ] Set up rate limiting per service
