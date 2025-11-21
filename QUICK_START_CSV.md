# 🚀 Quick Start - CSV Email System

## ✅ System is Ready!

Automatic emails are now enabled and will be sent when the Stripe CSV is updated.

---

## Start the Server

```bash
npm start
```

You should see:
```
Activation backend listening on port 3000
🔍 CSV Email Watcher Started
📁 Watching: [path]/stripe/subscriptions.csv
⏱️  Check interval: 5 seconds
```

---

## How It Works

1. **Every 1 minute**: Cron job exports Stripe subscriptions → `stripe/subscriptions.csv`
2. **Every 5 seconds**: CSV watcher checks for new subscriptions
3. **When found**: Automatic email sent to customer
4. **Tracking**: Email recorded to prevent duplicates

---

## Test Commands

### Test CSV Watcher
```bash
npm run test:csv-watcher
```

### Test Email Service
```bash
npm run test:email
```

### Force Export Subscriptions
```bash
npm run subscriptions:export
```

### View Sent Emails
```bash
curl http://localhost:3000/subscription-emails
```

---

## What to Watch For

### Success Messages ✅
```
📧 New subscription detected!
   Email: customer@example.com
   Plan: TradeCam
   Status: active
✅ Email sent and recorded
```

### Cron Job Running 🕐
```
[CRON] Running Stripe subscription export...
[CRON] Finished Stripe subscription export.
```

### Already Sent ⏭️
```
⏭️ Email already sent for customer@example.com
```

---

## Files Created

- ✅ `csvEmailWatcher.js` - Monitors CSV and sends emails
- ✅ `testCsvWatcher.js` - Test script
- ✅ `CSV_EMAIL_SYSTEM.md` - Full documentation
- ✅ Updated `server.js` - Integrated watcher
- ✅ Updated `.env` - Cleaned up config

---

## Configuration (.env)

```env
STRIPE_SECRET_KEY='your_key'
GMAIL_USER='your_email@gmail.com'
GMAIL_APP_PASSWORD='your_app_password'
DEFAULT_DOWNLOAD_LINK='https://app.technests.ai/download/proptraderpro'
PORT=3000
```

---

## Email Features

✅ Professional HTML template
✅ Personalized with customer name
✅ Product name and download link
✅ Getting started guide
✅ Duplicate prevention
✅ Automatic tracking

---

## Advantages

✅ No webhook setup needed
✅ No SSL/HTTPS required
✅ Works on localhost
✅ Easy to test
✅ Reliable - checks periodically
✅ Simple debugging

---

## Monitoring

### Check if CSV exists
```bash
ls stripe/subscriptions.csv
```

### View CSV content
```bash
cat stripe/subscriptions.csv
```

### View email tracking
```bash
cat subscription_emails_log.json
```

---

## Next Steps

1. ✅ Start server: `npm start`
2. 👀 Watch logs for CSV updates
3. 📧 Emails sent automatically
4. 📊 Monitor at `/subscription-emails`

---

## Full Documentation

See `CSV_EMAIL_SYSTEM.md` for complete details.

---

**Status**: ✅ Ready to Use
**No Webhook Required**
**Date**: November 21, 2025
