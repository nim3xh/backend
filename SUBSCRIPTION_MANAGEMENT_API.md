# Subscription Management API

Complete API documentation for managing permanent and temporary subscriptions through the admin panel.

## Overview

The subscription management system allows administrators to:
- Manage permanent subscriptions (indefinite access)
- Manage temporary subscriptions (time-limited access)
- View subscription statistics
- Control user access to different plans

## Authentication

All subscription management endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Data Structure

### Permanent Subscription
```json
{
  "id": "perm_001",
  "email": "user@example.com",
  "planNickname": "all",
  "addedDate": "2025-11-24T00:00:00.000Z",
  "addedBy": "admin",
  "notes": "System administrator",
  "status": "active"
}
```

### Temporary Subscription
```json
{
  "id": "temp_001",
  "email": "user@example.com",
  "planNickname": "all",
  "startDate": "2025-11-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "addedDate": "2025-11-01T00:00:00.000Z",
  "addedBy": "admin",
  "notes": "Temporary trial access",
  "status": "active"
}
```

## API Endpoints

### 1. Get All Permanent Subscriptions

**GET** `/api/admin/subscriptions/permanent`

Get a list of all permanent subscriptions.

**Response:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "perm_001",
      "email": "user@example.com",
      "planNickname": "all",
      "addedDate": "2025-11-24T00:00:00.000Z",
      "addedBy": "admin",
      "notes": "System administrator",
      "status": "active"
    }
  ],
  "count": 1
}
```

### 2. Get All Temporary Subscriptions

**GET** `/api/admin/subscriptions/temporary`

Get a list of all temporary subscriptions with expiration status.

**Response:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "temp_001",
      "email": "user@example.com",
      "planNickname": "all",
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z",
      "addedDate": "2025-11-01T00:00:00.000Z",
      "addedBy": "admin",
      "notes": "Temporary trial access",
      "status": "active",
      "isExpired": false,
      "isActive": true
    }
  ],
  "count": 1
}
```

### 3. Add Permanent Subscription

**POST** `/api/admin/subscriptions/permanent`

Add a new permanent subscription.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "planNickname": "all",
  "notes": "VIP customer"
}
```

**Required Fields:**
- `email` (string): User's email address

**Optional Fields:**
- `planNickname` (string): Plan access ("all" for full access, or specific plan name). Default: "all"
- `notes` (string): Optional notes about the subscription

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "perm_002",
    "email": "newuser@example.com",
    "planNickname": "all",
    "addedDate": "2025-11-24T10:30:00.000Z",
    "addedBy": "admin",
    "notes": "VIP customer",
    "status": "active"
  },
  "message": "Permanent subscription added successfully"
}
```

### 4. Add Temporary Subscription

**POST** `/api/admin/subscriptions/temporary`

Add a new temporary subscription with start and end dates.

**Request Body:**
```json
{
  "email": "tempuser@example.com",
  "planNickname": "all",
  "startDate": "2025-11-24T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "notes": "Trial period"
}
```

**Required Fields:**
- `email` (string): User's email address
- `startDate` (ISO 8601 date string): When access begins
- `endDate` (ISO 8601 date string): When access expires

**Optional Fields:**
- `planNickname` (string): Plan access ("all" for full access, or specific plan name). Default: "all"
- `notes` (string): Optional notes about the subscription

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "temp_014",
    "email": "tempuser@example.com",
    "planNickname": "all",
    "startDate": "2025-11-24T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "addedDate": "2025-11-24T10:30:00.000Z",
    "addedBy": "admin",
    "notes": "Trial period",
    "status": "active"
  },
  "message": "Temporary subscription added successfully"
}
```

### 5. Update Permanent Subscription

**PUT** `/api/admin/subscriptions/permanent/:id`

Update an existing permanent subscription.

**URL Parameters:**
- `id`: Subscription ID (e.g., "perm_001")

**Request Body:**
```json
{
  "email": "updated@example.com",
  "planNickname": "TradeCam",
  "notes": "Updated notes",
  "status": "inactive"
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "perm_001",
    "email": "updated@example.com",
    "planNickname": "TradeCam",
    "addedDate": "2025-11-24T00:00:00.000Z",
    "addedBy": "admin",
    "notes": "Updated notes",
    "status": "inactive"
  },
  "message": "Permanent subscription updated successfully"
}
```

### 6. Update Temporary Subscription

**PUT** `/api/admin/subscriptions/temporary/:id`

Update an existing temporary subscription.

**URL Parameters:**
- `id`: Subscription ID (e.g., "temp_001")

**Request Body:**
```json
{
  "email": "updated@example.com",
  "planNickname": "JournalX",
  "startDate": "2025-11-25T00:00:00.000Z",
  "endDate": "2026-01-15T23:59:59.999Z",
  "notes": "Extended trial",
  "status": "active"
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "temp_001",
    "email": "updated@example.com",
    "planNickname": "JournalX",
    "startDate": "2025-11-25T00:00:00.000Z",
    "endDate": "2026-01-15T23:59:59.999Z",
    "addedDate": "2025-11-01T00:00:00.000Z",
    "addedBy": "admin",
    "notes": "Extended trial",
    "status": "active"
  },
  "message": "Temporary subscription updated successfully"
}
```

### 7. Delete Permanent Subscription

**DELETE** `/api/admin/subscriptions/permanent/:id`

Delete a permanent subscription.

**URL Parameters:**
- `id`: Subscription ID (e.g., "perm_001")

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "perm_001",
    "email": "user@example.com",
    "planNickname": "all",
    "addedDate": "2025-11-24T00:00:00.000Z",
    "addedBy": "admin",
    "notes": "System administrator",
    "status": "active"
  },
  "message": "Permanent subscription deleted successfully"
}
```

