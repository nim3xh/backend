/**
 * CSV Email Watcher
 * 
 * Monitors stripe/subscriptions.csv for changes and automatically sends
 * subscription confirmation emails to new customers.
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { sendSubscriptionEmail } = require("./emailService");
const { shouldSendEmail, recordEmailSent } = require("./subscriptionTracker");
const { getDownloadLinkByPlanNickname } = require("./productLinkMapper");

const CSV_FILE_PATH = path.join(__dirname, "stripe", "subscriptions.csv");
const WATCH_INTERVAL = 5000; // Check every 5 seconds

let lastProcessedData = new Set();
let isProcessing = false;

/**
 * Read and parse CSV file
 */
function readCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.log("📄 CSV file not found yet:", CSV_FILE_PATH);
      return resolve([]);
    }

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Process a subscription row and send email if needed
 */
async function processSubscription(row) {
  const email = row.Email?.trim();
  const subscriptionId = row["Subscription ID"]?.trim();
  const status = row.Status?.trim();
  const planNickname = row["Plan Nickname"]?.trim() || "Your Subscription";
  const customerName = email ? email.split("@")[0] : "Valued Customer";

  try {
    // Skip if no email or subscription ID
    if (!email || !subscriptionId) {
      return;
    }

    // Only process active or trialing subscriptions
    if (status !== "active" && status !== "trialing") {
      console.log(`⏭️ Skipping ${email} - Status: ${status}`);
      return;
    }

    // Create unique identifier for this subscription
    const subscriptionKey = `${email}:${subscriptionId}`;

    // Skip if already processed in this session
    if (lastProcessedData.has(subscriptionKey)) {
      return;
    }

    // Check if email should be sent (checks database)
    const shouldSend = shouldSendEmail(email, subscriptionId);

    if (!shouldSend) {
      console.log(`⏭️ Email already sent for ${email} (${subscriptionId})`);
      lastProcessedData.add(subscriptionKey);
      return;
    }

    console.log(`\n📧 New subscription detected!`);
    console.log(`   Email: ${email}`);
    console.log(`   Plan: ${planNickname}`);
    console.log(`   Status: ${status}`);
    console.log(`   Subscription ID: ${subscriptionId}`);

    // Prepare subscription data for recording
    const subscriptionData = {
      source: "csv_watcher",
      email: email,
      customer_id: row["Customer ID"]?.trim() || "N/A",
      subscription_id: subscriptionId,
      status: status,
      subscription_start_date: row["Subscription Start Date"]?.trim() || null,
      current_period_start: row["Current Period Start"]?.trim() || null,
      current_period_end: row["Current Period End"]?.trim() || null,
      plan_id: row["Plan ID"]?.trim() || "N/A",
      plan_amount: row["Plan Amount (USD)"]?.trim() || "0.00",
      currency: row.Currency?.trim() || "usd",
      planNickname: planNickname,
    };

    // Mark as processed in session BEFORE sending to prevent duplicates
    lastProcessedData.add(subscriptionKey);

    // Get download link based on Plan Nickname
    const downloadLink = getDownloadLinkByPlanNickname(planNickname);

    // Send email
    await sendSubscriptionEmail({
      to: email,
      productName: planNickname,
      downloadLink: downloadLink,
      customerName: customerName,
    });

    // Record email sent to persistent storage
    recordEmailSent(subscriptionData);

    console.log(`✅ Email sent and recorded for ${email}\n`);
  } catch (error) {
    console.error(`❌ Error processing subscription for ${email}:`, error.message);
    
    // Even if email fails, add to session processed list to prevent retry loops
    // The subscription is in the CSV, so they can always contact support
    const subscriptionKey = `${email}:${subscriptionId}`;
    lastProcessedData.add(subscriptionKey);
    
    console.warn(`⚠️ Marked ${subscriptionKey} as processed to prevent retry loops`);
  }
}

/**
 * Check CSV file for new subscriptions
 */
async function checkForNewSubscriptions() {
  if (isProcessing) {
    return; // Skip if already processing
  }

  isProcessing = true;

  try {
    const subscriptions = await readCSV();

    if (subscriptions.length === 0) {
      isProcessing = false;
      return;
    }

    // Process each subscription sequentially with built-in rate limiting
    // The emailService already has rate limiting, so this will be throttled automatically
    for (const subscription of subscriptions) {
      await processSubscription(subscription);
      // Note: Rate limiting is handled in emailService.js
    }
  } catch (error) {
    console.error("❌ Error checking CSV file:", error.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Initialize the CSV watcher
 */
function startWatcher() {
  console.log("\n🔍 CSV Email Watcher Started");
  console.log(`📁 Watching: ${CSV_FILE_PATH}`);
  console.log(`⏱️  Check interval: ${WATCH_INTERVAL / 1000} seconds\n`);

  // Initial check
  checkForNewSubscriptions();

  // Set up interval to check periodically
  setInterval(checkForNewSubscriptions, WATCH_INTERVAL);
}

/**
 * Stop the watcher (for graceful shutdown)
 */
function stopWatcher() {
  console.log("\n🛑 CSV Email Watcher Stopped\n");
  // Clear interval if needed
}

module.exports = {
  startWatcher,
  stopWatcher,
  checkForNewSubscriptions,
};
