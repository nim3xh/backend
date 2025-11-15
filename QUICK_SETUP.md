# Quick Setup Guide for Stripe Subscription Email Automation

## Step 1: Add to your .env file

```env
# REQUIRED: Stripe webhook signing secret
# Get this from: Stripe Dashboard → Developers → Webhooks → (your webhook) → Signing secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# REQUIRED FOR TESTING: Override recipient email
# All subscription emails will go here instead of real customer emails
TEST_EMAIL=your-test-email@example.com

# OPTIONAL: Product-specific download links
# Replace prod_xxxxx with your actual Stripe product IDs
PRODUCT_DOWNLOAD_LINK_prod_xxxxxxxxxxxxx=https://your-website.com/download/product1
PRODUCT_DOWNLOAD_LINK_prod_yyyyyyyyyyyyy=https://your-website.com/download/product2

# REQUIRED: Default download link (fallback)
DEFAULT_DOWNLOAD_LINK=https://your-website.com/downloads
```

## Step 2: Set Up Stripe Webhook

### For Production:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/stripe/webhook`
4. Select events:
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
5. Copy the "Signing secret" → Add to .env as `STRIPE_WEBHOOK_SECRET`

### For Local Testing:
```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/stripe/webhook

# The CLI will output a webhook signing secret - add it to .env
```

## Step 3: Find Your Product IDs

To get your Stripe product IDs for download links:

1. Go to: https://dashboard.stripe.com/products
2. Click on a product
3. The URL will show the product ID: `prod_xxxxxxxxxxxxx`
4. Add to .env: `PRODUCT_DOWNLOAD_LINK_prod_xxxxxxxxxxxxx=https://...`

## Step 4: Test the Email

Run the test script:
```bash
node testSubscriptionEmail.js
```

## Step 5: Test with Real Stripe Event

### Option A: Stripe CLI (Local Testing)
```bash
# Terminal 1: Start your server
npm start

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/stripe/webhook

# Terminal 3: Trigger test subscription
stripe trigger customer.subscription.created
```

### Option B: Stripe Dashboard (Production)
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook
3. Click "Send test webhook"
4. Select "customer.subscription.created"
5. Click "Send test webhook"

## Step 6: Go Live

When ready for production:
1. **REMOVE** or comment out `TEST_EMAIL` from .env
2. Verify webhook URL is accessible from internet
3. Test with a real subscription
4. Monitor logs for any errors

## Common Issues

### "Webhook signature verification failed"
- Wrong `STRIPE_WEBHOOK_SECRET` in .env
- Using webhook secret from wrong endpoint
- Body parser issue (should use express.raw for webhook route)

### Email not sending
- Check `GMAIL_USER` and `GMAIL_APP_PASSWORD` in .env
- Must use Gmail App Password (not regular password)
- Need 2-Step Verification enabled on Gmail

### Email going to wrong address
- Check if `TEST_EMAIL` is still set in .env
- Verify customer has email in Stripe

### Download link not working
- Check product ID format: `PRODUCT_DOWNLOAD_LINK_prod_xxxxx`
- Verify `DEFAULT_DOWNLOAD_LINK` is set
- Check console logs for product ID

## Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | ✅ Yes | Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | ✅ Yes | Verify webhook signatures |
| `GMAIL_USER` | ✅ Yes | Gmail account for sending |
| `GMAIL_APP_PASSWORD` | ✅ Yes | Gmail app password |
| `TEST_EMAIL` | ⚠️ Testing only | Override recipient for testing |
| `PRODUCT_DOWNLOAD_LINK_*` | ❌ Optional | Product-specific download links |
| `DEFAULT_DOWNLOAD_LINK` | ✅ Yes | Fallback download link |

## Need Help?

Check the detailed guide: `STRIPE_EMAIL_SETUP.md`
