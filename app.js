require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { sendEmail, sendSubscriptionEmail } = require("./emailService");
const {
  shouldSendEmail,
  recordEmailSent,
} = require("./subscriptionTracker");

const app = express();

// ==== WEBHOOK MIDDLEWARE (must be BEFORE express.json()) ====
// ⚠️ DISABLED: Using CSV file watcher instead
// Emails are sent automatically when stripe/subscriptions.csv is updated
/*
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    // Check if TEST_MODE is enabled
    const testMode = process.env.TEST_MODE === "true" || process.env.TEST_MODE === "1";
    
    if (testMode) {
      console.log("🧪 TEST MODE ENABLED - Webhook ignored");
      console.log("⚠️ No emails will be sent to real customers");
      console.log("💡 Set TEST_MODE=false in .env to enable real webhook processing");
      return res.json({ received: true, test_mode: true, message: "Test mode enabled - webhook ignored" });
    }
    
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("⚠ STRIPE_WEBHOOK_SECRET is not configured");
      return res.status(500).send("Webhook secret not configured");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    console.log(`✅ Received Stripe webhook event: ${event.type}`);

    try {
      if (event.type === "customer.subscription.created" || 
          event.type === "customer.subscription.updated") {
        
        const subscription = event.data.object;
        
        // Only process active or trialing subscriptions
        if (subscription.status !== "active" && subscription.status !== "trialing") {
          console.log(`⏭️ Subscription status is ${subscription.status} - Skipping`);
          return res.json({ received: true });
        }
        
        // Get customer details
        const customer = await stripe.customers.retrieve(subscription.customer);
        const customerEmail = customer.email;
        const customerName = customer.name || "Valued Customer";
        
        // Get product details from the subscription
        const subscriptionItem = subscription.items.data[0];
        const price = subscriptionItem.price;
        const productId = price.product;
        
        // Fetch product details
        const product = await stripe.products.retrieve(productId);
        const productName = product.name || "Your Subscription";
        
        console.log(`📋 Subscription details:`);
        console.log(`   Email: ${customerEmail}`);
        console.log(`   Product: ${productName}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Subscription ID: ${subscription.id}`);
        
        // Check if email should be sent (simple: does this email+sub_id combo exist?)
        const shouldSend = shouldSendEmail(customerEmail, subscription.id);
        
        if (shouldSend) {
          // Prepare subscription data in the format you specified
          const subscriptionData = {
            source: "stripe",
            email: customerEmail,
            customer_id: customer.id,
            subscription_id: subscription.id,
            status: subscription.status,
            subscription_start_date: subscription.start_date
              ? new Date(subscription.start_date * 1000).toISOString()
              : null,
            current_period_start: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            plan_id: price.id,
            plan_amount: price.unit_amount ? (price.unit_amount / 100).toFixed(2) : "0.00",
            currency: price.currency || "usd",
            planNickname: productName,
          };
          
          // Get download link
          const downloadLink = 
            process.env[`PRODUCT_DOWNLOAD_LINK_${productId}`] ||
            product.metadata?.download_link ||
            process.env.DEFAULT_DOWNLOAD_LINK ||
            "https://your-website.com/downloads";
          
          console.log(`📧 Sending subscription email...`);
          
          // Send the subscription confirmation email
          await sendSubscriptionEmail({
            to: customerEmail,
            productName,
            downloadLink,
            customerName,
          });
          
          // Record that email was sent (also saves to CSV)
          recordEmailSent(subscriptionData);
          
          console.log(`✅ Subscription email sent and recorded successfully`);
        }
      }
    } catch (err) {
      console.error("❌ Error processing webhook:", err.message);
      // Still return 200 to acknowledge receipt to Stripe
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  }
);
*/

// ==== BASIC MIDDLEWARE ====
app.use(cors());
app.use(express.json());

// ==== STRIPE CLIENT ====
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠ STRIPE_SECRET_KEY is not set in .env");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// ==== WHITELISTS ====
// Add your permanent & temporary whitelisted emails here:
const permanentWhitelist = [
  "nim3xh@gmail.com",
];

