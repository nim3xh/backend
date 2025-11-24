# Subscription Management System

This directory contains JSON files for managing user subscriptions through the admin panel.

## Files

### `permanent_subscriptions.json`
Contains permanent whitelist entries - users with indefinite access to specified plans.

### `temporary_subscriptions.json`
Contains temporary whitelist entries - users with time-limited access to specified plans.

## JSON Structure

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

## Fields

- **id**: Unique identifier (perm_XXX for permanent, temp_XXX for temporary)
- **email**: User's email address
- **planNickname**: Plan access ("all" for full access, or specific plan name)
- **startDate**: (Temporary only) When access begins
- **endDate**: (Temporary only) When access expires
- **addedDate**: When the subscription was added
- **addedBy**: Admin username who added it
- **notes**: Optional notes about the subscription
- **status**: "active" or "inactive"

## API Endpoints

### Get All Subscriptions
- **GET** `/api/admin/subscriptions/permanent`
- **GET** `/api/admin/subscriptions/temporary`

### Add Subscription
- **POST** `/api/admin/subscriptions/permanent`
- **POST** `/api/admin/subscriptions/temporary`

### Update Subscription
- **PUT** `/api/admin/subscriptions/permanent/:id`
- **PUT** `/api/admin/subscriptions/temporary/:id`

### Delete Subscription
- **DELETE** `/api/admin/subscriptions/permanent/:id`
- **DELETE** `/api/admin/subscriptions/temporary/:id`

### Get Statistics
- **GET** `/api/admin/subscriptions/stats`

All admin endpoints require JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```
