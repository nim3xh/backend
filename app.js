require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const passport = require("./config/passport");
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
// Configure CORS for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// ==== SESSION & PASSPORT MIDDLEWARE ====
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));
app.use(passport.initialize());
app.use(passport.session());
console.log('🔐 Passport and session middleware initialized');

// ==== STATIC FILE SERVING ====
// Serve uploaded images from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
console.log('📁 Static files served from /uploads');

// ==== MULTER CONFIGURATION FOR IMAGE UPLOADS ====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads/blog-images'));
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-randomstring.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const imageFileFilter = function (req, file, cb) {
  // Accept image files only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
    req.fileValidationError = 'Only image files are allowed (jpg, jpeg, png, gif, webp)';
    return cb(null, false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: imageFileFilter
});

console.log('📸 Multer configured for blog image uploads (max 5MB)');

// Helper function to delete image file
function deleteImageFile(imageUrl) {
  if (!imageUrl || imageUrl === '') return;
  
  try {
    // Extract filename from URL (e.g., /uploads/blog-images/blog-123456.jpg)
    const filename = imageUrl.split('/').pop();
    const filePath = path.join(__dirname, 'public/uploads/blog-images', filename);
    
    // Check if file exists
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted image file: ${filename}`);
    }
  } catch (error) {
    console.error('❌ Error deleting image file:', error.message);
  }
}

// ==== STRIPE CLIENT ====
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠ STRIPE_SECRET_KEY is not set in .env");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// ==== SUBSCRIPTION MANAGEMENT ====
// File paths for subscription storage
const SUBSCRIPTIONS_DIR = path.join(__dirname, 'subscriptions');
const PERMANENT_SUBSCRIPTIONS_FILE = path.join(SUBSCRIPTIONS_DIR, 'permanent_subscriptions.json');
const TEMPORARY_SUBSCRIPTIONS_FILE = path.join(SUBSCRIPTIONS_DIR, 'temporary_subscriptions.json');

// Ensure subscriptions directory exists
if (!fs.existsSync(SUBSCRIPTIONS_DIR)) {
  fs.mkdirSync(SUBSCRIPTIONS_DIR, { recursive: true });
  console.log('📁 Created subscriptions directory');
}

// Helper functions to load subscriptions from JSON files
const loadPermanentSubscriptions = () => {
  try {
    if (!fs.existsSync(PERMANENT_SUBSCRIPTIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PERMANENT_SUBSCRIPTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading permanent subscriptions:', error);
    return [];
  }
};

const loadTemporarySubscriptions = () => {
  try {
    if (!fs.existsSync(TEMPORARY_SUBSCRIPTIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(TEMPORARY_SUBSCRIPTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading temporary subscriptions:', error);
    return [];
  }
};

const savePermanentSubscriptions = (subscriptions) => {
  try {
    fs.writeFileSync(PERMANENT_SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving permanent subscriptions:', error);
    return false;
  }
};

const saveTemporarySubscriptions = (subscriptions) => {
  try {
    fs.writeFileSync(TEMPORARY_SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving temporary subscriptions:', error);
    return false;
  }
};

// Load whitelists from JSON files (for backward compatibility)
let permanentWhitelist = loadPermanentSubscriptions().filter(s => s.status === 'active').map(s => s.email);
let temporaryWhitelist = loadTemporarySubscriptions().filter(s => s.status === 'active').map(s => ({
  email: s.email,
  start_date: s.startDate,
  end_date: s.endDate,
  planNickname: s.planNickname
}));

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
 * Download tradeRx indicator
 * GET /download/tradeRx
 */
app.get("/download/traderx", (req, res) => {
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


// ==== BLOG POSTS API ====

// Blog posts directory
const BLOG_POSTS_DIR = path.join(__dirname, 'blog_posts');

// Ensure blog posts directory exists
if (!fs.existsSync(BLOG_POSTS_DIR)) {
  fs.mkdirSync(BLOG_POSTS_DIR, { recursive: true });
  console.log('📁 Created blog_posts directory');
}

// Helper function to generate URL-friendly slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

// Helper function to ensure slug uniqueness
const ensureUniqueSlug = (slug, excludeId = null) => {
  const posts = loadBlogPosts();
  let uniqueSlug = slug;
  let counter = 1;
  
  while (posts.some(p => p.slug === uniqueSlug && p.id !== excludeId)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return uniqueSlug;
};

// Helper functions for file operations
const getBlogPostFilePath = (id) => path.join(BLOG_POSTS_DIR, `${id}.json`);

const loadBlogPosts = () => {
  try {
    const files = fs.readdirSync(BLOG_POSTS_DIR);
    const posts = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(BLOG_POSTS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const post = JSON.parse(fileContent);
        posts.push(post);
      }
    }
    
    return posts;
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return [];
  }
};

const saveBlogPost = (post) => {
  try {
    const filePath = getBlogPostFilePath(post.id);
    fs.writeFileSync(filePath, JSON.stringify(post, null, 2), 'utf8');
    console.log(`✅ Saved blog post: ${post.id} - ${post.title}`);
    return true;
  } catch (error) {
    console.error('Error saving blog post:', error);
    return false;
  }
};

const deleteBlogPost = (id) => {
  try {
    const filePath = getBlogPostFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted blog post: ${id}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return false;
  }
};

// Initialize with sample posts if directory is empty
const initializeSamplePosts = () => {
  const existingPosts = loadBlogPosts();
  
  if (existingPosts.length === 0) {
    console.log('📝 Initializing with sample blog posts...');
    
    const samplePosts = [
      {
        id: "1",
        title: "5 Essential Rules Every Prop Trader Must Follow",
        excerpt: "Understanding and following prop firm rules is critical for success...",
        content: "Prop trading comes with specific rules and guidelines that traders must follow to maintain their funded accounts. Here are five essential rules every prop trader must follow...",
        category: "Trading Tips",
        status: "published",
        date: "2025-11-20",
        author: "Admin",
        views: 1247,
        readTime: "5 min read",
        image: ""
      },
      {
        id: "2",
        title: "How to Build a Consistent Trading Routine",
        excerpt: "Consistency is key in prop trading. Discover how to create...",
        content: "Building a consistent trading routine is one of the most important factors in becoming a successful prop trader. This article explores the key elements of a solid trading routine...",
        category: "Strategy",
        status: "published",
        date: "2025-11-18",
        author: "Admin",
        views: 892,
        readTime: "7 min read",
        image: ""
      },
      {
        id: "3",
        title: "Risk Management Strategies for Funded Accounts",
        excerpt: "Protecting your funded account requires proper risk management...",
        content: "Risk management is the cornerstone of successful prop trading. In this comprehensive guide, we'll cover the essential risk management strategies you need to protect your funded account...",
        category: "Risk Management",
        status: "draft",
        date: "2025-11-15",
        author: "Admin",
        views: 0,
        readTime: "10 min read",
        image: ""
      }
    ];
    
    samplePosts.forEach(post => saveBlogPost(post));
    console.log('✅ Sample posts initialized');
  }
};

// Migrate existing posts to add slugs if missing
const migratePostsWithSlugs = () => {
  const posts = loadBlogPosts();
  let migrated = 0;
  
  posts.forEach(post => {
    if (!post.slug) {
      post.slug = ensureUniqueSlug(generateSlug(post.title), post.id);
      saveBlogPost(post);
      migrated++;
    }
  });
  
  if (migrated > 0) {
    console.log(`✅ Migrated ${migrated} blog posts with slugs`);
  }
};

// Initialize sample posts on startup
initializeSamplePosts();

// Migrate existing posts to add slugs
migratePostsWithSlugs();

// ==== JWT AUTHENTICATION MIDDLEWARE ====

/**
 * Middleware to verify JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// ==== ADMIN AUTHENTICATION API ====

/**
 * Admin signup endpoint
 * POST /api/admin/signup
 */
app.post('/api/admin/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Load existing users
    const fs = require('fs');
    const path = require('path');
    const usersFile = path.join(__dirname, 'users.json');
    
    let users = [];
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      users = JSON.parse(data);
    }

    // Check if username already exists
    if (users.find(u => u.username === username)) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username,
      email: email || '',
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Save to file
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('⚠️ JWT_SECRET not set in .env');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`✅ Admin signup successful: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        username,
        email,
        role: 'admin'
      },
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error in admin signup:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during signup'
    });
  }
});

