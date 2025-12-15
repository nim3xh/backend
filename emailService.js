require("dotenv").config();
const nodemailer = require("nodemailer");

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.warn("⚠ GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env");
}

// Singleton transporter with connection pooling to prevent rate limiting
let transporter = null;
let lastEmailTime = 0;
const MIN_EMAIL_INTERVAL = parseInt(process.env.EMAIL_RATE_LIMIT) || 2000; // Configurable rate limit

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      pool: true, // Use connection pool
      maxConnections: 1, // Limit concurrent connections
      maxMessages: 10, // Max messages per connection
      rateDelta: 2000, // Min time between messages (2 seconds)
      rateLimit: 1, // Max messages per rateDelta period
    });

    // Handle transporter errors
    transporter.on('error', (err) => {
      console.error('❌ Transporter error:', err.message);
    });
  }
  return transporter;
}

// Rate limiting helper
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailTime;
  
  if (timeSinceLastEmail < MIN_EMAIL_INTERVAL) {
    const waitTime = MIN_EMAIL_INTERVAL - timeSinceLastEmail;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms before sending email...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastEmailTime = Date.now();
}

/**
 * Send an email using Gmail with retry logic and rate limiting.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} [html] - Optional HTML body
 * @param {number} [retryCount] - Internal retry counter
 */
async function sendEmail({ to, subject, text, html }, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s
  
  try {
    // Apply rate limiting
    await waitForRateLimit();
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      bcc: "nimesh@technests.ai",
      subject,
      text,
      ...(html ? { html } : {}),
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (error) {
    const isRateLimitError = 
      error.message.includes('Too many login attempts') ||
      error.message.includes('454') ||
      error.message.includes('rate limit');
    
    // Retry on rate limit errors
    if (isRateLimitError && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount];
      console.warn(`⚠ Rate limit hit. Retrying in ${delay/1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      // Close existing transporter to reset connection
      if (transporter) {
        transporter.close();
        transporter = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEmail({ to, subject, text, html }, retryCount + 1);
    }
    
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
}

/**
 * Generate professional HTML email template for subscription confirmation
 * 
 * @param {string} productName - Name of the product/subscription
 * @param {string} downloadLink - Download link for the product
 * @param {string} customerName - Optional customer name
 */
function generateSubscriptionEmailTemplate(productName, downloadLink, customerName = "Valued Customer") {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #ffffff;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .content h2 {
          color: #1a1a2e;
          margin-top: 0;
          font-weight: 600;
        }
        .product-info {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-left: 4px solid #d4af37;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .product-info h3 {
          margin: 0 0 10px 0;
          color: #1a1a2e;
          font-weight: 600;
        }
        .release-notes {
          background-color: #f8f9fa;
          border-left: 4px solid #0066cc;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .release-notes h3 {
          margin: 0 0 15px 0;
          color: #1a1a2e;
          font-weight: 600;
        }
        .release-notes ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .release-notes li {
          margin: 8px 0;
          line-height: 1.6;
        }
        .feature-highlight {
          background-color: #fff9e6;
          border-left: 3px solid #d4af37;
          padding: 12px 15px;
          margin: 10px 0;
          border-radius: 3px;
        }
        .download-button {
          display: inline-block;
          background: linear-gradient(135deg, #d4af37 0%, #c5a028 100%);
          color: #1a1a2e;
          text-decoration: none;
          padding: 16px 50px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
          box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
          transition: all 0.3s ease;
        }
        .download-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(212, 175, 55, 0.4);
        }
        .download-section {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 30px;
          text-align: center;
          margin-top: 30px;
        }
        .download-section p {
          color: #ffffff;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .footer {
          background-color: #1a1a2e;
          padding: 20px 30px;
          text-align: center;
          font-size: 14px;
          color: #cccccc;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
          margin: 25px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Thank You for Your Subscription!</h1>
        </div>
        <div class="content">
          <p>Dear ${customerName},</p>
          
          <p>Thank you for subscribing to our service! We're thrilled to have you on board and excited to help you get the most out of your subscription.</p>
          
          <div class="product-info">
            <h3>Your Subscription:</h3>
            <p><strong>${productName}</strong></p>
          </div>
          
          <p>Your subscription has been successfully activated, and you now have full access to all the features and benefits.</p>
          
          <div class="divider"></div>
          
          <div class="release-notes">
            <h3>🚀 Latest TradeRx Update - What's New</h3>
            
            <div class="feature-highlight">
              <strong>New Accounts Per Signal Options</strong>
            </div>
            <ul>
              <li><strong>TradeRx (Default)</strong> - Preserves current behavior with dynamic scheduling and account-density logic</li>
              <li><strong>Fixed Sizing Options: 1, 2, 3, 4, 5</strong> - Take trades on exactly that many active accounts per signal (account-density logic ignored)</li>
              <li><strong>ALL Option</strong> - Every signal triggers trades on all active accounts</li>
            </ul>
            
            <div class="feature-highlight">
              <strong>Enhanced Output Window</strong>
            </div>
            <ul>
              <li>Clearer "Daily Plan" summary for better overview</li>
              <li>Cleaner "Entry" and "Exit" trade line displays</li>
              <li>End-of-day results summary when trading completes</li>
            </ul>
          </div>
          
          <div class="divider"></div>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Download and install your product using the button below</li>
            <li>Explore the new Accounts Per Signal dropdown options</li>
            <li>Check out the improved Output window messaging</li>
            <li>Contact our support team if you need any assistance</li>
          </ul>
          
          <p>If you have any questions or need help getting started, please don't hesitate to reach out to our support team. We're here to help!</p>
          
          <p>Thank you for choosing us. We look forward to serving you!</p>
        </div>
        
        <div class="download-section">
          <p><strong>Ready to get started? Download your product now!</strong></p>
          <a href="${downloadLink}" class="download-button">📥 DOWNLOAD NOW</a>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send a subscription confirmation email
 * 
 * @param {string} to - Recipient email (will be overridden by TEST_EMAIL if set)
 * @param {string} productName - Name of the subscribed product
 * @param {string} downloadLink - Download link for the product
 * @param {string} customerName - Optional customer name
 */
async function sendSubscriptionEmail({ to, productName, downloadLink, customerName = "Valued Customer" }) {
  try {
    // Use test email if configured (for testing without using real customer emails)
    const recipientEmail = process.env.TEST_EMAIL || to;
    
    const subject = `Thank You for Your Subscription to ${productName}!`;
    const html = generateSubscriptionEmailTemplate(productName, downloadLink, customerName);
    const text = `Dear ${customerName},\n\nThank you for subscribing to ${productName}!\n\nYour subscription has been successfully activated. You can download your product here: ${downloadLink}\n\nThank you for choosing us!`;
    
    const info = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });
    
    console.log(`📧 Subscription confirmation email sent to ${recipientEmail} for product: ${productName}`);
    return info;
  } catch (error) {
    console.error("❌ Error sending subscription email:", error.message);
    throw error;
  }
}

/**
 * Close and reset the transporter connection
 * Use this to reset the connection pool if rate limiting persists
 */
function closeTransporter() {
  if (transporter) {
    transporter.close();
    transporter = null;
    console.log('🔌 Email transporter connection closed and reset');
  }
}

module.exports = {
  sendEmail,
  sendSubscriptionEmail,
  generateSubscriptionEmailTemplate,
  closeTransporter,
};
