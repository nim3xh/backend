# 🧪 TEST MODE - Complete Guide

## What is Test Mode?

Test Mode is a **safety feature** that prevents emails from being sent to real customers. When enabled:

✅ **Stripe webhooks are IGNORED** - No processing of real subscriptions  
✅ **Only test email receives emails** - Set to `nim3xh@gmail.com`  
✅ **Manual testing available** - Use test endpoint to send emails  
✅ **All tracking still works** - Records saved to JSON and CSV  

## Enable Test Mode

Add to your `.env` file:

```env
TEST_MODE=true
TEST_EMAIL=nim3xh@gmail.com
```

## Test Mode Status

When `TEST_MODE=true`:
- ❌ Real Stripe webhook events are **IGNORED**
- ✅ You can send test emails via API endpoint
- ✅ All emails go to `TEST_EMAIL`
- ✅ Tracking still works (JSON + CSV)

When `TEST_MODE=false`:
- ✅ Real Stripe webhook events are **PROCESSED**
- ✅ Emails sent to actual customers
- ⚠️ Make sure webhook is uncommented in `app.js`

## Send Test Email

### Method 1: Using curl

```bash
npm start

# In another terminal:
curl -X POST http://localhost:3000/test-subscription-email \
  -H "Content-Type: application/json" \
  -d '{
    "planNickname": "TradeCam",
    "amount": "24.99",
    "downloadLink": "https://example.com/download/tradecam"
  }'
```

### Method 2: Using PowerShell

```powershell
npm start

# In another terminal:
Invoke-RestMethod -Uri http://localhost:3000/test-subscription-email `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"planNickname":"TradeCam","amount":"24.99","downloadLink":"https://example.com/download"}'
```

### Method 3: Using the helper script

```bash
node sendTestEmail.js
```

This will show you the commands to use.

## Test Endpoint Parameters

**POST** `/test-subscription-email`

**Body:**
```json
{
  "planNickname": "TradeCam",     // Required: Product name
  "amount": "24.99",               // Required: Price
  "downloadLink": "https://..."    // Optional: Download URL
}
```

**Response (Success):**
```json
{
  "success": true,
  "test_mode": true,
  "email_sent": true,
  "message": "Test email sent and recorded",
  "subscription": {
    "source": "test",
    "email": "nim3xh@gmail.com",
    "subscription_id": "sub_test_1731564123456",
    "planNickname": "TradeCam",
    "plan_amount": "24.99",
    ...
  }
}
```

## What Happens in Test Mode

1. **Server Starts**
   ```
   npm start
   ```

2. **Stripe Webhook Received** (if uncommented)
   ```
   🧪 TEST MODE ENABLED - Webhook ignored
   ⚠️ No emails will be sent to real customers
   💡 Set TEST_MODE=false in .env to enable real webhook processing
   ```

3. **Test Email Sent via API**
   ```
   🧪 TEST MODE: Sending test subscription email
      To: nim3xh@gmail.com
      Plan: TradeCam
      Amount: $24.99
   ✅ Test subscription email sent successfully
   ```

4. **Records Created**
   - Added to `subscription_emails_log.json`
   - Added to `subscription_emails_sent.csv`

## Verify Test Mode is Working

### Check Server Logs

When webhook is triggered (if uncommented):
```
🧪 TEST MODE ENABLED - Webhook ignored
⚠️ No emails will be sent to real customers
```

### Try Test Endpoint Without Test Mode

If `TEST_MODE=false`, you'll get:
```json
{
  "success": false,
  "error": "Test mode is not enabled. Set TEST_MODE=true in .env to use this endpoint."
}
```

## Safety Features

✅ **Double Protection**
1. `TEST_MODE=true` → Webhooks ignored
2. `TEST_EMAIL` set → All emails go to test address

✅ **Clear Logging**
- Console shows "TEST MODE ENABLED"
- Easy to see when test mode is active

✅ **Can't Accidentally Email Customers**
- Real webhook data is ignored
- Only manual test endpoint works

## Testing Workflow

### 1. Enable Test Mode
```env
# .env
TEST_MODE=true
TEST_EMAIL=nim3xh@gmail.com
```

### 2. Start Server
```bash
npm start
```

### 3. Send Test Email
```bash
curl -X POST http://localhost:3000/test-subscription-email \
  -H "Content-Type: application/json" \
  -d '{"planNickname":"TradeCam","amount":"24.99"}'
```

### 4. Check Email
- Open inbox for `nim3xh@gmail.com`
- Should receive professional subscription email

### 5. Verify Records
```bash
# View JSON
cat subscription_emails_log.json

# View CSV
# Open subscription_emails_sent.csv in Excel
```

### 6. Check via API
```bash
curl http://localhost:3000/subscription-emails
```

## Go to Production

When ready to enable real subscriptions:

### 1. Update .env
```env
TEST_MODE=false
# Remove or comment out TEST_EMAIL
```

### 2. Uncomment Webhook
Open `app.js`, find and remove the `/*` and `*/` around the webhook code.

### 3. Configure Stripe Webhook
- Add endpoint in Stripe Dashboard
- Set webhook URL: `https://your-domain.com/stripe/webhook`
- Select events: `customer.subscription.created`, `customer.subscription.updated`

### 4. Restart Server
```bash
npm start
```

### 5. Test with Real Subscription
Create a test subscription in Stripe and verify email is sent to actual customer.

## Troubleshooting

### Test endpoint not working

**Error:** "Test mode is not enabled"

**Fix:** Add to `.env`:
```env
TEST_MODE=true
```

### Email not received

**Check:**
1. Is `GMAIL_USER` set in `.env`?
2. Is `GMAIL_APP_PASSWORD` set in `.env`?
3. Check spam folder
4. Check console logs for errors

### Webhook still processing real data

**Fix:** Make sure `TEST_MODE=true` in `.env`

### Records not saving

**Check:**
- File permissions
- Disk space
- Console logs for errors

## Environment Variables

```env
# Test Mode Configuration
TEST_MODE=true                    # Enable/disable test mode
TEST_EMAIL=nim3xh@gmail.com      # Test email address

# Required for emails
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Optional
DEFAULT_DOWNLOAD_LINK=https://example.com/download
```

## Quick Commands

```bash
# Check if test mode is enabled
grep TEST_MODE .env

# Send test email (after npm start)
curl -X POST http://localhost:3000/test-subscription-email \
  -H "Content-Type: application/json" \
  -d '{"planNickname":"Test Plan","amount":"9.99"}'

# View all subscription records
curl http://localhost:3000/subscription-emails

# View records for test email
curl http://localhost:3000/subscription-emails/nim3xh@gmail.com
```

## Summary

✅ **Test Mode Enabled:** Safe to test, no customer emails  
✅ **Manual Test Endpoint:** Send emails to test address  
✅ **Full Tracking:** JSON + CSV records still work  
✅ **Easy to Disable:** Set `TEST_MODE=false` when ready  

**Perfect for development and testing!** 🎉