// ==== GOOGLE OAUTH ROUTES ====
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
console.log('🔑 Google OAuth routes initialized at /auth');

// ==== PROFILE PHOTO PROXY ====
// Proxy Google profile photos to bypass referrer restrictions
app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    
    if (!imageUrl || !imageUrl.includes('googleusercontent.com')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    const https = require('https');
    const http = require('http');
    const protocol = imageUrl.startsWith('https') ? https : http;

    protocol.get(imageUrl, (proxyRes) => {
      // Set cache headers
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.set('Content-Type', proxyRes.headers['content-type']);
      
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Image proxy error:', err);
      res.status(500).json({ error: 'Failed to fetch image' });
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

/**
 * Admin login endpoint
 * POST /api/admin/login
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Load users from file
    const fs = require('fs');
    const path = require('path');
    const usersFile = path.join(__dirname, 'users.json');
    
    let users = [];
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      users = JSON.parse(data);
    }

    // Find user in file
    let user = users.find(u => u.username === username);
    let passwordHash = user ? user.passwordHash : null;

    // Fall back to env variables if user not found in file
    if (!user) {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      if (username === adminUsername) {
        passwordHash = process.env.ADMIN_PASSWORD_HASH;
        user = { username, role: 'admin' };
      }
    }

    // Check if user exists
    if (!user || !passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('⚠️ JWT_SECRET not set in .env');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`✅ Admin login successful: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin'
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * Verify token endpoint
 * GET /api/admin/verify
 */
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token is valid'
  });
});

/**
 * Admin logout (client-side token removal)
 * POST /api/admin/logout
 */
app.post('/api/admin/logout', authenticateToken, (req, res) => {
  console.log(`🔓 Admin logout: ${req.user.username}`);
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
app.get('/api/admin/users', authenticateToken, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    // Load users from file
    const usersFile = path.join(__dirname, 'users.json');
    let users = [];
    
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      users = JSON.parse(data);
    }

    // Remove sensitive data (passwords)
    let sanitizedUsers = users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    // Sort by creation date (newest first)
    sanitizedUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply search filter
    const { search, page = 1, limit = 10 } = req.query;
    if (search) {
      const searchLower = search.toLowerCase();
      sanitizedUsers = sanitizedUsers.filter(u =>
        (u.displayName && u.displayName.toLowerCase().includes(searchLower)) ||
        (u.username && u.username.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower))
      );
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = sanitizedUsers.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUsers = sanitizedUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      users: paginatedUsers,
      total: paginatedUsers.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});


