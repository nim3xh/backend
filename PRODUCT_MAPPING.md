# 📦 Product Download Link Mapping

## Overview

The system automatically maps **Plan Nicknames** from the Stripe CSV to the correct download links. Each product gets its own unique download URL based on the plan name.

---

## How It Works

```
CSV Updated → Plan Nickname detected → 
Mapped to download link → Email sent with correct link
```

### Example

```
Plan Nickname: "TradeCam"
↓
Download Link: https://app.technests.ai/download/TradeCam
↓
Email sent with TradeCam download button
```

---

## Supported Products

### Main Products
- ✅ Prop Trade Planner - Dr.Markets
- ✅ TradeRx
- ✅ JournalX
- ✅ TradeCam
- ✅ Trade Video Recorder
- ✅ Regular Updates
- ✅ White-Glove Prop Trading Environment Setup
- ✅ Custom Strategy Development (Advisory)
- ✅ One-on-one Prop Firm Journey Coaching

### Trial Products
- ✅ Prop Trade Planner Dr.Markets Trial
- ✅ TradeRx - Trial
- ✅ JournalX Trial
- ✅ TradeCam Trial
- ✅ Trade Video Recorder Trial

### Bundles
- ✅ Core Bundle Trial — Planner + TradeRx + JournalX
- ✅ Core Bundle — Planner + TradeRx + JournalX

### Special
- ✅ PropTraderPro (default/fallback)

---

## Mapping Logic

The system tries multiple matching strategies:

### 1. Exact Match (Case-Sensitive)
```
"TradeCam" → /download/TradeCam
```

### 2. Case-Insensitive Match
```
"tradecam" → /download/TradeCam
"TRADECAM" → /download/TradeCam
```

### 3. Partial Match
```
"Cam" → /download/TradeCam (contains)
```

### 4. Fallback to Default
```
"Unknown Product" → /download/proptraderpro
```

---

## Configuration

### Environment Variable

Set your base URL in `.env`:
```env
BASE_URL='https://app.technests.ai'
DEFAULT_DOWNLOAD_LINK='https://app.technests.ai/download/proptraderpro'
```

### File: `productLinkMapper.js`

Edit the mapping object to add/modify products:

```javascript
const PRODUCT_DOWNLOAD_MAP = {
  "TradeCam": "/download/TradeCam",
  "TradeRx": "/download/TradeRx",
  // Add more products here
};
```

---

## Testing

### Test the Mapper

```bash
npm run test:product-mapper
```

**Output:**
```
✅ Matched plan "TradeCam" → https://app.technests.ai/download/TradeCam
✅ Matched plan "TradeRx" → https://app.technests.ai/download/TradeRx
⚠️ No match found for plan "Unknown" → using default
```

### Test with Real CSV

```bash
npm run test:csv-watcher
```

This will read the CSV and show what download links would be used.

---

## Adding New Products

### Option 1: Edit `productLinkMapper.js`

```javascript
const PRODUCT_DOWNLOAD_MAP = {
  // ... existing products ...
  "Your New Product": "/download/Your New Product",
};
```

### Option 2: Programmatically

```javascript
const { addProductMapping } = require('./productLinkMapper');

addProductMapping("New Product", "/download/New Product");
```

---

## Example CSV Processing

### CSV Entry:
```csv
Email,Plan Nickname,Status
john@example.com,TradeCam,active
```

### Processing Flow:
```
1. Read CSV → Plan Nickname: "TradeCam"
2. Map to link → https://app.technests.ai/download/TradeCam
3. Send email → Download button links to TradeCam
4. Customer clicks → Downloads TradeCam.zip
```

---

## Email Template Integration

The download link is automatically inserted into the email:

```html
<a href="https://app.technests.ai/download/TradeCam" 
   class="download-button">
  Download TradeCam Now
</a>
```

---

## Logs

Watch for these messages:

### Success
```
✅ Matched plan "TradeCam" → https://app.technests.ai/download/TradeCam
📧 Sending subscription email...
✅ Email sent with download link
```

### Fallback
```
⚠️ No match found for plan "Unknown Product", using default link
📧 Sending subscription email with default link...
```

---

## API

### Functions

#### `getDownloadLinkByPlanNickname(planNickname)`
Get download link for a plan nickname.

```javascript
const { getDownloadLinkByPlanNickname } = require('./productLinkMapper');

const link = getDownloadLinkByPlanNickname("TradeCam");
// Returns: "https://app.technests.ai/download/TradeCam"
```

#### `getAllProductMappings()`
Get all product mappings.

```javascript
const { getAllProductMappings } = require('./productLinkMapper');

const mappings = getAllProductMappings();
// Returns: { "TradeCam": "/download/TradeCam", ... }
```

#### `addProductMapping(planNickname, downloadPath)`
Add a new product mapping.

```javascript
const { addProductMapping } = require('./productLinkMapper');

addProductMapping("New Product", "/download/New Product");
```

---

## Troubleshooting

### Wrong download link in email?

**Check 1:** Verify Plan Nickname in CSV
```bash
cat stripe/subscriptions.csv
```

**Check 2:** Test the mapper
```bash
npm run test:product-mapper
```

**Check 3:** Check logs for mapping
```
✅ Matched plan "..." → https://...
```

### Product not found?

**Solution 1:** Add to `productLinkMapper.js`
```javascript
"Your Product": "/download/Your Product"
```

**Solution 2:** Check exact spelling in CSV vs mapping

**Solution 3:** Uses default link automatically

### Case sensitivity issues?

The mapper handles case-insensitive matching automatically:
- "TradeCam" ✅
- "tradecam" ✅
- "TRADECAM" ✅
- "TradEcaM" ✅

---

## Product Folder Structure

The download endpoint expects this structure:

```
products/
├── TradeCam/
│   └── TradeCam.zip
├── TradeRx/
│   └── TradeRx.zip
├── JournalX/
│   └── JournalX.zip
└── ... (other products)
```

Each product folder contains a `.zip` file with the same name.

---

## Related Files

- `productLinkMapper.js` - Main mapping logic
- `csvEmailWatcher.js` - Uses mapper for emails
- `emailService.js` - Email template with download link
- `app.js` - Download endpoints
- `testProductMapper.js` - Test script

---

## Benefits

✅ **Automatic** - No manual configuration per customer
✅ **Flexible** - Multiple matching strategies
✅ **Fallback** - Default link if no match
✅ **Easy to update** - Single file to edit
✅ **Case insensitive** - Handles variations
✅ **Testable** - Built-in test scripts

---

**Status**: ✅ Active
**File**: `productLinkMapper.js`
**Test**: `npm run test:product-mapper`
**Date**: November 21, 2025
