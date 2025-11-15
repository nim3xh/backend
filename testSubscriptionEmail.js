/**
 * Test script to simulate a Stripe subscription webhook and send email
 * Run with: node testSubscriptionEmail.js
 */

require("dotenv").config();
const { sendSubscriptionEmail } = require("./emailService");

async function testSubscriptionEmail() {
  console.log("🧪 Testing Subscription Email...\n");

  // Test data
  const testData = {
    to: process.env.TEST_EMAIL || "test@example.com", // Will be overridden by TEST_EMAIL if set
    productName: "Premium Subscription Plan",
    downloadLink: "https://example.com/download/your-product",
    customerName: "John Doe",
  };

  console.log("📧 Email will be sent to:", process.env.TEST_EMAIL || testData.to);
  console.log("📦 Product:", testData.productName);
  console.log("🔗 Download Link:", testData.downloadLink);
  console.log("👤 Customer Name:", testData.customerName);
  console.log("\n🚀 Sending email...\n");

  try {
    const result = await sendSubscriptionEmail(testData);
    console.log("✅ SUCCESS! Email sent successfully!");
    console.log("📬 Message ID:", result.messageId);
    console.log("\n💡 Check your inbox (and spam folder) for the test email.");
  } catch (error) {
    console.error("❌ ERROR: Failed to send email");
    console.error("Error details:", error.message);
    console.log("\n🔍 Troubleshooting:");
    console.log("- Check that GMAIL_USER and GMAIL_APP_PASSWORD are set in .env");
    console.log("- Make sure you're using a Gmail App Password, not your regular password");
    console.log("- Verify your Gmail account has 2-Step Verification enabled");
  }
}

// Run the test
testSubscriptionEmail();