/**
 * Get all blog posts (public endpoint with pagination)
 * GET /api/blog/posts
 * Query params: 
 *   - status (optional) - filter by 'published' or 'draft'
 *   - page (optional) - page number (default: 1)
 *   - limit (optional) - items per page (default: 10)
 *   - search (optional) - search term for title, excerpt, or content
 */
app.get('/api/blog/posts', (req, res) => {
  try {
    const { status, page = '1', limit = '10', search = '' } = req.query;
    
    let posts = loadBlogPosts();
    
    // Filter by status if provided
    if (status) {
      posts = posts.filter(post => post.status === status);
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      posts = posts.filter(post => 
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower) ||
        post.category.toLowerCase().includes(searchLower) ||
        post.author.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedPosts = posts.slice(startIndex, endIndex);
    const totalPages = Math.ceil(posts.length / limitNum);
    const hasMore = pageNum < totalPages;
    
    res.json({
      success: true,
      posts: paginatedPosts,
      pagination: {
        total: posts.length,
        page: pageNum,
        limit: limitNum,
        totalPages: totalPages,
        hasMore: hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog posts'
    });
  }
});

/**
 * Get a single blog post by ID
 * GET /api/blog/posts/:id
 */
app.get('/api/blog/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const posts = loadBlogPosts();
    const post = posts.find(p => p.id === id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Increment views for published posts
    if (post.status === 'published') {
      post.views += 1;
      saveBlogPost(post);
    }
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog post'
    });
  }
});

/**
 * Get a single blog post by slug
 * GET /api/blog/posts/slug/:slug
 */
app.get('/api/blog/posts/slug/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const posts = loadBlogPosts();
    const post = posts.find(p => p.slug === slug);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Increment views for published posts
    if (post.status === 'published') {
      post.views += 1;
      saveBlogPost(post);
    }
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog post'
    });
  }
});

/**
 * Upload blog post image (admin only)
 * POST /api/blog/upload-image
 * 
 * Expects: multipart/form-data with 'image' field
 * Returns: { success: true, imageUrl: "/uploads/blog-images/blog-123456.jpg" }
 */
app.post('/api/blog/upload-image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    // Check for file validation errors
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        error: req.fileValidationError
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }
    
    // Generate the URL for the uploaded image
    const imageUrl = `/uploads/blog-images/${req.file.filename}`;
    
    console.log(`📸 Blog image uploaded: ${req.file.filename} (${(req.file.size / 1024).toFixed(2)} KB)`);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

/**
 * Create a new blog post (admin only)
 * POST /api/blog/posts
 */
app.post('/api/blog/posts', authenticateToken, (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      category,
      status,
      author,
      readTime,
      image,
      audioUrl,
      slug
    } = req.body;
    
    // Validate required fields
    if (!title || !excerpt || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, excerpt, content'
      });
    }
    
    // Generate or validate slug
    let postSlug = slug || generateSlug(title);
    postSlug = ensureUniqueSlug(postSlug);
    
    // Create new post
    const newPost = {
      id: Date.now().toString(),
      title,
      slug: postSlug,
      excerpt,
      content,
      category: category || 'Trading Tips',
      status: status || 'draft',
      date: new Date().toISOString().split('T')[0],
      author: author || 'Admin',
      views: 0,
      readTime: readTime || '5 min read',
      image: image || '',
      audioUrl: audioUrl || ''
    };
    
    // Save to file
    const saved = saveBlogPost(newPost);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save blog post'
      });
    }
    
    res.status(201).json({
      success: true,
      post: newPost,
      message: 'Blog post created successfully'
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create blog post'
    });
  }
});

/**
 * Update a blog post (admin only)
 * PUT /api/blog/posts/:id
 */
app.put('/api/blog/posts/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const posts = loadBlogPosts();
    const post = posts.find(p => p.id === id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Handle slug updates
    if (updateData.slug && updateData.slug !== post.slug) {
      // Validate and ensure unique slug
      updateData.slug = generateSlug(updateData.slug);
      updateData.slug = ensureUniqueSlug(updateData.slug, id);
    } else if (updateData.title && updateData.title !== post.title && !updateData.slug) {
      // If title changes but no slug provided, regenerate slug from title
      updateData.slug = generateSlug(updateData.title);
      updateData.slug = ensureUniqueSlug(updateData.slug, id);
    }
    
    // If image is being changed, delete the old image
    if (updateData.image !== undefined && post.image && updateData.image !== post.image) {
      deleteImageFile(post.image);
      console.log(`🗑️ Deleted old image during update: ${post.image}`);
    }
    
    // If image is being removed (set to empty string), delete the old image
    if (updateData.image === '' && post.image) {
      deleteImageFile(post.image);
      console.log(`🗑️ Deleted image during removal: ${post.image}`);
    }
    
    // Update post with new data
    const updatedPost = {
      ...post,
      ...updateData,
      id // Preserve the ID
    };
    
    // Save updated post to file
    const saved = saveBlogPost(updatedPost);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save updated blog post'
      });
    }
    
    res.json({
      success: true,
      post: updatedPost,
      message: 'Blog post updated successfully'
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blog post'
    });
  }
});

/**
 * Delete a blog post (admin only)
 * DELETE /api/blog/posts/:id
 */
app.delete('/api/blog/posts/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const posts = loadBlogPosts();
    const post = posts.find(p => p.id === id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Delete associated image file if exists
    if (post.image) {
      deleteImageFile(post.image);
    }
    
    // Delete the file
    const deleted = deleteBlogPost(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete blog post file'
      });
    }
    
    res.json({
      success: true,
      post: post,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog post'
    });
  }
});