const temporaryWhitelist = [
  {
    email: "amaribelgaum@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "rajitthetrader@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "kirankgururaj@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "umesh24trading@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "josephreddy2024@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "nishlionking@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "reuviethetrader@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "manoyennam@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "sindhushivalik@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "aktradingmillion@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email: "anantbelgaum@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  },
  {
    email:"aicashhustler@gmail.com",
    start_date: "2025-11-01T00:00:00.000Z",
    end_date: "2025-12-31T23:59:59.999Z",
    planNickname: "all"
  }
];

// ==== HELPERS ====

function getCurrentTimeInEST() {
  const now = new Date();
  const options = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options).format(now);
}

function getCurrentTimeInPST() {
  const now = new Date();
  const options = {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options).format(now);
}

// ==== ROUTES ====

// Simple health-check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- 1) CURRENT TIME (PST) ---
app.get("/current-time", (req, res) => {
  const time = getCurrentTimeInPST();
  res.json({ time });
});

// --- 2) SUBSCRIPTION STATUS (EST time in response) ---
app.get("/stripe/subscription-status", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        error: "Email query parameter is required",
      });
    }

    const currentTime = getCurrentTimeInEST();

    // 2.1. Check permanent whitelist
    if (permanentWhitelist.includes(email)) {
      return res.json({
        source: "permanent_whitelist",
        email,
        customer_id: null,
        subscription_id: null,
        status: "active",
        subscription_start_date: null,
        current_period_start: null,
        current_period_end: null,
        plan_id: null,
        plan_amount: null,
        currency: null,
        planNickname: "all",
        current_time: currentTime,
      });
    }

    // 2.2. Check temporary whitelist
    const now = new Date();
    const tempWhitelistEntry = temporaryWhitelist.find(
      (entry) => entry.email === email
    );
    
    if (tempWhitelistEntry) {
      const startDate = new Date(tempWhitelistEntry.start_date);
      const endDate = new Date(tempWhitelistEntry.end_date);
      
      if (now >= startDate && now <= endDate) {
        return res.json({
          source: "temporary_whitelist",
          email,
          customer_id: null,
          subscription_id: null,
          status: "active",
          subscription_start_date: tempWhitelistEntry.start_date,
          current_period_start: tempWhitelistEntry.start_date,
          current_period_end: tempWhitelistEntry.end_date,
          plan_id: null,
          plan_amount: null,
          currency: null,
          planNickname: tempWhitelistEntry.planNickname || "all",
          current_time: currentTime,
        });
      } else {
        return res.status(403).json({
          source: "temporary_whitelist_expired",
          email,
          customer_id: null,
          subscription_id: null,
          status: "inactive",
          subscription_start_date: tempWhitelistEntry.start_date,
          current_period_start: tempWhitelistEntry.start_date,
          current_period_end: tempWhitelistEntry.end_date,
          plan_id: null,
          plan_amount: null,
          currency: null,
          planNickname: tempWhitelistEntry.planNickname || "all",
          current_time: currentTime,
        });
      }
    }

    // 2.3. Look up Stripe customer by email
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "Stripe is not configured on the server",
      });
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (!customers.data || customers.data.length === 0) {
      return res.status(404).json({
        email,
        status: "no_customer",
        message: "No Stripe customer found for this email.",
        current_time: currentTime,
      });
    }

    const customer = customers.data[0];

    // 2.4. Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    if (!subscriptions.data || subscriptions.data.length === 0) {
      return res.status(404).json({
        email,
        customer_id: customer.id,
        status: "no_subscriptions",
        message: "Customer has no subscriptions.",
        current_time: currentTime,
      });
    }

    // Prefer active or trialing subscriptions
    const preferred = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    ) || subscriptions.data[0];

    const price = preferred.items?.data?.[0]?.price;
    const productId = price?.product;

    let productName = null;
    if (productId) {
      try {
        const product = await stripe.products.retrieve(productId);
        productName = product.name;
      } catch {
        productName = null;
      }
    }

    const response = {
      source: "stripe",
      email,
      customer_id: customer.id,
      subscription_id: preferred.id,
      status: preferred.status,
      subscription_start_date: preferred.start_date
        ? new Date(preferred.start_date * 1000).toISOString()
        : null,
      current_period_start: preferred.current_period_start
        ? new Date(preferred.current_period_start * 1000).toISOString()
        : null,
      current_period_end: preferred.current_period_end
        ? new Date(preferred.current_period_end * 1000).toISOString()
        : null,
      plan_id: price?.id || null,
      plan_amount: price?.unit_amount
        ? (price.unit_amount / 100).toFixed(2)
        : null,
      currency: price?.currency || null,
      planNickname: productName || "all",
      current_time: currentTime,
    };

    return res.json(response);
  } catch (err) {
    console.error("Error in /stripe/subscription-status:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});


app.post("/send-test-email", async (req, res) => {
  try {
    const { to } = req.body || {};   // 👈 guard

    if (!to) {
      return res
        .status(400)
        .json({ error: "Missing 'to' in body. Send JSON: { \"to\": \"email@example.com\" }" });
    }

    const subject = "Test email from Node.js Gmail service";
    const text = "Hello! This is a plain text test email from your Node backend.";
    const html = "<p><b>Hello!</b> This is a <i>test email</i> from your Node backend.</p>";

    const info = await sendEmail({ to, subject, text, html });

    return res.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (err) {
    console.error("Error sending email:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ==== MANUAL SUBSCRIPTION EMAIL SENDER ====

/**
 * Send subscription email manually by plan nickname
 * POST /send-subscription-email
 * 
 * Body: {
 *   "email": "customer@example.com",
 *   "planNickname": "TradeCam",
 *   "customerName": "John Doe" (optional)
 * }
 */
app.post("/send-subscription-email", async (req, res) => {
  try {
    const { email, planNickname, customerName } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Missing 'email' in request body",
      });
    }
    
    if (!planNickname) {
      return res.status(400).json({
        success: false,
        error: "Missing 'planNickname' in request body",
      });
    }
    
    // Import required modules
    const { getDownloadLinkByPlanNickname } = require("./productLinkMapper");
    
    // Get download link based on plan nickname
    const downloadLink = getDownloadLinkByPlanNickname(planNickname);
    
    // Prepare customer name
    const name = customerName || email.split("@")[0] || "Valued Customer";
    
    console.log(`\n📧 Manual subscription email request:`);
    console.log(`   Email: ${email}`);
    console.log(`   Plan: ${planNickname}`);
    console.log(`   Customer Name: ${name}`);
    console.log(`   Download Link: ${downloadLink}`);
    
    // Send the subscription email
    await sendSubscriptionEmail({
      to: email,
      productName: planNickname,
      downloadLink: downloadLink,
      customerName: name,
    });
    
    console.log(`✅ Manual subscription email sent successfully to ${email}\n`);
    
    return res.json({
      success: true,
      message: "Subscription email sent successfully",
      details: {
        email: email,
        planNickname: planNickname,
        downloadLink: downloadLink,
        customerName: name,
      },
    });
  } catch (err) {
    console.error("❌ Error sending manual subscription email:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ==== TEST MODE ENDPOINT ====

/**
 * Manual test subscription email (for testing only)
 * POST /test-subscription-email
 * 
 * Body: {
 *   "planNickname": "TradeCam",
 *   "amount": "24.99",
 *   "downloadLink": "https://example.com/download"
 * }
 */
app.post("/test-subscription-email", async (req, res) => {
  try {
    const testMode = process.env.TEST_MODE === "true" || process.env.TEST_MODE === "1";
    
    if (!testMode) {
      return res.status(403).json({
        success: false,
        error: "Test mode is not enabled. Set TEST_MODE=true in .env to use this endpoint.",
      });
    }
    
    const testEmail = process.env.TEST_EMAIL || "nim3xh@gmail.com";
    const { planNickname, amount, downloadLink } = req.body;
    
    // Generate test subscription data
    const testSubscriptionData = {
      source: "test",
      email: testEmail,
      customer_id: `cus_test_${Date.now()}`,
      subscription_id: `sub_test_${Date.now()}`,
      status: "active",
      subscription_start_date: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      plan_id: `price_test_${Date.now()}`,
      plan_amount: amount || "24.99",
      currency: "usd",
      planNickname: planNickname || "Test Plan",
    };
    
    console.log("🧪 TEST MODE: Sending test subscription email");
    console.log(`   To: ${testEmail}`);
    console.log(`   Plan: ${testSubscriptionData.planNickname}`);
    console.log(`   Amount: $${testSubscriptionData.plan_amount}`);
    
    // Check if should send email
    const shouldSend = shouldSendEmail(testEmail, testSubscriptionData.subscription_id);
    
    if (!shouldSend) {
      return res.json({
        success: true,
        test_mode: true,
        email_sent: false,
        message: "Subscription already exists in records - no email sent",
        subscription: testSubscriptionData,
      });
    }
    
    // Send email
    await sendSubscriptionEmail({
      to: testEmail,
      productName: testSubscriptionData.planNickname,
      downloadLink: downloadLink || process.env.DEFAULT_DOWNLOAD_LINK || "https://example.com/download",
      customerName: "Test Customer",
    });
    
    // Record it
    recordEmailSent(testSubscriptionData);
    
    console.log("✅ Test subscription email sent successfully");
    
    return res.json({
      success: true,
      test_mode: true,
      email_sent: true,
      message: "Test email sent and recorded",
      subscription: testSubscriptionData,
    });
  } catch (err) {
    console.error("❌ Error sending test subscription email:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ==== SUBSCRIPTION EMAIL TRACKING ENDPOINTS ====

/**
 * Get all subscription email records
 * GET /subscription-emails
 */
app.get("/subscription-emails", (req, res) => {
  try {
    const {
      getAllSubscriptions,
      getStatistics,
    } = require("./subscriptionTracker");
    
    const subscriptions = getAllSubscriptions();
    const stats = getStatistics();
    
    return res.json({
      success: true,
      total: subscriptions.length,
      statistics: stats,
      subscriptions: subscriptions,
    });
  } catch (err) {
    console.error("Error fetching subscription emails:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Get subscription email records for a specific email address
 * GET /subscription-emails/:email
 */
app.get("/subscription-emails/:email", (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { findSubscriptionsByEmail } = require("./subscriptionTracker");
    
    const subscriptions = findSubscriptionsByEmail(email);
    
    return res.json({
      success: true,
      email: email,
      total: subscriptions.length,
      subscriptions: subscriptions,
    });
  } catch (err) {
    console.error("Error fetching subscription emails:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Get subscription statistics
 * GET /subscription-emails/stats
 */
app.get("/subscription-emails-stats", (req, res) => {
  try {
    const { getStatistics } = require("./subscriptionTracker");
    
    const stats = getStatistics();
    
    return res.json({
      success: true,
      statistics: stats,
    });
  } catch (err) {
    console.error("Error fetching subscription statistics:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ==== FILE AND PRODUCT DOWNLOAD ENDPOINTS ====

/**
 * Get file creation times from dashboards
 * GET /file-creation-time
 */
app.get('/file-creation-time', async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    
    const dashboardsPath = path.join(__dirname, 'dashboards');
    console.log("Checking if dashboards folder exists:", fs.existsSync(dashboardsPath));

    if (!fs.existsSync(dashboardsPath)) {
      return res.status(404).send("Dashboards folder not found.");
    }

    const apexidFolders = fs.readdirSync(dashboardsPath).filter((item) =>
      fs.statSync(path.join(dashboardsPath, item)).isDirectory()
    );
    console.log("Apexid folders found:", apexidFolders);

    if (apexidFolders.length === 0) {
      return res.status(404).send("No apexid folders found.");
    }

    const allFileDetails = [];
    for (const apexid of apexidFolders) {
      const folderPath = path.join(dashboardsPath, apexid);
      const files = fs.readdirSync(folderPath);

      console.log(`Files in folder ${apexid}:`, files);

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        allFileDetails.push({
          apexid: apexid,
          fileName: file,
          createdAt: stats.birthtime.toISOString(),
        });
      }
    }

    if (allFileDetails.length === 0) {
      return res.status(404).send("No files found in any apexid folder.");
    }

    res.status(200).json(allFileDetails);
  } catch (error) {
    console.error('Error fetching file creation times:', error);
    res.status(500).send('Failed to retrieve file creation times.');
  }
});

/**
 * Download PropTraderPro indicator
 * GET /download/proptraderpro
 */
app.get("/download/proptraderpro", (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const filePath = path.resolve(__dirname, "dll", "indicator.zip");
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  res.download(filePath, "indicator.zip");
});

// Exact product names (same as folders)
const PRODUCT_NAMES = [
  "Prop Trade Planner - Dr.Markets",
  "TradeRx",
  "JournalX",
  "TradeCam",
  "Trade Video Recorder",
  "Regular Updates",
  "White-Glove Prop Trading Environment Setup",
  "Custom Strategy Development (Advisory)",
  "One-on-one Prop Firm Journey Coaching",
  "Prop Trade Planner Dr.Markets Trial",
  "TradeRx - Trial",
  "JournalX Trial",
  "TradeCam Trial",
  "Trade Video Recorder Trial",
  "Core Bundle Trial — Planner + TradeRx + JournalX",
  "Core Bundle — Planner + TradeRx + JournalX",
];

/**
 * Download specific product by name
 * GET /download/:productName
 */
app.get("/download/:productName", (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const requested = req.params.productName;

  // Find an exact match (case-insensitive)
  const match = PRODUCT_NAMES.find(
    (name) => name.toLowerCase() === requested.toLowerCase()
  );

  if (!match) {
    return res
      .status(404)
      .send("Invalid product name. Please use an exact name.");
  }

  const folderPath = path.resolve(__dirname, "products", match);
  const filePath = path.join(folderPath, `${match}.zip`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  res.download(filePath, `${match}.zip`);
});

/**
 * Get current time in Pacific Standard Time
 * GET /current-time
 */
app.get('/current-time', (req, res) => {
  const timeZone = 'America/Los_Angeles'; // Pacific Standard Time (PST)
  
  const getFormattedTime = () => {
    const now = new Date();
    
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    }).format(now);

    const formattedTime = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
      timeZone,
    }).format(now);

    return `${formattedDate} ${formattedTime}`; 
  };
  
  const time = getFormattedTime();
  res.json({ time });
});

/**
 * Download demo CSV file
 * GET /download/demo
 */
app.get('/download/demo', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const filePath = path.join(__dirname, 'upload_sample.csv');
  const fileName = 'dashboard_data_sample.csv';

  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader('Content-Type', 'text/csv');

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('Error reading the file:', err);
    res.status(500).send('Failed to read the file.');
  });
});

/**
 * Download _Trades.csv file for specific account number
 * GET /download/:accountNumber
 * Note: This route should be defined after /download/demo and /download/proptraderpro
 * to avoid conflicts
 */
app.get('/download/trades/:accountNumber', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    
    const { accountNumber } = req.params;
    console.log(accountNumber);

    const dashboardsPath = path.join(__dirname, 'dashboards', accountNumber);
    console.log(`Checking for files for account number ${accountNumber} in folder: ${dashboardsPath}`);

    if (!fs.existsSync(dashboardsPath)) {
      return res.status(404).send(`No folder found for account number ${accountNumber}.`);
    }

    const files = fs.readdirSync(dashboardsPath).filter((file) => file.endsWith('_Trades.csv'));

    if (files.length === 0) {
      return res.status(404).send(`No _Trades.csv file found for account number ${accountNumber}.`);
    }

    if (files.length > 1) {
      return res.status(400).send(`Multiple _Trades.csv files found for account number ${accountNumber}. Please ensure only one file exists.`);
    }

    const filePath = path.join(dashboardsPath, files[0]);
    const fileName = files[0];

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'text/csv');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Error reading the file:', err);
      res.status(500).send('Failed to read the file.');
    });
  } catch (error) {
    console.error(`Error while downloading _Trades.csv file for account number ${req.params.accountNumber}:`, error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

/**
 * Download sample files
 * GET /samplefiles/:filename
 */
app.get('/samplefiles/:filename', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const { filename } = req.params;

  // Sanitize filename to prevent directory traversal
  if (!/^[\w\-\.]+\.csv$/.test(filename)) {
    return res.status(400).send('Invalid file name.');
  }

  const filePath = path.join(__dirname, 'samplefiles', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send(`File "${filename}" not found.`);
  }

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'text/csv');

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('Error streaming file:', err);
    res.status(500).send('Failed to read the file.');
  });
});

/**
 * Alert hook endpoint for testing
 * POST /alert-hook
 */
app.post('/alert-hook', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    
    const dashboardsPath = path.join(__dirname, 'dashboards', 'test');
    const filePath = path.join(dashboardsPath, 'test.txt');

    // Ensure the test folder exists
    if (!fs.existsSync(dashboardsPath)) {
      fs.mkdirSync(dashboardsPath, { recursive: true });
    }

    // Prepare the input data with a newline
    const inputData = JSON.stringify(req.body) + '\n';

    // Append the input data to the file
    fs.appendFileSync(filePath, inputData);

    console.log('Data appended to file:', inputData.trim());
    res.status(200).send('Data appended successfully.');
  } catch (error) {
    console.error('Error appending data:', error);
    res.status(500).send('Failed to append data.');
  }
});

/**
 * Check if a date is a holiday
 * GET /is-holiday?date=YYYY-MM-DD
 */
app.get('/is-holiday', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const csv = require('csv-parser');
  
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: "Date is required in YYYY-MM-DD format." });
  }

  const [year, month, day] = date.split('-');
  const formattedInput = `${parseInt(month)}/${parseInt(day)}/${year}`;

  const holidaysPath = path.join(__dirname, 'holidays', 'holidays.csv');
  let isHoliday = false;
  let holidayName = '';

  fs.createReadStream(holidaysPath)
    .pipe(csv())
    .on('data', (row) => {
      const observedDate = row['Observed Date']?.trim();
      if (observedDate === formattedInput) {
        isHoliday = true;
        holidayName = row['Holiday Name']?.trim();
      }
    })
    .on('end', () => {
      if (isHoliday) {
        res.json({ success: true, isHoliday: true, holidayName });
      } else {
        res.json({ success: true, isHoliday: false, message: "Not a holiday." });
      }
    })
    .on('error', (err) => {
      console.error('Error reading holidays CSV:', err);
      res.status(500).json({ success: false, message: "Internal server error while reading holiday data." });
    });
});


// ==== WHITELIST CONFIGURATION ====
// Permanent whitelist emails
const PERMANENT_EMAILS = [
  "Sachin.techpro@gmail.com"
];

// Temporary whitelist emails (valid until Dec 31, 2025)
const TEMPORARY_EMAILS = [
  "amaribelgaum@gmail.com",
  "rajitthetrader@gmail.com",
  "kirankgururaj@gmail.com",
  "umesh24trading@gmail.com",
  "josephreddy2024@gmail.com",
  "nishlionking@gmail.com",
  "reuviethetrader@gmail.com",
  "manoyennam@gmail.com",
  "sindhushivalik@gmail.com",
  "aktradingmillion@gmail.com",
  "anantbelgaum@gmail.com"
];

const TEMPORARY_EXPIRATION = new Date('2025-12-31T23:59:59');

// Helper function to check if email is whitelisted
function isWhitelistedEmail(email) {
  const emailLower = email.toLowerCase();
  
  // Check permanent emails
  if (PERMANENT_EMAILS.map(e => e.toLowerCase()).includes(emailLower)) {
    return { whitelisted: true, isTemporary: false };
  }
  
  // Check temporary emails with expiration
  if (TEMPORARY_EMAILS.map(e => e.toLowerCase()).includes(emailLower)) {
    const now = new Date();
    if (now <= TEMPORARY_EXPIRATION) {
      return { whitelisted: true, isTemporary: true };
    }
  }
  
  return { whitelisted: false, isTemporary: false };
}


// ==== EVENTS ENDPOINT ====
/**
 * Get events by date (no subscription required)
 * GET /events/by-date?date=YYYY-MM-DD
 */
app.get('/events/by-date', (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ success: false, message: 'Date query is required. Format: YYYY-MM-DD' });
  }

  try {
    const path = require('path');
    const fs = require('fs');
    const csv = require('csv-parser');
    
    const csvFilePath = path.join(__dirname, 'events', '2025-events.csv');
    
    // Check if the CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Events data file not found.' 
      });
    }
    
    const results = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Normalize date for comparison
        const eventDate = row['Date']?.trim();
        if (eventDate === date) {
          results.push({
            date: eventDate,
            event: row['Event Name']?.trim(),
            start_time: row['Start Time (EST)']?.trim(),
            duration: row['Duration']?.trim(),
          });
        }
      })
      .on('end', () => {
        if (results.length > 0) {
          res.json({ success: true, events: results });
        } else {
          res.status(404).json({ success: false, message: 'No events found for the given date.' });
        }
      })
      .on('error', (err) => {
        console.error('Error reading CSV file:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
      });
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});


// ==== EXPORT APP ====
module.exports = app;
