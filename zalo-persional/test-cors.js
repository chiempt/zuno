#!/usr/bin/env node

/**
 * CORS Test Script for Zalo Personal Service
 * 
 * This script tests the CORS configuration and API endpoints
 * Run with: node test-cors.js
 */

const testCORS = async () => {
  const baseUrl = 'http://localhost:3001/zalo';
  
  console.log('🧪 Testing CORS configuration for Zalo Personal Service...\n');

  // Test 1: OPTIONS preflight request
  console.log('1️⃣ Testing OPTIONS preflight request...');
  try {
    const optionsResponse = await fetch(`${baseUrl}/qr-code`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    console.log('   Status:', optionsResponse.status);
    console.log('   Headers:', Object.fromEntries(optionsResponse.headers.entries()));
    
    if (optionsResponse.status === 200 || optionsResponse.status === 204) {
      console.log('   ✅ OPTIONS request successful\n');
    } else {
      console.log('   ❌ OPTIONS request failed\n');
    }
  } catch (error) {
    console.log('   ❌ OPTIONS request error:', error.message, '\n');
  }

  // Test 2: GET request
  console.log('2️⃣ Testing GET request...');
  try {
    const getResponse = await fetch(`${baseUrl}/qr-code`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json',
      },
    });
    
    console.log('   Status:', getResponse.status);
    console.log('   Headers:', Object.fromEntries(getResponse.headers.entries()));
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('   Response:', data);
      console.log('   ✅ GET request successful\n');
    } else {
      console.log('   ❌ GET request failed\n');
    }
  } catch (error) {
    console.log('   ❌ GET request error:', error.message, '\n');
  }

  // Test 3: POST request
  console.log('3️⃣ Testing POST request...');
  try {
    const postResponse = await fetch(`${baseUrl}/qr-code`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    console.log('   Status:', postResponse.status);
    console.log('   Headers:', Object.fromEntries(postResponse.headers.entries()));
    
    if (postResponse.ok) {
      const data = await postResponse.json();
      console.log('   Response:', data);
      console.log('   ✅ POST request successful\n');
    } else {
      const errorText = await postResponse.text();
      console.log('   Error response:', errorText);
      console.log('   ❌ POST request failed\n');
    }
  } catch (error) {
    console.log('   ❌ POST request error:', error.message, '\n');
  }

  // Test 4: Status endpoint
  console.log('4️⃣ Testing status endpoint...');
  try {
    const statusResponse = await fetch(`${baseUrl}/status`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json',
      },
    });
    
    console.log('   Status:', statusResponse.status);
    console.log('   Headers:', Object.fromEntries(statusResponse.headers.entries()));
    
    if (statusResponse.ok) {
      const data = await statusResponse.json();
      console.log('   Response:', data);
      console.log('   ✅ Status request successful\n');
    } else {
      console.log('   ❌ Status request failed\n');
    }
  } catch (error) {
    console.log('   ❌ Status request error:', error.message, '\n');
  }

  console.log('🏁 CORS testing completed!');
  console.log('\n📋 Summary:');
  console.log('- Make sure Node.js service is running on port 3001');
  console.log('- Check browser console for detailed error messages');
  console.log('- Verify CORS headers are present in responses');
};

// Run the test
testCORS().catch(console.error);