/**
 * Get blog statistics (admin only)
 * GET /api/blog/stats
 */
app.get('/api/blog/stats', authenticateToken, (req, res) => {
  try {
    const posts = loadBlogPosts();
    
    const stats = {
      total: posts.length,
      published: posts.filter(p => p.status === 'published').length,
      drafts: posts.filter(p => p.status === 'draft').length,
      totalViews: posts.reduce((sum, p) => sum + p.views, 0)
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog statistics'
    });
  }
});

/**
 * Generate XML sitemap for SEO
 * GET /sitemap.xml
 */
app.get('/sitemap.xml', (req, res) => {
  try {
    const posts = loadBlogPosts().filter(p => p.status === 'published');
    const baseUrl = process.env.FRONTEND_URL || 'https://technests.ai';
    
    // Start XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add homepage
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';
    
    // Add blog listing page
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/blog</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
    
    // Add all published blog posts
    posts.forEach(post => {
      // Use slug if available, fallback to id for backwards compatibility
      const urlPath = post.slug || post.id;
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blog/${urlPath}</loc>\n`;
      xml += `    <lastmod>${post.updatedAt || post.date}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });
    
    // Add static pages
    const staticPages = [
      { url: '/pricing', priority: '0.9' },
      { url: '/products', priority: '0.9' },
      { url: '/about', priority: '0.7' },
      { url: '/contact', priority: '0.7' },
      { url: '/comparisons', priority: '0.6' },
      { url: '/privacy-policy', priority: '0.5' },
      { url: '/terms-of-service', priority: '0.5' },
      { url: '/refund-policy', priority: '0.5' },
      { url: '/risk-disclaimer', priority: '0.5' }
    ];
    
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
    
    console.log(`🗺️ Sitemap generated with ${posts.length + staticPages.length + 2} URLs`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Generate robots.txt for SEO
 * GET /robots.txt
 */
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://technests.ai';
  
  const robotsTxt = `# TechNests Robots.txt
User-agent: *
Allow: /
Allow: /blog
Allow: /blog/*
Allow: /products
Allow: /pricing

# Disallow admin pages
Disallow: /admin
Disallow: /admin/*
Disallow: /api/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1
`;
  
  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
  
  console.log('🤖 Robots.txt served');
});

// ============================================
// PRICING/PRODUCTS MANAGEMENT ENDPOINTS
// ============================================

const PRICING_PRODUCTS_DIR = path.join(__dirname, 'pricing_products');

// Ensure pricing products directory exists
if (!fs.existsSync(PRICING_PRODUCTS_DIR)) {
  fs.mkdirSync(PRICING_PRODUCTS_DIR, { recursive: true });
  console.log('📁 Created pricing_products directory');
}

// Helper functions for pricing products
const getPricingProductFilePath = (id) => path.join(PRICING_PRODUCTS_DIR, `${id}.json`);

const loadPricingProducts = () => {
  try {
    const files = fs.readdirSync(PRICING_PRODUCTS_DIR);
    const products = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(PRICING_PRODUCTS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const product = JSON.parse(fileContent);
        products.push(product);
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error loading pricing products:', error);
    return [];
  }
};

const savePricingProduct = (product) => {
  try {
    const filePath = getPricingProductFilePath(product.id);
    fs.writeFileSync(filePath, JSON.stringify(product, null, 2), 'utf8');
    console.log(`✅ Saved pricing product: ${product.id} - ${product.name}`);
    return true;
  } catch (error) {
    console.error('Error saving pricing product:', error);
    return false;
  }
};

const deletePricingProduct = (id) => {
  try {
    const filePath = getPricingProductFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted pricing product: ${id}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting pricing product:', error);
    return false;
  }
};

// Initialize with default products if directory is empty
const initializePricingProducts = () => {
  const existingProducts = loadPricingProducts();
  
  if (existingProducts.length === 0) {
    console.log('💰 Initializing with default pricing products...');
    
    const defaultProducts = [
      {
        id: "prop-trade-planner",
        name: "Prop Trade Planner",
        price: 49.99,
        billingPeriod: "month",
        description: "Complete planning solution for prop traders",
        features: ["Trade Planning", "Risk Management", "Daily Goals", "Performance Tracking"],
        subscriptionLink: "",
        trialPrice: 59.99,
        subscriptionPrice: 49.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: true,
        status: "active",
        order: 1
      },
      {
        id: "traderx",
        name: "TradeRx",
        price: 69.99,
        billingPeriod: "month",
        description: "Advanced trading analytics and insights",
        features: ["Real-time Analytics", "Trade Analysis", "Pattern Recognition", "Custom Alerts"],
        subscriptionLink: "",
        trialPrice: 74.99,
        subscriptionPrice: 69.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: true,
        status: "active",
        order: 2
      },
      {
        id: "journalx",
        name: "JournalX",
        price: 39.99,
        billingPeriod: "month",
        description: "Professional trading journal",
        features: ["Trade Journaling", "Performance Reports", "Emotion Tracking", "Notes & Tags"],
        subscriptionLink: "",
        trialPrice: 49.99,
        subscriptionPrice: 39.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: true,
        status: "active",
        order: 3
      },
      {
        id: "tradecam",
        name: "TradeCam",
        price: 24.99,
        billingPeriod: "month",
        description: "Screen recording for traders",
        features: ["HD Screen Recording", "Multi-Monitor Support", "Cloud Storage", "Easy Sharing"],
        subscriptionLink: "",
        trialPrice: 39,
        subscriptionPrice: 24.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 4
      },
      {
        id: "trade-video-recorder",
        name: "Trade Video Recorder",
        price: 29.99,
        billingPeriod: "month",
        description: "Record and review your trading sessions",
        features: ["Session Recording", "Playback Analysis", "Annotations", "Export Options"],
        subscriptionLink: "",
        trialPrice: 49,
        subscriptionPrice: 29.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 5
      },
      {
        id: "regular-updates",
        name: "Regular Updates",
        price: 29.99,
        billingPeriod: "month",
        description: "Stay current with latest features",
        features: ["Monthly Updates", "New Features", "Bug Fixes", "Priority Support"],
        subscriptionLink: "",
        trialPrice: 0,
        subscriptionPrice: 29.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 6
      },
      {
        id: "white-glove-setup",
        name: "White-Glove Prop Trading Environment Setup",
        price: 249.99,
        billingPeriod: "one-time",
        description: "Complete professional setup service",
        features: ["Full Environment Setup", "Custom Configuration", "Training Session", "30-Day Support"],
        subscriptionLink: "",
        trialPrice: 0,
        subscriptionPrice: 0,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 7
      },
      {
        id: "custom-strategy",
        name: "Custom Strategy Development (Advisory)",
        price: 2749.99,
        billingPeriod: "one-time",
        description: "Personalized trading strategy development",
        features: ["Strategy Analysis", "Custom Development", "Backtesting", "Implementation Guide"],
        subscriptionLink: "",
        trialPrice: 0,
        subscriptionPrice: 0,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 8
      },
      {
        id: "coaching",
        name: "One-on-One Prop Firm Journey Coaching",
        price: 349.99,
        billingPeriod: "one-time",
        description: "Personal coaching for prop firm success",
        features: ["1-on-1 Sessions", "Personalized Plan", "Weekly Check-ins", "Email Support"],
        subscriptionLink: "",
        trialPrice: 0,
        subscriptionPrice: 0,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: true,
        featured: false,
        status: "active",
        order: 9
      },
      {
        id: "prop-trade-planner-trial",
        name: "Prop Trade Planner Trial",
        price: 59.99,
        billingPeriod: "trial",
        description: "Try Prop Trade Planner risk-free",
        features: ["Full Access", "14-Day Trial", "No Commitment", "Cancel Anytime"],
        subscriptionLink: "",
        trialPrice: 59.99,
        subscriptionPrice: 49.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 10
      },
      {
        id: "traderx-trial",
        name: "TradeRx - Trial",
        price: 74.99,
        billingPeriod: "trial",
        description: "Try TradeRx risk-free",
        features: ["Full Access", "14-Day Trial", "No Commitment", "Cancel Anytime"],
        subscriptionLink: "",
        trialPrice: 74.99,
        subscriptionPrice: 69.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 11
      },
      {
        id: "journalx-trial",
        name: "JournalX Trial",
        price: 49.99,
        billingPeriod: "trial",
        description: "Try JournalX risk-free",
        features: ["Full Access", "14-Day Trial", "No Commitment", "Cancel Anytime"],
        subscriptionLink: "",
        trialPrice: 49.99,
        subscriptionPrice: 39.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 12
      },
      {
        id: "tradecam-trial",
        name: "TradeCam Trial",
        price: 39,
        billingPeriod: "trial",
        description: "Try TradeCam risk-free",
        features: ["Full Access", "14-Day Trial", "No Commitment", "Cancel Anytime"],
        subscriptionLink: "",
        trialPrice: 39,
        subscriptionPrice: 24.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 13
      },
      {
        id: "trade-video-recorder-trial",
        name: "Trade Video Recorder Trial",
        price: 49,
        billingPeriod: "trial",
        description: "Try Trade Video Recorder risk-free",
        features: ["Full Access", "14-Day Trial", "No Commitment", "Cancel Anytime"],
        subscriptionLink: "",
        trialPrice: 49,
        subscriptionPrice: 29.99,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: false,
        status: "active",
        order: 14
      },
      {
        id: "core-bundle-trial",
        name: "Core Bundle Trial — Planner + TradeRx + JournalX",
        price: 99,
        billingPeriod: "trial",
        description: "Try our complete suite risk-free",
        features: ["All Three Products", "14-Day Trial", "No Commitment", "Cancel Anytime"],
        subscriptionLink: "",
        trialPrice: 99,
        subscriptionPrice: 0,
        trialStripeLink: "",
        subscriptionStripeLink: "",
        coachingEnabled: false,
        featured: true,
        status: "active",
        order: 15
      }
    ];
    
    defaultProducts.forEach(product => savePricingProduct(product));
    console.log(`✅ Initialized ${defaultProducts.length} pricing products`);
  }
};

// Initialize pricing products on startup
initializePricingProducts();

/**
 * Get all pricing products (public)
 * GET /api/pricing/products
 */
app.get('/api/pricing/products', (req, res) => {
  try {
    let products = loadPricingProducts();
    
    // Filter by status if specified
    const { status, search, page = 1, limit = 10 } = req.query;
    if (status) {
      products = products.filter(p => p.status === status);
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by order
    products.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = products.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      products: paginatedProducts,
      count: paginatedProducts.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching pricing products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing products'
    });
  }
});

/**
 * Get single pricing product by ID (public)
 * GET /api/pricing/products/:id
 */
app.get('/api/pricing/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const products = loadPricingProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Pricing product not found'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching pricing product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing product'
    });
  }
});

