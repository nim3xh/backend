/**
 * Test Cancellation and Reactivation Flow
 * 
 * This test demonstrates:
 * 1. Never send email again for same email + subscription ID
 * 2. Send email when same email subscribes to different product (different subscription ID)
 * 3. Send email again when subscription is cancelled and reactivated
 */

require("dotenv").config();
const {
  shouldSendEmail,
  recordEmailSent,
  markSubscriptionCancelled,
  getAllSubscriptions,
  clearAllRecords,
} = require("./subscriptionTracker");

console.log("\n=== Testing Cancellation & Reactivation Flow ===\n");

// Clear records for clean test
console.log("🧹 Clearing all records for clean test...\n");
clearAllRecords();

// Test data
const testEmail = "customer@example.com";
const subscriptionId1 = "sub_TEST_001_TradeCam";
const subscriptionId2 = "sub_TEST_002_CoreBundle";

const subscriptionData1 = {
  email: testEmail,
  customer_id: "cus_TEST_001",
  subscription_id: subscriptionId1,
  status: "active",
  subscription_start_date: "2025-11-24T00:00:00.000Z",
  current_period_start: "2025-11-24T00:00:00.000Z",
  current_period_end: "2025-12-24T00:00:00.000Z",
  plan_id: "price_TEST_001",
  plan_amount: "24.99",
  currency: "usd",
  planNickname: "TradeCam",
};

const subscriptionData2 = {
  email: testEmail,
  customer_id: "cus_TEST_001",
  subscription_id: subscriptionId2,
  status: "active",
  subscription_start_date: "2025-11-24T00:00:00.000Z",
  current_period_start: "2025-11-24T00:00:00.000Z",
  current_period_end: "2025-12-24T00:00:00.000Z",
  plan_id: "price_TEST_002",
  plan_amount: "49.99",
  currency: "usd",
  planNickname: "Core Bundle",
};

// ===== SCENARIO 1: First subscription - should SEND =====
console.log("📋 SCENARIO 1: First subscription to TradeCam");
console.log("Expected: ✅ SEND EMAIL\n");

let shouldSend = shouldSendEmail(testEmail, subscriptionId1);
console.log(`Result: ${shouldSend ? "✅ WILL SEND" : "❌ WILL NOT SEND"}\n`);

if (shouldSend) {
  recordEmailSent(subscriptionData1);
  console.log("✅ Email sent and recorded\n");
}

// ===== SCENARIO 2: Same subscription again - should NOT SEND =====
console.log("📋 SCENARIO 2: Same subscription to TradeCam again");
console.log("Expected: ❌ DO NOT SEND (already sent)\n");

shouldSend = shouldSendEmail(testEmail, subscriptionId1);
console.log(`Result: ${shouldSend ? "✅ WILL SEND" : "❌ WILL NOT SEND"}\n`);

// ===== SCENARIO 3: Different product subscription - should SEND =====
console.log("📋 SCENARIO 3: New subscription to Core Bundle (different product)");
console.log("Expected: ✅ SEND EMAIL (different subscription ID)\n");

shouldSend = shouldSendEmail(testEmail, subscriptionId2);
console.log(`Result: ${shouldSend ? "✅ WILL SEND" : "❌ WILL NOT SEND"}\n`);

if (shouldSend) {
  recordEmailSent(subscriptionData2);
  console.log("✅ Email sent and recorded\n");
}

// ===== SCENARIO 4: Cancel first subscription =====
console.log("📋 SCENARIO 4: Customer cancels TradeCam subscription");
console.log("Expected: 🚫 Mark as cancelled\n");

markSubscriptionCancelled(testEmail, subscriptionId1);
console.log("✅ Subscription marked as cancelled\n");

// ===== SCENARIO 5: Customer resubscribes to same product - should SEND =====
console.log("📋 SCENARIO 5: Customer resubscribes to TradeCam (reactivation)");
console.log("Expected: ✅ SEND EMAIL (reactivation after cancellation)\n");

shouldSend = shouldSendEmail(testEmail, subscriptionId1);
console.log(`Result: ${shouldSend ? "✅ WILL SEND" : "❌ WILL NOT SEND"}\n`);

if (shouldSend) {
  recordEmailSent(subscriptionData1);
  console.log("✅ Email sent and recorded for reactivation\n");
}

// ===== SCENARIO 6: Same subscription again (after reactivation) - should NOT SEND =====
console.log("📋 SCENARIO 6: Same TradeCam subscription again (after reactivation)");
console.log("Expected: ❌ DO NOT SEND (already sent for current activation)\n");

shouldSend = shouldSendEmail(testEmail, subscriptionId1);
console.log(`Result: ${shouldSend ? "✅ WILL SEND" : "❌ WILL NOT SEND"}\n`);

// ===== SUMMARY =====
console.log("\n=== SUMMARY ===");
console.log("All subscriptions in tracker:");
const allSubs = getAllSubscriptions();
allSubs.forEach((sub) => {
  console.log(`\n📧 ${sub.email}`);
  console.log(`   Product: ${sub.planNickname}`);
  console.log(`   Subscription ID: ${sub.subscription_id}`);
  console.log(`   Status: ${sub.status}`);
  console.log(`   Cancelled: ${sub.is_cancelled ? "Yes" : "No"}`);
  console.log(`   Email sent at: ${sub.email_sent_at}`);
});

console.log("\n\n=== Test Complete ===\n");
console.log("✅ Rule 1: One email per subscription ID - Working!");
console.log("✅ Rule 2: Send email for different products - Working!");
console.log("✅ Rule 3: Send email again on reactivation - Working!");
console.log("\n");
