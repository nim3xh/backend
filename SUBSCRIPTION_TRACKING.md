# 📊 Subscription Email Tracking System

## Overview

This system tracks ALL subscription emails sent, records customer subscription details, and intelligently handles:
- ✅ New subscriptions (sends email)
- ✅ Renewals after cancellation (sends email)  
- ✅ Status updates (tracks without sending duplicate emails)
- ✅ Cancellations (records status)
- ✅ Re-subscriptions (sends email again)

## How It Works

### Email Sending Rules

1. **New Subscription** → ✉️ SEND EMAIL
   - First time customer subscribes
   - Email sent and recorded

2. **Renewal After Cancellation** → ✉️ SEND EMAIL
   - Customer canceled, then re-subscribes
   - Treated as NEW subscription
   - Email sent and recorded

3. **Status Update (Same Subscription)** → ⏭️ NO EMAIL
   - Status changes like: trialing → active
   - Already sent email for this subscription
   - Just record status change

4. **Cancellation** → 📝 RECORD ONLY
   - Subscription canceled
   - No email sent
   - Status recorded for future reference

5. **Re-subscription After Cancel** → ✉️ SEND EMAIL
   - Customer cancels then subscribes again
   - Treated as NEW subscription
   - Email sent again

## Data Tracked Per Subscription

Each subscription record includes:

```json
{
  "email": "customer@example.com",
  "subscription_id": "sub_xxxxx",
  "customer_id": "cus_xxxxx",
  "plan_nickname": "Premium Plan",
  "product_id": "prod_xxxxx",
  "price_id": "price_xxxxx",
  "amount": 29.99,
  "currency": "usd",
  "last_status": "active",
  "current_period_start": "2025-11-14T00:00:00.000Z",
  "current_period_end": "2025-12-14T00:00:00.000Z",
  "duration": "30 days",
  "email_sent": true,
  "email_sent_at": "2025-11-14T12:00:00.000Z",
  "email_count": 1,
  "created_at": "2025-11-14T12:00:00.000Z",
  "updated_at": "2025-11-14T12:00:00.000Z",
  "status_history": [
    {
      "status": "active",
      "timestamp": "2025-11-14T12:00:00.000Z",
      "email_sent": true
    }
  ]
}
```

## Storage

All records are stored in: `subscription_emails_log.json`

This file is automatically created when the first subscription is processed.

## API Endpoints

### 1. Get All Subscription Records

```http
GET /subscription-emails
```

**Response:**
```json
{
  "success": true,
  "total": 5,
  "statistics": {
    "total_subscriptions": 5,
    "total_emails_sent": 7,
    "active_subscriptions": 3,
    "canceled_subscriptions": 2,
    "unique_customers": 4,
    "by_plan": {
      "Premium Plan": 3,
      "Basic Plan": 2
    }
  },
  "subscriptions": [...]
}
```

### 2. Get Records for Specific Email

```http
GET /subscription-emails/customer@example.com
```

**Response:**
```json
{
  "success": true,
  "email": "customer@example.com",
  "total": 2,
  "subscriptions": [...]
}
```

### 3. Get Statistics Only

```http
GET /subscription-emails-stats
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total_subscriptions": 5,
    "total_emails_sent": 7,
    "active_subscriptions": 3,
    "canceled_subscriptions": 2,
    "unique_customers": 4,
    "by_plan": {
      "Premium Plan": 3,
      "Basic Plan": 2
    }
  }
}
```

## Webhook Events Handled

The system now handles these Stripe webhook events:

- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription status change
- `customer.subscription.deleted` - Subscription canceled/deleted

## Example Scenarios

### Scenario 1: New Customer Subscribes

```
Customer subscribes → Webhook received → Check if exists (NO)
→ Send email → Record subscription
```

**Log Output:**
```
✅ Received Stripe webhook event: customer.subscription.created
📋 Subscription details:
   Email: john@example.com
   Product: Premium Plan
   Status: active
   Subscription ID: sub_xxxxx
✅ New subscription for john@example.com - Email will be sent
📧 Sending subscription email...
📝 Created new subscription record for john@example.com
✅ Subscription email sent and recorded successfully
```

### Scenario 2: Customer Cancels

