# 📧 Manual Subscription Email Sender

## Endpoint

```
POST /send-subscription-email
```

Send subscription confirmation emails manually by providing email and plan nickname.

---

## Request

### Headers
```
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | ✅ Yes | Customer email address |
| `planNickname` | string | ✅ Yes | Product plan nickname (e.g., "TradeCam") |
| `customerName` | string | ❌ No | Customer name (defaults to email prefix) |

### Example Request Body

```json
{
  "email": "customer@example.com",
  "planNickname": "TradeCam",
  "customerName": "John Doe"
}
```

---

## Response

### Success Response (200)

```json
{
  "success": true,
  "message": "Subscription email sent successfully",
  "details": {
    "email": "customer@example.com",
    "planNickname": "TradeCam",
    "downloadLink": "https://app.technests.ai/download/TradeCam",
    "customerName": "John Doe"
  }
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Missing 'email' in request body"
}
```

---

## Usage Examples

### PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/send-subscription-email" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"customer@example.com","planNickname":"TradeCam","customerName":"John Doe"}'
```

### cURL

```bash
curl -X POST http://localhost:3000/send-subscription-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "planNickname": "TradeCam",
    "customerName": "John Doe"
  }'
```

### JavaScript (Fetch)

```javascript
fetch('http://localhost:3000/send-subscription-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    planNickname: 'TradeCam',
    customerName: 'John Doe'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Node.js (Axios)

```javascript
const axios = require('axios');

axios.post('http://localhost:3000/send-subscription-email', {
  email: 'customer@example.com',
  planNickname: 'TradeCam',
  customerName: 'John Doe'
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

---

## Supported Plan Nicknames

All products from the mapping are supported:

- **Main Products**: TradeCam, TradeRx, JournalX, etc.
- **Trials**: TradeCam Trial, TradeRx - Trial, etc.
- **Bundles**: Core Bundle — Planner + TradeRx + JournalX
- **Special**: PropTraderPro

See `PRODUCT_MAPPING.md` for complete list.

---

## Features

✅ **Automatic Link Mapping** - Plan nickname automatically mapped to download link
✅ **Case Insensitive** - "TradeCam", "tradecam", "TRADECAM" all work
✅ **Optional Customer Name** - Uses email prefix if not provided
✅ **Professional Email** - HTML template with download button
✅ **Validation** - Required fields validated
✅ **Error Handling** - Clear error messages

---

## Test Commands

Get all test commands:
```bash
npm run test:manual-sender
```

Quick test (update email):
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/send-subscription-email" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"your-email@example.com","planNickname":"TradeCam"}'
```

---

## Use Cases

### 1. Manual Customer Onboarding
Send welcome email to new customer after manual setup.

### 2. Resend Email
Customer didn't receive email - send it again manually.

### 3. Testing
Test email templates with different products.

### 4. Migration
Send emails to existing customers during migration.

### 5. Custom Flows
Integrate into custom workflows or scripts.

---

## Workflow

```
1. POST request with email + plan nickname
   ↓
2. Validate required fields
   ↓
3. Map plan nickname → download link
   ↓
4. Send professional HTML email
   ↓
5. Return success response with details
```

---

## Error Handling

### Missing Email
```json
{
  "success": false,
  "error": "Missing 'email' in request body"
}
```

### Missing Plan Nickname
```json
{
  "success": false,
  "error": "Missing 'planNickname' in request body"
}
```

### Email Send Failure
```json
{
  "success": false,
  "error": "Failed to send email: [error details]"
}
```

---

## Logs

### Success
```
📧 Manual subscription email request:
   Email: customer@example.com
   Plan: TradeCam
   Customer Name: John Doe
   Download Link: https://app.technests.ai/download/TradeCam
✅ Manual subscription email sent successfully to customer@example.com
```

### Error
```
❌ Error sending manual subscription email: [error details]
```

---

## Batch Sending

Send to multiple customers with a script:

```javascript
const customers = [
  { email: 'customer1@example.com', planNickname: 'TradeCam' },
  { email: 'customer2@example.com', planNickname: 'TradeRx' },
  { email: 'customer3@example.com', planNickname: 'JournalX' }
];

for (const customer of customers) {
  await fetch('http://localhost:3000/send-subscription-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  
  // Wait 1 second between emails to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

---

## Notes

- 📝 This endpoint does NOT track emails (no duplicate prevention)
- 📝 Use for manual/one-off sends only
- 📝 For automatic tracking, use CSV watcher system
- 📝 Download link is mapped automatically from plan nickname
- 📝 Unknown plan nicknames use default download link

---

## Related Endpoints

- `POST /send-test-email` - Send basic test email
- `GET /subscription-emails` - View tracked emails (from CSV watcher)
- `POST /test-subscription-email` - Test mode only

---

**Endpoint**: `/send-subscription-email`
**Method**: `POST`
**Auth**: None
**Rate Limit**: None (Gmail limits apply)
