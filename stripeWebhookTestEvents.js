/**
 * Stripe Webhook Test Events
 * 
 * Use these with Stripe CLI to test the webhook locally:
 * stripe trigger customer.subscription.created
 * 
 * Or send custom test events using the Stripe Dashboard
 */

// Example subscription.created event payload
const exampleSubscriptionCreatedEvent = {
  "id": "evt_test_webhook",
  "object": "event",
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_test123",
      "object": "subscription",
      "customer": "cus_test123",
      "status": "active",
      "items": {
        "data": [
          {
            "id": "si_test123",
            "price": {
              "id": "price_test123",
              "product": "prod_test123",
              "unit_amount": 2999,
              "currency": "usd"
            }
          }
        ]
      }
    }
  }
};

// Example subscription.updated event payload
const exampleSubscriptionUpdatedEvent = {
  "id": "evt_test_webhook",
  "object": "event",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_test123",
      "object": "subscription",
      "customer": "cus_test123",
      "status": "active",
      "items": {
        "data": [
          {
            "id": "si_test123",
            "price": {
              "id": "price_test123",
              "product": "prod_test123",
              "unit_amount": 2999,
              "currency": "usd"
            }
          }
        ]
      }
    }
  }
};

console.log("📋 Stripe Webhook Test Events");
console.log("================================\n");

console.log("To test locally with Stripe CLI:");
console.log("1. Install Stripe CLI: https://stripe.com/docs/stripe-cli");
console.log("2. Login: stripe login");
console.log("3. Forward webhooks: stripe listen --forward-to localhost:3000/stripe/webhook");
console.log("4. Trigger test event: stripe trigger customer.subscription.created\n");

console.log("Example events:");
console.log("\n--- Subscription Created ---");
console.log(JSON.stringify(exampleSubscriptionCreatedEvent, null, 2));

console.log("\n--- Subscription Updated ---");
console.log(JSON.stringify(exampleSubscriptionUpdatedEvent, null, 2));

module.exports = {
  exampleSubscriptionCreatedEvent,
  exampleSubscriptionUpdatedEvent,
};