/**
 * Create new pricing product (admin only)
 * POST /api/pricing/products
 */
app.post('/api/pricing/products', authenticateToken, (req, res) => {
  try {
    const productData = req.body;
    
    // Generate ID from name if not provided
    if (!productData.id) {
      productData.id = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Check if product with this ID already exists
    const existingProducts = loadPricingProducts();
    if (existingProducts.find(p => p.id === productData.id)) {
      return res.status(400).json({
        success: false,
        error: 'Product with this ID already exists'
      });
    }
    
    // Set defaults
    const newProduct = {
      ...productData,
      status: productData.status || 'active',
      featured: productData.featured || false,
      order: productData.order || existingProducts.length + 1,
      features: productData.features || [],
      subscriptionLink: productData.subscriptionLink || ''
    };
    
    const saved = savePricingProduct(newProduct);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save pricing product'
      });
    }
    
    res.status(201).json({
      success: true,
      product: newProduct,
      message: 'Pricing product created successfully'
    });
  } catch (error) {
    console.error('Error creating pricing product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pricing product'
    });
  }
});

/**
 * Update pricing product (admin only)
 * PUT /api/pricing/products/:id
 */
app.put('/api/pricing/products/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const products = loadPricingProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Pricing product not found'
      });
    }
    
    // Update product with new data
    const updatedProduct = {
      ...product,
      ...updateData,
      id // Preserve the ID
    };
    
    const saved = savePricingProduct(updatedProduct);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save updated pricing product'
      });
    }
    
    res.json({
      success: true,
      product: updatedProduct,
      message: 'Pricing product updated successfully'
    });
  } catch (error) {
    console.error('Error updating pricing product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pricing product'
    });
  }
});

