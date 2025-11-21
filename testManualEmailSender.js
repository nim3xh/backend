/**
 * Test Manual Subscription Email Sender
 * 
 * Tests the manual email sending endpoint
 */

const testCases = [
  {
    name: "TradeCam Subscription",
    data: {
      email: "test@example.com",
      planNickname: "TradeCam",
      customerName: "John Doe"
    }
  },
  {
    name: "TradeRx Subscription (no customer name)",
    data: {
      email: "jane@example.com",
      planNickname: "TradeRx"
    }
  },
  {
    name: "Bundle Subscription",
    data: {
      email: "customer@example.com",
      planNickname: "Core Bundle — Planner + TradeRx + JournalX",
      customerName: "Test Customer"
    }
  },
  {
    name: "Case Insensitive Test",
    data: {
      email: "test@example.com",
      planNickname: "tradecam"
    }
  }
];

console.log('🧪 Manual Email Sender - Test Cases\n');
console.log('=' .repeat(70));
console.log('\nUse these curl commands to test the endpoint:\n');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}:`);
  console.log('-'.repeat(70));
  
  const curlCommand = `curl -X POST http://localhost:3000/send-subscription-email \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testCase.data)}'`;
  
  console.log(curlCommand);
});

console.log('\n' + '='.repeat(70));
console.log('\n📝 PowerShell Format:\n');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}:`);
  console.log('-'.repeat(70));
  
  const psCommand = `Invoke-RestMethod -Uri "http://localhost:3000/send-subscription-email" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body '${JSON.stringify(testCase.data)}'`;
  
  console.log(psCommand);
});

console.log('\n' + '='.repeat(70));
console.log('\n✅ Start your server first: npm start\n');
