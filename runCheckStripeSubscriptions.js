require("dotenv").config();
const checkStripeSubscriptions = require("./checkStripeSubscriptions");

(async () => {
  try {
    await checkStripeSubscriptions();
    console.log("✅ Stripe subscriptions exported to CSV");
  } catch (err) {
    console.error("❌ Error exporting subscriptions:", err);
  }
})();