/**
 * Delete pricing product (admin only)
 * DELETE /api/pricing/products/:id
 */
app.delete('/api/pricing/products/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const products = loadPricingProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Pricing product not found'
      });
    }
    
    const deleted = deletePricingProduct(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete pricing product file'
      });
    }
    
    res.json({
      success: true,
      product: product,
      message: 'Pricing product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pricing product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pricing product'
    });
  }
});

// ============================================
// STRIPE SUBSCRIBERS ENDPOINT (ADMIN)
// ============================================

/**
 * Get all Stripe subscribers (admin only)
 * GET /api/admin/stripe/subscribers?page=1&limit=20
 */
app.get('/api/admin/stripe/subscribers', authenticateToken, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: "Stripe is not configured on the server",
      });
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const allSubscriptions = [];
    let hasMore = true;
    let startingAfter = undefined;
    let fetchedCount = 0;

    // Fetch all subscriptions with pagination from Stripe
    while (hasMore) {
      const params = {
        limit: 100,
        status: 'all',
        expand: ['data.customer', 'data.items.data.price'],
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const subscriptions = await stripe.subscriptions.list(params);
      
      for (const sub of subscriptions.data) {
        const customer = sub.customer;
        const price = sub.items?.data?.[0]?.price;
        
        // Fetch product details separately if product is just an ID string
        let productName = null;
        if (price?.product) {
          if (typeof price.product === 'string') {
            try {
              const product = await stripe.products.retrieve(price.product);
              productName = product.name;
            } catch (error) {
              console.error('Error fetching product:', error);
              productName = price.product; // Use product ID as fallback
            }
          } else {
            productName = price.product.name;
          }
        }

        allSubscriptions.push({
          subscription_id: sub.id,
          customer_id: typeof customer === 'string' ? customer : customer?.id,
          email: typeof customer === 'string' ? null : customer?.email,
          customer_name: typeof customer === 'string' ? null : customer?.name,
          status: sub.status,
          plan_id: price?.id || null,
          plan_name: productName,
          plan_amount: price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : null,
          currency: price?.currency || 'usd',
          billing_period: price?.recurring?.interval || 'month',
          subscription_start_date: sub.start_date 
            ? new Date(sub.start_date * 1000).toISOString() 
            : null,
          current_period_start: sub.current_period_start 
            ? new Date(sub.current_period_start * 1000).toISOString() 
            : null,
          current_period_end: sub.current_period_end 
            ? new Date(sub.current_period_end * 1000).toISOString() 
            : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at 
            ? new Date(sub.canceled_at * 1000).toISOString() 
            : null,
        });
      }

      hasMore = subscriptions.has_more;
      if (hasMore) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    // Calculate statistics from all data
    const stats = {
      total: allSubscriptions.length,
      active: allSubscriptions.filter(s => s.status === 'active').length,
      trialing: allSubscriptions.filter(s => s.status === 'trialing').length,
      past_due: allSubscriptions.filter(s => s.status === 'past_due').length,
      canceled: allSubscriptions.filter(s => s.status === 'canceled').length,
      incomplete: allSubscriptions.filter(s => s.status === 'incomplete').length,
      unpaid: allSubscriptions.filter(s => s.status === 'unpaid').length,
    };

    // Apply pagination to results
    const paginatedSubscriptions = allSubscriptions.slice(skip, skip + limit);
    const totalPages = Math.ceil(allSubscriptions.length / limit);

    res.json({
      success: true,
      subscriptions: paginatedSubscriptions,
      stats,
      pagination: {
        page,
        limit,
        total: allSubscriptions.length,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error('Error fetching Stripe subscribers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Stripe subscribers',
      details: error.message,
    });
  }
});

// ============================================
// SUBSCRIPTION MANAGEMENT ENDPOINTS (ADMIN)
// ============================================

/**
 * Get all permanent subscriptions (admin only)
 * GET /api/admin/subscriptions/permanent?search=query
 */
app.get('/api/admin/subscriptions/permanent', authenticateToken, (req, res) => {
  try {
    let subscriptions = loadPermanentSubscriptions();
    
    // Apply search filter if provided
    const searchQuery = req.query.search;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      subscriptions = subscriptions.filter(sub => 
        sub.email.toLowerCase().includes(query) ||
        sub.planNickname.toLowerCase().includes(query) ||
        (sub.notes && sub.notes.toLowerCase().includes(query)) ||
        sub.addedBy.toLowerCase().includes(query)
      );
    }
    
    res.json({
      success: true,
      subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Error fetching permanent subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permanent subscriptions'
    });
  }
});

