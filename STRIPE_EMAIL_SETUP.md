# Stripe Subscription Email Automation

This system automatically sends professional thank you emails with product download links when customers subscribe via Stripe.

## Features

- 🎉 Automatic email on new subscription
- 📧 Professional HTML email template
- 🔒 Test mode (override emails during testing)
- 📦 Product-specific download links
- ✅ Stripe webhook verification

## Setup Instructions

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Required variables:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret
- `GMAIL_USER` - Your Gmail address
- `GMAIL_APP_PASSWORD` - Gmail App Password (not regular password)

Optional (for testing):
- `TEST_EMAIL` - Override recipient email to this address during testing
- `PRODUCT_DOWNLOAD_LINK_<product_id>` - Specific download links per product
- `DEFAULT_DOWNLOAD_LINK` - Fallback download link

### 2. Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/stripe/webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
5. Copy the "Signing secret" and add it to `.env` as `STRIPE_WEBHOOK_SECRET`

### 3. Configure Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to Security → 2-Step Verification → App passwords
4. Generate a new app password for "Mail"
5. Copy the password to `.env` as `GMAIL_APP_PASSWORD`

### 4. Configure Product Download Links

You have three options for setting download links:

#### Option 1: Environment Variables (Recommended for testing)
In your `.env` file:
```
PRODUCT_DOWNLOAD_LINK_prod_1234567890=https://example.com/download/product1
PRODUCT_DOWNLOAD_LINK_prod_abcdefghij=https://example.com/download/product2
DEFAULT_DOWNLOAD_LINK=https://example.com/downloads
```

#### Option 2: Product Metadata in Stripe
Add a `download_link` field to your product metadata in the Stripe Dashboard.

#### Option 3: Default Link
Set `DEFAULT_DOWNLOAD_LINK` as a fallback for all products.

### 5. Testing Without Real Customer Emails

To test without sending emails to real customers:

1. Set `TEST_EMAIL` in your `.env` file:
   ```
   TEST_EMAIL=your-test-email@example.com
   ```

2. All subscription emails will be sent to this address instead of the actual customer email.

3. When ready for production, remove or comment out the `TEST_EMAIL` variable.

## How It Works

1. Customer subscribes via Stripe
2. Stripe sends a webhook event to `/stripe/webhook`
3. System verifies the webhook signature
4. If subscription is active/trialing:
   - Fetches customer details (email, name)
   - Fetches product details (name, ID)
   - Determines download link (from env vars, metadata, or default)
   - Sends professional HTML email with:
     - Thank you message
     - Product name
     - Download button/link
     - Getting started instructions

## Webhook Events Handled

- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription status changed

Emails are only sent for subscriptions with status:
- `active`
- `trialing`

## Email Template

The email includes:
- Professional gradient header
- Personalized greeting
- Product information box
- Download button
- Getting started guide
- Professional footer

## Testing the Webhook Locally

For local testing, use Stripe CLI:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/stripe/webhook

# Copy the webhook signing secret to .env
```

## Manual Testing Endpoint

Test the email service directly:

```bash
POST http://localhost:3000/send-test-email
Content-Type: application/json

{
  "to": "test@example.com"
}
```

## Troubleshooting

### Emails not sending
- Check Gmail credentials in `.env`
- Verify Gmail App Password (not regular password)
- Check console logs for error messages

### Webhook not triggering
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint is accessible from internet
- Check Stripe Dashboard → Webhooks for failed attempts

### Wrong recipient email
- Check if `TEST_EMAIL` is set in `.env`
- Verify customer has email in Stripe

### Download link not working
- Check product ID in console logs
- Verify environment variable naming: `PRODUCT_DOWNLOAD_LINK_<product_id>`
- Check `DEFAULT_DOWNLOAD_LINK` is set

## Production Checklist

- [ ] Remove or comment out `TEST_EMAIL` from `.env`
- [ ] Configure product-specific download links
- [ ] Set up proper SSL/HTTPS for webhook endpoint
- [ ] Verify webhook endpoint is publicly accessible
- [ ] Test with a real subscription
- [ ] Monitor console logs for errors

## Support

For issues or questions, check the console logs for detailed error messages and troubleshooting information.
