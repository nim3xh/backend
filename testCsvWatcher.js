/**
 * Test CSV Email Watcher
 * 
 * Run this to manually trigger a check of the CSV file
 * and send any pending emails.
 */

const { checkForNewSubscriptions } = require('./csvEmailWatcher');

console.log('🧪 Testing CSV Email Watcher...\n');

checkForNewSubscriptions()
  .then(() => {
    console.log('\n✅ Test completed');
    console.log('💡 Check the logs above to see if any emails were sent\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
