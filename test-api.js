/**
 * Simple API Testing Script
 * Run with: node test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testServerStatus() {
  log('blue', '\n🔍 Testing Server Status...');
  try {
    const response = await axios.get(`${BASE_URL}/api/status`);
    log('green', `✅ Server is running: ${response.data.status}`);
    return true;
  } catch (error) {
    log('red', `❌ Server is not responding: ${error.message}`);
    return false;
  }
}

async function testAuth(token) {
  log('blue', '\n🔍 Testing Authentication...');
  try {
    const response = await axios.get(`${BASE_URL}/api/debug/auth`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    log('green', `✅ Authentication successful`);
    log('green', `   User ID: ${response.data.user.id}`);
    log('green', `   Role: ${response.data.user.role}`);
    log('green', `   Name: ${response.data.user.name}`);
    return response.data.user;
  } catch (error) {
    log('red', `❌ Authentication failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testTeacherDashboard(token, userId = null) {
  log('blue', '\n🔍 Testing Teacher Dashboard Metrics...');
  
  // Test with token only (recommended)
  try {
    const url = userId 
      ? `${BASE_URL}/api/teacher/dashboard-metrics?userId=${userId}`
      : `${BASE_URL}/api/teacher/dashboard-metrics`;
      
    log('yellow', `   Request URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    log('green', `✅ Dashboard metrics retrieved successfully`);
    log('green', `   Total Students: ${response.data.totalStudents}`);
    log('green', `   Active Exams: ${response.data.activeExams}`);
    log('green', `   Average Score: ${response.data.averageScore}`);
    log('green', `   Top Performers: ${response.data.topPerformers}`);
    return true;
  } catch (error) {
    log('red', `❌ Dashboard request failed`);
    log('red', `   Status: ${error.response?.status}`);
    log('red', `   Message: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.debug) {
      log('yellow', `   Debug info: ${JSON.stringify(error.response.data.debug, null, 2)}`);
    }
    return false;
  }
}

async function testTeacherCustomExams(token, userId = null) {
  log('blue', '\n🔍 Testing Teacher Custom Exams...');
  
  try {
    const url = userId 
      ? `${BASE_URL}/api/teacher/custom-exams/with-results?userId=${userId}`
      : `${BASE_URL}/api/teacher/custom-exams/with-results`;
      
    log('yellow', `   Request URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    log('green', `✅ Custom exams retrieved successfully`);
    log('green', `   Total Exams: ${response.data.exams?.length || 0}`);
    if (response.data.exams && response.data.exams.length > 0) {
      log('green', `   First Exam: ${response.data.exams[0].examName}`);
      log('green', `   Students Count: ${response.data.exams[0].studentsCount}`);
    }
    return true;
  } catch (error) {
    log('red', `❌ Custom exams request failed`);
    log('red', `   Status: ${error.response?.status}`);
    log('red', `   Message: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.debug) {
      log('yellow', `   Debug info: ${JSON.stringify(error.response.data.debug, null, 2)}`);
    }
    return false;
  }
}

async function main() {
  console.clear();
  log('blue', '╔════════════════════════════════════════╗');
  log('blue', '║     ULA CSC Backend API Tester        ║');
  log('blue', '╚════════════════════════════════════════╝');

  // Get token from command line or use a test token
  const token = process.argv[2];
  
  if (!token) {
    log('yellow', '\n⚠️  No token provided. Usage:');
    log('yellow', '   node test-api.js YOUR_TOKEN_HERE');
    log('yellow', '\n   You can get a token by logging in through the frontend,');
    log('yellow', '   then checking localStorage.getItem("token") in browser console.\n');
  }

  // Test server status
  const serverOk = await testServerStatus();
  if (!serverOk) {
    log('red', '\n❌ Server is not running. Please start the server first:');
    log('yellow', '   npm start');
    process.exit(1);
  }

  if (!token) {
    log('yellow', '\n⚠️  Skipping authenticated endpoints (no token provided)\n');
    process.exit(0);
  }

  // Test authentication
  const user = await testAuth(token);
  if (!user) {
    log('red', '\n❌ Authentication failed. Please check your token.\n');
    process.exit(1);
  }

  // Test teacher endpoints (only if user is a teacher)
  if (user.role === 'teacher') {
    await testTeacherDashboard(token);
    
    // Also test with explicit userId
    log('blue', '\n🔍 Testing with explicit userId parameter...');
    await testTeacherDashboard(token, user.id);
    
    // Test custom exams endpoint
    await testTeacherCustomExams(token);
    await testTeacherCustomExams(token, user.id);
  } else {
    log('yellow', `\n⚠️  User is not a teacher (role: ${user.role}), skipping teacher endpoints test`);
  }

  log('blue', '\n╔════════════════════════════════════════╗');
  log('blue', '║          Testing Complete              ║');
  log('blue', '╚════════════════════════════════════════╝\n');
}

main().catch(error => {
  log('red', `\n❌ Unexpected error: ${error.message}\n`);
  process.exit(1);
});

