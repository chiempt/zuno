const http = require('http');

async function testMultiAccountService() {
  console.log('🧪 Testing Multi-Account Zalo Service...\n');

  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const healthResponse = await makeRequest('GET', '/health');
    console.log('✅ Health check:', healthResponse);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Accounts status
  console.log('\n2️⃣ Testing accounts status...');
  try {
    const accountsResponse = await makeRequest('GET', '/accounts/status');
    console.log('✅ Accounts status:', accountsResponse);
  } catch (error) {
    console.log('❌ Accounts status failed:', error.message);
  }

  // Test 3: QR generation (POST)
  console.log('\n3️⃣ Testing QR generation (POST)...');
  try {
    const qrResponse = await makeRequest('POST', '/zalo/qr-code');
    console.log('✅ QR generation:', qrResponse);
  } catch (error) {
    console.log('❌ QR generation failed:', error.message);
  }

  // Test 4: QR retrieval (GET)
  console.log('\n4️⃣ Testing QR retrieval (GET)...');
  try {
    const qrGetResponse = await makeRequest('GET', '/zalo/qr-code');
    console.log('✅ QR retrieval:', qrGetResponse);
  } catch (error) {
    console.log('❌ QR retrieval failed:', error.message);
  }

  console.log('\n🎉 Multi-Account Service Test Complete!');
}

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Run the test
testMultiAccountService().catch(console.error);
