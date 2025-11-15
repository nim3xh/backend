/**
 * Test Mode - Send Test Subscription Email
 * 
 * This script sends a test subscription email to TEST_EMAIL
 * without using real Stripe data
 * 
 * Make sure TEST_MODE=true in your .env file
 * 
 * Run with: node sendTestEmail.js
 */

require("dotenv").config();

const testMode = process.env.TEST_MODE === "true" || process.env.TEST_MODE === "1";
const testEmail = process.env.TEST_EMAIL || "nim3xh@gmail.com";

console.log("🧪 Test Mode Email Sender\n");
console.log("=" .repeat(70));

if (!testMode) {
  console.log("\n❌ TEST_MODE is not enabled!");
  console.log("   Add TEST_MODE=true to your .env file");
  console.log("   This prevents sending emails to real customers");
  process.exit(1);
}

console.log("\n✅ TEST_MODE is enabled");
console.log(`📧 Test emails will be sent to: ${testEmail}`);
console.log("\n" + "=" .repeat(70));

console.log("\nTo send a test subscription email, use the API:");
console.log("\n1. Start your server:");
console.log("   npm start\n");
console.log("2. In another terminal, run:");
console.log(`
   curl -X POST http://localhost:3000/test-subscription-email \\
     -H "Content-Type: application/json" \\
     -d '{
       "planNickname": "TradeCam",
       "amount": "24.99",
       "downloadLink": "https://example.com/download/tradecam"
     }'
`);

console.log("\nOr use this PowerShell command:");
console.log(`
   Invoke-RestMethod -Uri http://localhost:3000/test-subscription-email \\
     -Method POST \\
     -ContentType "application/json" \\
     -Body '{"planNickname":"TradeCam","amount":"24.99","downloadLink":"https://example.com/download"}'
`);

console.log("\n" + "=" .repeat(70));
console.log("\n💡 Tips:");
console.log("   - Each test creates a unique subscription ID");
console.log("   - Email will be sent to:", testEmail);
console.log("   - Records saved to JSON and CSV files");
console.log("   - Real Stripe webhooks are IGNORED when TEST_MODE=true");
console.log("\n" + "=" .repeat(70));
console.log("\n🔒 Safety:");
console.log("   ✅ Real customers won't receive emails");
console.log("   ✅ Stripe webhooks are ignored");
console.log("   ✅ Only test email receives notifications");
console.log("\n" + "=" .repeat(70));
console.log("\n🚀 When ready for production:");
console.log("   1. Set TEST_MODE=false in .env");
console.log("   2. Uncomment webhook in app.js");
console.log("   3. Remove TEST_EMAIL or set to empty");
console.log("   4. Restart server");
console.log("\n" + "=" .repeat(70));
