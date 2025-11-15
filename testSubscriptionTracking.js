/**
 * Test Subscription Tracking System - Simplified
 * 
 * This script demonstrates the simple tracking logic:
 * - Email + Subscription ID combo doesn't exist → SEND EMAIL
 * - Email + Subscription ID combo exists → DON'T SEND
 * - Same email, different subscription ID → SEND EMAIL (new subscription)
 * 
 * Run with: node testSubscriptionTracking.js
 */

const {
  shouldSendEmail,
  recordEmailSent,
  getAllSubscriptions,
  getStatistics,
  findSubscriptionsByEmail,
  clearAllRecords,
} = require("./subscriptionTracker");

console.log("🧪 Testing Subscription Tracking System (Simplified)\n");
console.log("=" .repeat(70));

// Clear existing records for clean test
console.log("\n1️⃣ Clearing all existing records...");
clearAllRecords();
console.log("✅ Records cleared\n");

// Test data matching your format
const testEmail = "johnnyzatarain2004@gmail.com";
const testSubId1 = "sub_1SSrNF04dzdw9mwCHoWvis7W";
const testData1 = {
  source: "stripe",
  email: testEmail,
  customer_id: "cus_TPgkQFj1YK6mQf",
  subscription_id: testSubId1,
  status: "active",
  subscription_start_date: "2025-11-13T03:39:02.000Z",
  current_period_start: "2025-11-13T03:39:02.000Z",
  current_period_end: "2025-12-13T03:39:02.000Z",
  plan_id: "price_1SQEgs04dzdw9mwCA9tXNPaY",
  plan_amount: "24.99",
  currency: "usd",
  planNickname: "TradeCam",
};

console.log("=" .repeat(70));
console.log("\n📋 Test Scenario 1: New Subscription");
console.log("-" .repeat(70));
console.log(`Customer: ${testEmail}`);
console.log(`Product: ${testData1.planNickname}`);
console.log(`Subscription ID: ${testSubId1}`);

let shouldSend = shouldSendEmail(testEmail, testSubId1);
console.log(`\nShould send email? ${shouldSend ? "✅ YES" : "❌ NO"}`);

if (shouldSend) {
  recordEmailSent(testData1);
  console.log("� Email sent and recorded to JSON and CSV");
}

console.log("\n📊 Current Statistics:");
console.log(JSON.stringify(getStatistics(), null, 2));

console.log("\n" + "=" .repeat(70));
console.log("\n📋 Test Scenario 2: Same Subscription Again");
console.log("-" .repeat(70));
console.log("Webhook fires again for same subscription (e.g., status update)");

shouldSend = shouldSendEmail(testEmail, testSubId1);
console.log(`\nShould send email? ${shouldSend ? "✅ YES" : "❌ NO"}`);

if (!shouldSend) {
  console.log("⏭️ Email NOT sent - Subscription already in our records");
}

console.log("\n📊 Current Statistics:");
console.log(JSON.stringify(getStatistics(), null, 2));

console.log("\n" + "=" .repeat(70));
console.log("\n📋 Test Scenario 3: New Subscription (Different Product)");
console.log("-" .repeat(70));
console.log("Same customer subscribes to a different product");

const testSubId2 = "sub_DIFFERENT123";
const testData2 = {
  ...testData1,
  subscription_id: testSubId2,
  planNickname: "Premium Package",
  plan_amount: "49.99",
};

console.log(`Customer: ${testEmail} (same email)`);
console.log(`Product: ${testData2.planNickname} (different product)`);
console.log(`Subscription ID: ${testSubId2} (NEW subscription ID)`);

shouldSend = shouldSendEmail(testEmail, testSubId2);
console.log(`\nShould send email? ${shouldSend ? "✅ YES" : "❌ NO"}`);

if (shouldSend) {
  recordEmailSent(testData2);
  console.log("📧 Email sent for new subscription and recorded to JSON and CSV");
}

console.log("\n📊 Final Statistics:");
const finalStats = getStatistics();
console.log(JSON.stringify(finalStats, null, 2));

console.log("\n" + "=" .repeat(70));
console.log("\n📋 All Subscriptions for", testEmail);
console.log("-" .repeat(70));
const userSubs = findSubscriptionsByEmail(testEmail);
userSubs.forEach((sub, index) => {
  console.log(`\n${index + 1}. ${sub.planNickname}`);
  console.log(`   Subscription ID: ${sub.subscription_id}`);
  console.log(`   Status: ${sub.status}`);
  console.log(`   Amount: $${sub.plan_amount} ${sub.currency.toUpperCase()}`);
  console.log(`   Duration: ${sub.duration}`);
  console.log(`   Email sent at: ${sub.email_sent_at}`);
});

console.log("\n" + "=" .repeat(70));
console.log("\n✅ All Tests Completed!");
console.log("\n📁 Check these files:");
console.log("   - subscription_emails_log.json (JSON database)");
console.log("   - subscription_emails_sent.csv (CSV export)");
console.log("\n💡 Test the API endpoints:");
console.log("   curl http://localhost:3000/subscription-emails");
console.log(`   curl http://localhost:3000/subscription-emails/${testEmail}`);
console.log("   curl http://localhost:3000/subscription-emails-stats");
console.log("\n" + "=" .repeat(70));
