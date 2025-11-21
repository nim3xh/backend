/**
 * Test Product Link Mapper
 * 
 * Tests the Plan Nickname to Download Link mapping
 */

require('dotenv').config();
const { getDownloadLinkByPlanNickname, PRODUCT_DOWNLOAD_MAP } = require('./productLinkMapper');

console.log('🧪 Testing Product Link Mapper\n');
console.log('=' .repeat(60));

// Test plans from the CSV
const testPlans = [
  "TradeCam",
  "TradeRx",
  "JournalX",
  "Prop Trade Planner - Dr.Markets",
  "Trade Video Recorder",
  "TradeCam Trial",
  "Core Bundle — Planner + TradeRx + JournalX",
  "Unknown Product", // Should use default
  "tradecam", // Test case insensitive
];

console.log('\n📋 Available Product Mappings:\n');
Object.keys(PRODUCT_DOWNLOAD_MAP).forEach((key, index) => {
  console.log(`${index + 1}. ${key}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n🔍 Testing Plan Nickname Mappings:\n');

testPlans.forEach((plan, index) => {
  console.log(`\nTest ${index + 1}: "${plan}"`);
  const link = getDownloadLinkByPlanNickname(plan);
  console.log(`   Result: ${link}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✅ Test completed\n');