/**
 * Get all temporary subscriptions (admin only)
 * GET /api/admin/subscriptions/temporary?search=query
 */
app.get('/api/admin/subscriptions/temporary', authenticateToken, (req, res) => {
  try {
    let subscriptions = loadTemporarySubscriptions();
    
    // Apply search filter if provided
    const searchQuery = req.query.search;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      subscriptions = subscriptions.filter(sub => 
        sub.email.toLowerCase().includes(query) ||
        sub.planNickname.toLowerCase().includes(query) ||
        (sub.notes && sub.notes.toLowerCase().includes(query)) ||
        sub.addedBy.toLowerCase().includes(query)
      );
    }
    
    // Add expiration status to each subscription
    const now = new Date();
    const subscriptionsWithStatus = subscriptions.map(sub => ({
      ...sub,
      isExpired: new Date(sub.endDate) < now,
      isActive: new Date(sub.startDate) <= now && new Date(sub.endDate) >= now
    }));
    
    res.json({
      success: true,
      subscriptions: subscriptionsWithStatus,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Error fetching temporary subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch temporary subscriptions'
    });
  }
});

/**
 * Add permanent subscription (admin only)
 * POST /api/admin/subscriptions/permanent
 */
app.post('/api/admin/subscriptions/permanent', authenticateToken, (req, res) => {
  try {
    const { email, planNickname, notes } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const subscriptions = loadPermanentSubscriptions();
    
    // Check if subscription already exists
    const exists = subscriptions.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Permanent subscription already exists for this email'
      });
    }
    
    // Generate new ID
    const maxId = subscriptions.reduce((max, s) => {
      const num = parseInt(s.id.replace('perm_', ''));
      return num > max ? num : max;
    }, 0);
    
    const newSubscription = {
      id: `perm_${String(maxId + 1).padStart(3, '0')}`,
      email: email.toLowerCase(),
      planNickname: planNickname || 'all',
      addedDate: new Date().toISOString(),
      addedBy: req.user.username,
      notes: notes || '',
      status: 'active'
    };
    
    subscriptions.push(newSubscription);
    
    const saved = savePermanentSubscriptions(subscriptions);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save permanent subscription'
      });
    }
    
    // Reload whitelist
    permanentWhitelist = loadPermanentSubscriptions().filter(s => s.status === 'active').map(s => s.email);
    
    console.log(`✅ Added permanent subscription: ${email} by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      subscription: newSubscription,
      message: 'Permanent subscription added successfully'
    });
  } catch (error) {
    console.error('Error adding permanent subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add permanent subscription'
    });
  }
});

/**
 * Add temporary subscription (admin only)
 * POST /api/admin/subscriptions/temporary
 */
app.post('/api/admin/subscriptions/temporary', authenticateToken, (req, res) => {
  try {
    const { email, planNickname, startDate, endDate, notes } = req.body;
    
    if (!email || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Email, startDate, and endDate are required'
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }
    
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }
    
    const subscriptions = loadTemporarySubscriptions();
    
    // Check if active subscription already exists
    const now = new Date();
    const exists = subscriptions.find(s => 
      s.email.toLowerCase() === email.toLowerCase() && 
      s.status === 'active' &&
      new Date(s.endDate) > now
    );
    
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Active temporary subscription already exists for this email'
      });
    }
    
    // Generate new ID
    const maxId = subscriptions.reduce((max, s) => {
      const num = parseInt(s.id.replace('temp_', ''));
      return num > max ? num : max;
    }, 0);
    
    const newSubscription = {
      id: `temp_${String(maxId + 1).padStart(3, '0')}`,
      email: email.toLowerCase(),
      planNickname: planNickname || 'all',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      addedDate: new Date().toISOString(),
      addedBy: req.user.username,
      notes: notes || '',
      status: 'active'
    };
    
    subscriptions.push(newSubscription);
    
    const saved = saveTemporarySubscriptions(subscriptions);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save temporary subscription'
      });
    }
    
    // Reload whitelist
    temporaryWhitelist = loadTemporarySubscriptions().filter(s => s.status === 'active').map(s => ({
      email: s.email,
      start_date: s.startDate,
      end_date: s.endDate,
      planNickname: s.planNickname
    }));
    
    console.log(`✅ Added temporary subscription: ${email} by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      subscription: newSubscription,
      message: 'Temporary subscription added successfully'
    });
  } catch (error) {
    console.error('Error adding temporary subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add temporary subscription'
    });
  }
});

/**
 * Update permanent subscription (admin only)
 * PUT /api/admin/subscriptions/permanent/:id
 */
