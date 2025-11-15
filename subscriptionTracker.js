/**
 * Subscription Email Tracker - Simplified
 * 
 * Tracks subscription emails sent to users based on:
 * - Email + Subscription ID combination
 * - If combo exists → DON'T send email
 * - If combo is new → SEND email and record
 * 
 * Simple rule: One email per unique subscription_id
 */

const fs = require("fs");
const path = require("path");

const TRACKER_FILE = path.join(__dirname, "subscription_emails_log.json");
const CSV_FILE = path.join(__dirname, "subscription_emails_sent.csv");

/**
 * Initialize tracker file if it doesn't exist
 */
function initializeTrackerFile() {
  if (!fs.existsSync(TRACKER_FILE)) {
    fs.writeFileSync(TRACKER_FILE, JSON.stringify({ subscriptions: [] }, null, 2));
    console.log("📁 Created subscription tracker file:", TRACKER_FILE);
  }
  
  // Initialize CSV file with headers if it doesn't exist
  if (!fs.existsSync(CSV_FILE)) {
    const headers = "Email,Subscription ID,Customer ID,Plan Name,Status,Amount,Currency,Duration,Period Start,Period End,Email Sent At,Created At\n";
    fs.writeFileSync(CSV_FILE, headers, "utf8");
    console.log("📁 Created CSV tracker file:", CSV_FILE);
  }
}

/**
 * Read all subscription records
 */
function readSubscriptions() {
  initializeTrackerFile();
  const data = fs.readFileSync(TRACKER_FILE, "utf8");
  return JSON.parse(data);
}

/**
 * Write subscription records
 */
function writeSubscriptions(data) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
}

/**
 * Find existing subscription record
 * 
 * @param {string} email - Customer email
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {object|null} - Subscription record or null
 */
function findSubscription(email, subscriptionId) {
  const data = readSubscriptions();
  return data.subscriptions.find(
    (sub) => sub.email === email && sub.subscription_id === subscriptionId
  );
}

/**
 * Find all subscriptions for an email
 * 
 * @param {string} email - Customer email
 * @returns {array} - Array of subscription records
 */
function findSubscriptionsByEmail(email) {
  const data = readSubscriptions();
  return data.subscriptions.filter((sub) => sub.email === email);
}

/**
 * Check if email should be sent for this subscription
 * 
 * Simple Rule: If email + subscription_id combo doesn't exist → SEND
 *             If it exists → DON'T SEND
 * 
 * @param {string} email - Customer email
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {boolean} - True if email should be sent
 */
function shouldSendEmail(email, subscriptionId) {
  const existing = findSubscription(email, subscriptionId);
  
  if (!existing) {
    console.log(`✅ New subscription for ${email} (${subscriptionId}) - Email will be sent`);
    return true;
  }
  
  console.log(`⏭️ Subscription already exists for ${email} (${subscriptionId}) - Email already sent on ${existing.email_sent_at}`);
  return false;
}

/**
 * Record a subscription email being sent
 * 
 * @param {object} data - Subscription data matching Stripe response format
 * @returns {object} - Created record
 */
function recordEmailSent(data) {
  const tracker = readSubscriptions();
  const existing = findSubscription(data.email, data.subscription_id);
  
  if (existing) {
    console.log(`⚠️ Record already exists for ${data.email} - ${data.subscription_id}`);
    return existing;
  }
  
  const now = new Date().toISOString();
  const duration = calculateDuration(data.current_period_start, data.current_period_end);
  
  // Create new record matching the format you provided
  const newRecord = {
    source: "stripe",
    email: data.email,
    customer_id: data.customer_id,
    subscription_id: data.subscription_id,
    status: data.status,
    subscription_start_date: data.subscription_start_date || data.current_period_start,
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    plan_id: data.plan_id,
    plan_amount: data.plan_amount,
    currency: data.currency,
    planNickname: data.planNickname,
    duration: duration,
    email_sent_at: now,
    created_at: now,
  };
  
  tracker.subscriptions.push(newRecord);
  writeSubscriptions(tracker);
  
  // Also append to CSV
  appendToCSV(newRecord);
  
  console.log(`📝 Created subscription record for ${data.email} - ${data.planNickname}`);
  return newRecord;
}

/**
 * Append record to CSV file
 * 
 * @param {object} record - Subscription record
 */
function appendToCSV(record) {
  try {
    const row = [
      record.email,
      record.subscription_id,
      record.customer_id,
      `"${record.planNickname}"`, // Quote to handle commas
      record.status,
      record.plan_amount,
      record.currency,
      record.duration,
      record.current_period_start,
      record.current_period_end,
      record.email_sent_at,
      record.created_at,
    ].join(",") + "\n";
    
    fs.appendFileSync(CSV_FILE, row, "utf8");
    console.log(`� Added record to CSV: ${CSV_FILE}`);
  } catch (error) {
    console.error("❌ Error writing to CSV:", error.message);
  }
}

/**
 * Calculate duration between two dates
 * 
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {string} - Duration string (e.g., "30 days", "1 month", "1 year")
 */
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 31) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"}`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
}

/**
 * Get all subscription records
 * 
 * @returns {array} - Array of all subscription records
 */
function getAllSubscriptions() {
  const data = readSubscriptions();
  return data.subscriptions;
}

/**
 * Get subscription statistics
 * 
 * @returns {object} - Statistics object
 */
function getStatistics() {
  const data = readSubscriptions();
  const subs = data.subscriptions;
  
  return {
    total_subscriptions: subs.length,
    total_emails_sent: subs.length, // Each record = 1 email sent
    active_subscriptions: subs.filter(sub => sub.status === "active" || sub.status === "trialing").length,
    unique_customers: new Set(subs.map(sub => sub.email)).size,
    by_plan: subs.reduce((acc, sub) => {
      acc[sub.planNickname] = (acc[sub.planNickname] || 0) + 1;
      return acc;
    }, {}),
  };
}

/**
 * Clear all subscription records (use with caution!)
 */
function clearAllRecords() {
  writeSubscriptions({ subscriptions: [] });
  // Also clear CSV (keep headers)
  const headers = "Email,Subscription ID,Customer ID,Plan Name,Status,Amount,Currency,Duration,Period Start,Period End,Email Sent At,Created At\n";
  fs.writeFileSync(CSV_FILE, headers, "utf8");
  console.log("🗑️ All subscription records cleared");
}

module.exports = {
  shouldSendEmail,
  recordEmailSent,
  findSubscription,
  findSubscriptionsByEmail,
  getAllSubscriptions,
  getStatistics,
  calculateDuration,
  clearAllRecords,
};
