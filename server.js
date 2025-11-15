// server.js
const app = require("./app");
const cron = require("node-cron");
const checkStripeSubscriptions = require("./checkStripeSubscriptions");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Activation backend listening on port ${PORT}`);
});

// Run every 1 minutes
cron.schedule("*/1 * * * *", async () => {
  console.log("[CRON] Running Stripe subscription export...");
  try {
    await checkStripeSubscriptions();
    console.log("[CRON] Finished Stripe subscription export.");
  } catch (err) {
    console.error("[CRON] Error in Stripe subscription export:", err.message);
  }
});