app.put('/api/admin/subscriptions/permanent/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const subscriptions = loadPermanentSubscriptions();
    const index = subscriptions.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Permanent subscription not found'
      });
    }
    
    // Update subscription
    subscriptions[index] = {
      ...subscriptions[index],
      ...updateData,
      id, // Preserve ID
      email: updateData.email ? updateData.email.toLowerCase() : subscriptions[index].email
    };
    
    const saved = savePermanentSubscriptions(subscriptions);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save updated subscription'
      });
    }
    
    // Reload whitelist
    permanentWhitelist = loadPermanentSubscriptions().filter(s => s.status === 'active').map(s => s.email);
    
    console.log(`✅ Updated permanent subscription: ${id} by ${req.user.username}`);
    
    res.json({
      success: true,
      subscription: subscriptions[index],
      message: 'Permanent subscription updated successfully'
    });
  } catch (error) {
    console.error('Error updating permanent subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update permanent subscription'
    });
  }
});

/**
 * Update temporary subscription (admin only)
 * PUT /api/admin/subscriptions/temporary/:id
 */
app.put('/api/admin/subscriptions/temporary/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const subscriptions = loadTemporarySubscriptions();
    const index = subscriptions.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Temporary subscription not found'
      });
    }
    
    // Validate dates if provided
    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);
      
      if (end <= start) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
    }
    
    // Update subscription
    subscriptions[index] = {
      ...subscriptions[index],
      ...updateData,
      id, // Preserve ID
      email: updateData.email ? updateData.email.toLowerCase() : subscriptions[index].email
    };
    
    const saved = saveTemporarySubscriptions(subscriptions);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save updated subscription'
      });
    }
    
    // Reload whitelist
    temporaryWhitelist = loadTemporarySubscriptions().filter(s => s.status === 'active').map(s => ({
      email: s.email,
      start_date: s.startDate,
      end_date: s.endDate,
      planNickname: s.planNickname
    }));
    
    console.log(`✅ Updated temporary subscription: ${id} by ${req.user.username}`);
    
    res.json({
      success: true,
      subscription: subscriptions[index],
      message: 'Temporary subscription updated successfully'
    });
  } catch (error) {
    console.error('Error updating temporary subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update temporary subscription'
    });
  }
});

/**
 * Delete permanent subscription (admin only)
 * DELETE /api/admin/subscriptions/permanent/:id
 */
app.delete('/api/admin/subscriptions/permanent/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const subscriptions = loadPermanentSubscriptions();
    const index = subscriptions.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Permanent subscription not found'
      });
    }
    
    const deletedSubscription = subscriptions[index];
    subscriptions.splice(index, 1);
    
    const saved = savePermanentSubscriptions(subscriptions);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete subscription'
      });
    }
    
    // Reload whitelist
    permanentWhitelist = loadPermanentSubscriptions().filter(s => s.status === 'active').map(s => s.email);
    
    console.log(`🗑️ Deleted permanent subscription: ${id} by ${req.user.username}`);
    
    res.json({
      success: true,
      subscription: deletedSubscription,
      message: 'Permanent subscription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permanent subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete permanent subscription'
    });
  }
});

/**
 * Delete temporary subscription (admin only)
 * DELETE /api/admin/subscriptions/temporary/:id
 */
app.delete('/api/admin/subscriptions/temporary/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const subscriptions = loadTemporarySubscriptions();
    const index = subscriptions.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Temporary subscription not found'
      });
    }
    
    const deletedSubscription = subscriptions[index];
    subscriptions.splice(index, 1);
    
    const saved = saveTemporarySubscriptions(subscriptions);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete subscription'
      });
    }
    
    // Reload whitelist
    temporaryWhitelist = loadTemporarySubscriptions().filter(s => s.status === 'active').map(s => ({
      email: s.email,
      start_date: s.startDate,
      end_date: s.endDate,
      planNickname: s.planNickname
    }));
    
    console.log(`🗑️ Deleted temporary subscription: ${id} by ${req.user.username}`);
    
    res.json({
      success: true,
      subscription: deletedSubscription,
      message: 'Temporary subscription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting temporary subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete temporary subscription'
    });
  }
});

/**
 * Get subscription statistics (admin only)
 * GET /api/admin/subscriptions/stats
 */
app.get('/api/admin/subscriptions/stats', authenticateToken, (req, res) => {
  try {
    const permanentSubs = loadPermanentSubscriptions();
    const temporarySubs = loadTemporarySubscriptions();
    
    const now = new Date();
    
    const activeTemp = temporarySubs.filter(s => 
      s.status === 'active' && 
      new Date(s.startDate) <= now && 
      new Date(s.endDate) >= now
    );
    
    const expiredTemp = temporarySubs.filter(s => 
      new Date(s.endDate) < now
    );
    
    const upcomingTemp = temporarySubs.filter(s => 
      new Date(s.startDate) > now
    );
    
    const stats = {
      permanent: {
        total: permanentSubs.length,
        active: permanentSubs.filter(s => s.status === 'active').length,
        inactive: permanentSubs.filter(s => s.status === 'inactive').length
      },
      temporary: {
        total: temporarySubs.length,
        active: activeTemp.length,
        expired: expiredTemp.length,
        upcoming: upcomingTemp.length
      },
      totalActiveSubscriptions: permanentSubs.filter(s => s.status === 'active').length + activeTemp.length
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching subscription statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription statistics'
    });
  }
});

// ==== EXPORT APP ====
module.exports = app;
