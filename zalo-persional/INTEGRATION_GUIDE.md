# Zalo Personal Channel Integration Guide

## Tổng quan

Hệ thống tích hợp Zalo Personal Channel với Node.js service để generate QR code và tự động tạo Channel sau khi user scan QR code thành công.

## Luồng hoạt động

### 1. Frontend (Vue Component)
- User vào trang tạo Zalo Personal Channel
- Component tự động gọi Node.js service để generate QR code
- Hiển thị QR code và polling để check trạng thái login
- Khi login thành công, tự động lấy cookie và tên account
- Tạo Channel với thông tin đã lấy được

### 2. Node.js Service APIs

#### POST `/zalo/qr-code`
- Generate QR code từ Zalo SDK
- Trả về credentials sau khi login thành công
- Response: `{ success: true, credentials: {...} }`

#### GET `/zalo/qr-code`
- Lấy QR code image (base64)
- Response: `{ success: true, data: "base64_string" }`

#### GET `/zalo/status`
- Check trạng thái kết nối
- Response: `{ success: true, connected: boolean, credentials: {...}, accountName: "..." }`

## Cấu hình

### Frontend Configuration
```javascript
// Trong ZaloPersonal.vue
data() {
  return {
    zaloServiceUrl: 'http://localhost:3001/zalo', // URL của Node.js service
    // ... other data
  };
}
```

### Node.js Service Configuration
```typescript
// Trong zalo.service.ts
private zaloServiceUrl = 'http://localhost:3001/zalo';
```

## Cách sử dụng

### 1. Khởi động Node.js Service
```bash
cd zalo-persional
npm run start:dev
```

### 2. Khởi động Chatwoot Frontend
```bash
pnpm dev
```

### 3. Tạo Zalo Personal Channel
1. Vào Settings > Inboxes > Add Inbox > Zalo Personal
2. QR code sẽ tự động được generate và hiển thị
3. Scan QR code bằng Zalo app
4. Sau khi scan thành công, Channel sẽ được tạo tự động với:
   - Channel name = Tên Zalo account
   - Cookie = Cookie từ Zalo session
   - IMEI và User Agent

## API Endpoints

### Generate QR Code
```http
POST http://localhost:3001/zalo/qr-code
Content-Type: application/json

Response:
{
  "success": true,
  "credentials": {
    "imei": "...",
    "userAgent": "...",
    "cookie": [...]
  }
}
```

### Get QR Code Image
```http
GET http://localhost:3001/zalo/qr-code

Response:
{
  "success": true,
  "data": "iVBORw0KGgoAAAANSUhEUgAA...", // base64 image
  "message": "QR code retrieved"
}
```

### Check Connection Status
```http
GET http://localhost:3001/zalo/status

Response:
{
  "success": true,
  "connected": true,
  "credentials": {
    "imei": "...",
    "userAgent": "...",
    "cookie": [...]
  },
  "accountName": "Zalo Account"
}
```

## Troubleshooting

### CORS Issues
**Problem**: `Referrer Policy: strict-origin-when-cross-origin` error
**Solution**:
1. Make sure Node.js service is running: `cd zalo-persional && npm run start:dev`
2. Check CORS configuration in `main.ts`
3. Test CORS with: `node test-cors.js`
4. Check browser console for detailed error messages

**Common CORS Errors**:
- `Access to fetch at 'http://localhost:3001/zalo/qr-code' from origin 'http://localhost:3000' has been blocked by CORS policy`
- `Response to preflight request doesn't pass access control check`

**CORS Fix Checklist**:
- ✅ Node.js service running on port 3001
- ✅ CORS enabled in `main.ts`
- ✅ OPTIONS handler in controller
- ✅ CORS headers in all endpoints
- ✅ Frontend using `mode: 'cors'` in fetch requests

### QR Code không hiển thị
- Check Node.js service có chạy không
- Check CORS settings
- Check network connection
- Check browser console for fetch errors

### Login không thành công
- Check Zalo app có được cài đặt không
- Check QR code có hết hạn không (5 phút)
- Check logs trong Node.js service
- Check polling status in browser console

### Channel không được tạo
- Check cookie có hợp lệ không
- Check account name có được lấy không
- Check validation rules trong Vue component
- Check connection status endpoint

## Development Notes

### Polling Strategy
- Frontend polling mỗi 3 giây để check QR code và login status
- Retry sau 5 giây nếu có lỗi
- Stop polling khi login thành công

### Error Handling
- Graceful error handling cho network issues
- User-friendly error messages
- Automatic retry mechanism

### Security Considerations
- QR code tự động bị xóa sau khi generate
- Cookie được lưu an toàn trong Channel
- Session timeout handling

## File Structure

```
zalo-persional/
├── src/
│   ├── zalo/
│   │   ├── zalo.service.ts    # Main service logic
│   │   ├── zalo.controller.ts # API endpoints
│   │   └── zalo.module.ts    # Module configuration
│   └── app.controller.ts     # Main app controller
└── INTEGRATION_GUIDE.md      # This file

app/javascript/dashboard/routes/dashboard/settings/inbox/channels/
└── ZaloPersonal.vue         # Frontend Vue component
```

## Next Steps

1. **Account Name Detection**: Implement actual Zalo account name detection
2. **Error Recovery**: Add better error recovery mechanisms
3. **Session Management**: Implement session persistence
4. **Multiple Accounts**: Support multiple Zalo accounts
5. **Real-time Updates**: Add WebSocket for real-time status updates
