/**
 * Product Download Link Mapper
 * 
 * Maps Plan Nicknames from Stripe CSV to appropriate download links
 */

const BASE_URL = process.env.BASE_URL || "https://app.technests.ai";

// Map Plan Nicknames to product download paths
const PRODUCT_DOWNLOAD_MAP = {
  // Main Products
  "Prop Trade Planner - Dr.Markets": "/download/Prop Trade Planner - Dr.Markets",
  "TradeRx": "/download/TradeRx",
  "JournalX": "/download/JournalX",
  "TradeCam": "/download/TradeCam",
  "Trade Video Recorder": "/download/Trade Video Recorder",
  "Regular Updates": "/download/Regular Updates",
  "White-Glove Prop Trading Environment Setup": "/download/White-Glove Prop Trading Environment Setup",
  "Custom Strategy Development (Advisory)": "/download/Custom Strategy Development (Advisory)",
  "One-on-one Prop Firm Journey Coaching": "/download/One-on-one Prop Firm Journey Coaching",
  
  // Trial Products
  "Prop Trade Planner Dr.Markets Trial": "/download/Prop Trade Planner Dr.Markets Trial",
  "TradeRx - Trial": "/download/TradeRx - Trial",
  "JournalX Trial": "/download/JournalX Trial",
  "TradeCam Trial": "/download/TradeCam Trial",
  "Trade Video Recorder Trial": "/download/Trade Video Recorder Trial",
  
  // Bundles
  "Core Bundle Trial — Planner + TradeRx + JournalX": "/download/Core Bundle Trial — Planner + TradeRx + JournalX",
  "Core Bundle — Planner + TradeRx + JournalX": "/download/Core Bundle — Planner + TradeRx + JournalX",
  
  // Special
  "PropTraderPro": "/download/proptraderpro",
};

/**
 * Get download link for a plan nickname
 * 
 * @param {string} planNickname - The plan nickname from Stripe CSV
 * @returns {string} - Full download URL
 */
function getDownloadLinkByPlanNickname(planNickname) {
  if (!planNickname || planNickname === "N/A") {
    console.log(`⚠️ No plan nickname provided, using default link`);
    return process.env.DEFAULT_DOWNLOAD_LINK || `${BASE_URL}/download/proptraderpro`;
  }

  // Trim and normalize the plan nickname
  const normalizedPlanName = planNickname.trim();
  
  // Try exact match first
  if (PRODUCT_DOWNLOAD_MAP[normalizedPlanName]) {
    const fullUrl = `${BASE_URL}${PRODUCT_DOWNLOAD_MAP[normalizedPlanName]}`;
    console.log(`✅ Matched plan "${normalizedPlanName}" → ${fullUrl}`);
    return fullUrl;
  }

  // Try case-insensitive match
  const lowerPlanName = normalizedPlanName.toLowerCase();
  const matchedKey = Object.keys(PRODUCT_DOWNLOAD_MAP).find(
    (key) => key.toLowerCase() === lowerPlanName
  );

  if (matchedKey) {
    const fullUrl = `${BASE_URL}${PRODUCT_DOWNLOAD_MAP[matchedKey]}`;
    console.log(`✅ Matched plan "${normalizedPlanName}" (case-insensitive) → ${fullUrl}`);
    return fullUrl;
  }

  // Try partial match (contains)
  const partialMatchKey = Object.keys(PRODUCT_DOWNLOAD_MAP).find((key) =>
    key.toLowerCase().includes(lowerPlanName) || 
    lowerPlanName.includes(key.toLowerCase())
  );

  if (partialMatchKey) {
    const fullUrl = `${BASE_URL}${PRODUCT_DOWNLOAD_MAP[partialMatchKey]}`;
    console.log(`✅ Matched plan "${normalizedPlanName}" (partial) → ${fullUrl}`);
    return fullUrl;
  }

  // No match found, use default
  console.log(`⚠️ No match found for plan "${normalizedPlanName}", using default link`);
  return process.env.DEFAULT_DOWNLOAD_LINK || `${BASE_URL}/download/proptraderpro`;
}

/**
 * Get all available product mappings
 * 
 * @returns {object} - All product mappings
 */
function getAllProductMappings() {
  return PRODUCT_DOWNLOAD_MAP;
}

/**
 * Add or update a product mapping
 * 
 * @param {string} planNickname - Plan nickname
 * @param {string} downloadPath - Download path (without base URL)
 */
function addProductMapping(planNickname, downloadPath) {
  PRODUCT_DOWNLOAD_MAP[planNickname] = downloadPath;
  console.log(`✅ Added mapping: ${planNickname} → ${downloadPath}`);
}

module.exports = {
  getDownloadLinkByPlanNickname,
  getAllProductMappings,
  addProductMapping,
  PRODUCT_DOWNLOAD_MAP,
};
