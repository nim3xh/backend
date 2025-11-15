# 📋 Quick Reference - Subscription Email Tracking

## ✅ Simple Rule

```
Email + Subscription ID = Unique Combo

Combo doesn't exist? → ✉️ SEND EMAIL
Combo exists? → ⏭️ SKIP (already sent)
```

## 📁 Files Auto-Created

1. **subscription_emails_log.json** - JSON database
2. **subscription_emails_sent.csv** - CSV export for Excel

## 🔌 API Endpoints

```bash
# View all subscriptions
GET /subscription-emails

# View subscriptions for specific email
GET /subscription-emails/:email

# View statistics only
GET /subscription-emails-stats
```

## 🧪 Test It

```bash
node testSubscriptionTracking.js
```

## ⚙️ Enable Webhook

Currently **DISABLED** in `app.js`

To enable:
1. Open `app.js`
2. Remove `/*` at line ~14
3. Remove `*/` at line ~120
4. Save and `npm start`

## 📊 CSV Columns

```
Email, Subscription ID, Customer ID, Plan Name, Status, 
Amount, Currency, Duration, Period Start, Period End, 
Email Sent At, Created At
```

## 🔒 Testing Without Real Customers

Add to `.env`:
```env
TEST_EMAIL=your-test-email@example.com
```

All emails go to this address instead of real customers.

## 🎯 What Triggers Email

- ✅ New subscription (new subscription_id)
- ✅ Same email, different subscription (different subscription_id)
- ❌ Same email + same subscription_id (already sent)

## 📝 Data Format

Matches your exact format:
```json
{
  "source": "stripe",
  "email": "customer@example.com",
  "customer_id": "cus_xxxxx",
  "subscription_id": "sub_xxxxx",
  "status": "active",
  "subscription_start_date": "2025-11-13T03:39:02.000Z",
  "current_period_start": "2025-11-13T03:39:02.000Z",
  "current_period_end": "2025-12-13T03:39:02.000Z",
  "plan_id": "price_xxxxx",
  "plan_amount": "24.99",
  "currency": "usd",
  "planNickname": "TradeCam",
  "duration": "30 days",
  "email_sent_at": "2025-11-14T...",
  "created_at": "2025-11-14T..."
}
```

## 🚀 Production Checklist

- [ ] Run test: `node testSubscriptionTracking.js`
- [ ] Check generated files
- [ ] Remove `TEST_EMAIL` from `.env`
- [ ] Uncomment webhook in `app.js`
- [ ] Configure Stripe webhook endpoint
- [ ] Test with real subscription
- [ ] Monitor logs

## 📧 Email Service

Uses existing `emailService.js`:
- Professional HTML template
- Thank you message
- Product name
- Download link
- Getting started guide

## 🔍 View Records

**JSON:** Open `subscription_emails_log.json`

**CSV:** Open `subscription_emails_sent.csv` in Excel/Sheets

**API:** 
```bash
curl http://localhost:3000/subscription-emails
```

## ⚡ Key Features

- ✅ Automatic duplicate prevention
- ✅ Supports multiple subscriptions per email
- ✅ JSON + CSV export
- ✅ Real-time updates
- ✅ API endpoints
- ✅ Test mode
- ✅ Simple & reliable

## 📖 Documentation

- `FINAL_SUMMARY.txt` - Complete overview
- `STRIPE_EMAIL_SETUP.md` - Email setup guide
- `QUICK_SETUP.md` - Quick reference

---

**That's it! Simple and effective.** 🎉
