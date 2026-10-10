const http = require('http');

function request(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 8000, path, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function testPricing() {
  console.log('🧪 Testing Country-Specific Manual Pricing Support...\n');

  // 1. Get all books - verify countryPricing is present
  console.log('--- Test 1: GET /api/books (Default) ---');
  const res1 = await request('/api/books');
  console.log('Status:', res1.status, '| Total Books:', res1.body.data?.length);
  const book1 = res1.body.data?.[0];
  console.log('Book 1 Title:', book1?.title);
  console.log('Book 1 priceUSD:', book1?.priceUSD);
  console.log('Book 1 countryPricing:', book1?.countryPricing);
  if (book1 && book1.countryPricing && book1.countryPricing.INR === 499) {
    console.log('✅ Test 1 Passed: countryPricing returned with book records!\n');
  } else {
    throw new Error('❌ Test 1 Failed: countryPricing missing from Book 1');
  }

  // 2. Query with currency=INR
  console.log('--- Test 2: GET /api/books/1?currency=INR ---');
  const res2 = await request('/api/books/1?currency=INR');
  console.log('Status:', res2.status);
  console.log('Book 1 currentPrice:', res2.body.data?.currentPrice);
  console.log('Book 1 currentCurrency:', res2.body.data?.currentCurrency);
  console.log('Book 1 isManualPrice:', res2.body.data?.isManualPrice);
  if (res2.body.data?.currentPrice === 499 && res2.body.data?.currentCurrency === 'INR' && res2.body.data?.isManualPrice === true) {
    console.log('✅ Test 2 Passed: Manual fixed price for INR (₹499) returned correctly!\n');
  } else {
    throw new Error('❌ Test 2 Failed: INR price resolution failed');
  }

  // 3. Query with country=AU (Australia)
  console.log('--- Test 3: GET /api/books/1?country=AU ---');
  const res3 = await request('/api/books/1?country=AU');
  console.log('Status:', res3.status);
  console.log('Book 1 AUD currentPrice:', res3.body.data?.currentPrice);
  console.log('Book 1 currentCurrency:', res3.body.data?.currentCurrency);
  if (res3.body.data?.currentPrice === 55 && res3.body.data?.currentCurrency === 'AU') {
    console.log('✅ Test 3 Passed: Manual fixed price for Australia (AU $55) returned correctly!\n');
  } else {
    throw new Error('❌ Test 3 Failed: Australia price resolution failed');
  }

  // 4. Query with header X-Currency: GBP
  console.log('--- Test 4: GET /api/books/1 with X-Currency: GBP header ---');
  const res4 = await request('/api/books/1', { 'X-Currency': 'GBP' });
  console.log('Status:', res4.status);
  console.log('Book 1 GBP currentPrice:', res4.body.data?.currentPrice);
  console.log('Book 1 currentCurrency:', res4.body.data?.currentCurrency);
  if (res4.body.data?.currentPrice === 28 && res4.body.data?.currentCurrency === 'GBP') {
    console.log('✅ Test 4 Passed: Manual fixed price for UK (£28 GBP) returned correctly!\n');
  } else {
    throw new Error('❌ Test 4 Failed: UK price resolution failed');
  }

  console.log('🎉 ALL COUNTRY-SPECIFIC PRICING TESTS PASSED SUCCESSFULLY!\n');
}

testPricing().catch(err => {
  console.error('Pricing Test Suite Failed:', err);
  process.exit(1);
});