```
Customer cancels → Webhook received → Update status to "canceled"
→ NO email sent → Record cancellation
```

**Log Output:**
```
✅ Received Stripe webhook event: customer.subscription.updated
📋 Subscription details:
   Email: john@example.com
   Product: Premium Plan
   Status: canceled
   Subscription ID: sub_xxxxx
⏭️ Email not needed - Status recorded
🚫 Subscription canceled - No email sent, status recorded
```

### Scenario 3: Customer Renews After Cancellation

```
Customer re-subscribes → Webhook received → Check status (was "canceled")
→ Send email (renewal) → Update record
```

**Log Output:**
```
✅ Received Stripe webhook event: customer.subscription.updated
📋 Subscription details:
   Email: john@example.com
   Product: Premium Plan
   Status: active
   Subscription ID: sub_xxxxx
✅ Renewal after cancellation for john@example.com - Email will be sent
📧 Sending subscription email...
📝 Updated subscription record for john@example.com
✅ Subscription email sent and recorded successfully
```

### Scenario 4: Status Update (Trialing → Active)

```
Subscription changes trialing → active → Webhook received
→ Already sent email → NO email sent → Update status only
```

**Log Output:**
```
✅ Received Stripe webhook event: customer.subscription.updated
📋 Subscription details:
   Email: john@example.com
   Product: Premium Plan
   Status: active
   Subscription ID: sub_xxxxx
⏭️ Email already sent for john@example.com - Skipping
📝 Updated subscription status for john@example.com: active
⏭️ Email not needed - Status recorded
```

## Testing

### Test Without Real Customers

1. Set in `.env`:
```env
TEST_EMAIL=your-test-email@example.com
```

2. All emails will go to this address instead of customer emails

### View Subscription Records

```bash
# View all records
curl http://localhost:3000/subscription-emails

# View records for specific email
curl http://localhost:3000/subscription-emails/customer@example.com

# View statistics only
curl http://localhost:3000/subscription-emails-stats
```

## Enable/Disable

### Currently: DISABLED

The webhook is currently commented out. To enable:

1. Open `app.js`
2. Remove the `/*` at line ~14 and `*/` at line ~120
3. Restart server: `npm start`

### To Disable Again:

1. Add `/*` before the webhook code
2. Add `*/` after the webhook code
3. Restart server

## Important Notes

### Email Count Tracking

- `email_count` tracks total emails sent per subscription
- Increments each time an email is sent
- Useful for tracking renewals

### Status History

- Every status change is recorded
- Includes timestamp and whether email was sent
- Useful for debugging and auditing

### Duration Calculation

- Automatically calculated from period start/end
- Formats as: "30 days", "3 months", "1 year"
- Updates on every status change

### Unique Subscription Tracking

- Each subscription ID is tracked separately
- Same customer can have multiple subscriptions
- Each subscription is treated independently

## File Structure

```
backend/
├── app.js                          # Main app with webhook
├── subscriptionTracker.js          # Tracking logic
├── emailService.js                 # Email functions
├── subscription_emails_log.json    # Auto-created database
└── SUBSCRIPTION_TRACKING.md        # This file
```

## Troubleshooting

### No records appearing

- Check if webhook is enabled (uncommented)
- Verify webhook is receiving events
- Check console logs for errors

### Emails sending multiple times

- Should not happen with this system
- Check `subscription_emails_log.json` for duplicates
- Review console logs for logic errors

### Records not updating

- Check file permissions on `subscription_emails_log.json`
- Verify tracker module is imported correctly
- Check for JSON parsing errors in logs

## Production Checklist

- [ ] Remove `TEST_EMAIL` from `.env`
- [ ] Uncomment webhook in `app.js`
- [ ] Configure Stripe webhook endpoint
- [ ] Set product download links
- [ ] Test with real subscription
- [ ] Monitor `subscription_emails_log.json` file size
- [ ] Set up log rotation if needed

## Security

- `subscription_emails_log.json` should be in `.gitignore`
- Contains customer emails and subscription data
- Back up regularly
- Consider encrypting sensitive data

## Future Enhancements

Possible additions:
- Database instead of JSON file
- Email templates per product
- Admin dashboard for viewing records
- Export to CSV functionality
- Automatic cleanup of old records
- Email retry logic
- Webhook event replay
