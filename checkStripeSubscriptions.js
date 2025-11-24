// checkStripeSubscriptions.js
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { markSubscriptionCancelled, getAllSubscriptions } = require("./subscriptionTracker");
require("dotenv").config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const centsToDollars = (cents) => (cents / 100).toFixed(2);

const checkStripeSubscriptions = async () => {
  try {
    const subscriptions = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const result = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter || undefined,
      });

      for (const sub of result.data) {
        const item = sub.items.data[0]; // First subscription item
        const plan = item?.plan || {};

        // Fetch customer email
        let customerEmail = "N/A";
        try {
          const customer = await stripe.customers.retrieve(sub.customer);
          customerEmail = customer.email || "N/A";
        } catch (err) {
          console.warn(
            `Failed to fetch email for customer ${sub.customer}: ${err.message}`
          );
        }

        // Fetch product name as a better fallback to plan.nickname
        let planNickname = plan.nickname || "N/A";
        if (plan.product) {
          try {
            const product = await stripe.products.retrieve(plan.product);
            planNickname = product.name || plan.nickname || "N/A";
          } catch (err) {
            console.warn(
              `Failed to fetch product for plan ${plan.id}: ${err.message}`
            );
          }
        }

        subscriptions.push({
          customer_id: sub.customer,
          email: customerEmail,
          subscription_id: sub.id,
          status: sub.status,
          subscription_start_date: sub.start_date
            ? new Date(sub.start_date * 1000).toISOString()
            : "N/A",
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : "N/A",
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : "N/A",
          plan_id: plan.id || "N/A",
          plan_nickname: planNickname,
          plan_amount:
            plan.amount !== undefined ? centsToDollars(plan.amount) : "N/A",
          currency: plan.currency || "N/A",
        });
      }

      hasMore = result.has_more;
      if (hasMore) startingAfter = result.data[result.data.length - 1].id;
    }


    // Ensure stripe folder exists
    const folderPath = path.join(__dirname, "stripe");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Write CSV file
    const csvFilePath = path.join(folderPath, "subscriptions.csv");
    const header = [
      "Customer ID",
      "Email",
      "Subscription ID",
      "Status",
      "Subscription Start Date",
      "Current Period Start",
      "Current Period End",
      "Plan ID",
      "Plan Nickname",
      "Plan Amount (USD)",
      "Currency",
    ].join(",") + "\n";

    console.log('subscriptions', subscriptions);
    const rows = subscriptions
      .map((s) =>
        [
          s.customer_id,
          s.email,
          s.subscription_id,
          s.status,
          s.subscription_start_date,
          s.current_period_start,
          s.current_period_end,
          s.plan_id,
          s.plan_nickname,
          s.plan_amount,
          s.currency,
        ]
          .map((field) =>
            // Escape commas or quotes for CSV compliance
            typeof field === "string" && field.includes(",")
              ? `"${field.replace(/"/g, '""')}"`
              : field
          )
          .join(",")
      )
      .join("\n");

    fs.writeFileSync(csvFilePath, header + rows, "utf8");
    console.log(`Stripe subscription data saved to ${csvFilePath}`);
    
    // Check for cancelled subscriptions and mark them in tracker
    detectCancelledSubscriptions(subscriptions);
    
  } catch (error) {
    console.error("Error fetching Stripe subscriptions:", error.message);
  }
};

/**
 * Detect cancelled subscriptions by comparing current Stripe data with tracker
 */
function detectCancelledSubscriptions(currentSubscriptions) {
  try {
    const trackedSubs = getAllSubscriptions();
    const currentSubIds = new Set(currentSubscriptions.map(s => s.subscription_id));
    
    // Find subscriptions that were tracked but are no longer in Stripe (or are cancelled)
    for (const tracked of trackedSubs) {
      // Skip if already marked as cancelled
      if (tracked.is_cancelled) {
        continue;
      }
      
      // Check if subscription no longer exists in current data
      const currentSub = currentSubscriptions.find(s => s.subscription_id === tracked.subscription_id);
      
      if (!currentSub || currentSub.status === "canceled" || currentSub.status === "cancelled") {
        console.log(`🔍 Detected cancelled subscription: ${tracked.email} - ${tracked.subscription_id}`);
        markSubscriptionCancelled(tracked.email, tracked.subscription_id);
      }
    }
  } catch (error) {
    console.error("❌ Error detecting cancelled subscriptions:", error.message);
  }
}

module.exports = checkStripeSubscriptions;