### 8. Delete Temporary Subscription

**DELETE** `/api/admin/subscriptions/temporary/:id`

Delete a temporary subscription.

**URL Parameters:**
- `id`: Subscription ID (e.g., "temp_001")

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "temp_001",
    "email": "user@example.com",
    "planNickname": "all",
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "addedDate": "2025-11-01T00:00:00.000Z",
    "addedBy": "admin",
    "notes": "Temporary trial access",
    "status": "active"
  },
  "message": "Temporary subscription deleted successfully"
}
```

### 9. Get Subscription Statistics

**GET** `/api/admin/subscriptions/stats`

Get statistics about all subscriptions.

**Response:**
```json
{
  "success": true,
  "stats": {
    "permanent": {
      "total": 1,
      "active": 1,
      "inactive": 0
    },
    "temporary": {
      "total": 13,
      "active": 10,
      "expired": 2,
      "upcoming": 1
    },
    "totalActiveSubscriptions": 11
  }
}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error status codes:
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (subscription not found)
- `500` - Internal Server Error

## Usage Examples

### Using cURL

**Add a permanent subscription:**
```bash
curl -X POST http://localhost:8000/api/admin/subscriptions/permanent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "planNickname": "all",
    "notes": "VIP customer"
  }'
```

**Add a temporary subscription:**
```bash
curl -X POST http://localhost:8000/api/admin/subscriptions/temporary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trial@example.com",
    "planNickname": "all",
    "startDate": "2025-11-24T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "notes": "14-day trial"
  }'
```

**Get all subscriptions:**
```bash
curl http://localhost:8000/api/admin/subscriptions/permanent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

curl http://localhost:8000/api/admin/subscriptions/temporary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Update a subscription:**
```bash
curl -X PUT http://localhost:8000/api/admin/subscriptions/permanent/perm_001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive"
  }'
```

**Delete a subscription:**
```bash
curl -X DELETE http://localhost:8000/api/admin/subscriptions/permanent/perm_001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get statistics:**
```bash
curl http://localhost:8000/api/admin/subscriptions/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Get JWT token first
const loginResponse = await fetch('http://localhost:8000/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'your-password' })
});
const { token } = await loginResponse.json();

// Add permanent subscription
const response = await fetch('http://localhost:8000/api/admin/subscriptions/permanent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    planNickname: 'all',
    notes: 'VIP customer'
  })
});

const result = await response.json();
console.log(result);
```

## Plan Nicknames

Available plan nicknames:
- `all` - Full access to all products
- `Prop Trade Planner` or `prop-trade-planner`
- `TradeRx` or `traderx`
- `JournalX` or `journalx`
- `TradeCam` or `tradecam`
- `Trade Video Recorder` or `trade-video-recorder`
- Any other custom plan name

## File Storage

Subscriptions are stored in JSON files:
- `backend/subscriptions/permanent_subscriptions.json`
- `backend/subscriptions/temporary_subscriptions.json`

The system automatically reloads the whitelist when subscriptions are modified through the API.

## Notes

1. Email addresses are automatically converted to lowercase for consistency
2. Temporary subscriptions show additional status flags (`isExpired`, `isActive`)
3. Subscription IDs are auto-generated (perm_001, perm_002, temp_001, etc.)
4. Changes take effect immediately - no server restart required
5. All actions are logged with the admin username who performed them
