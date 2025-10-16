#!/usr/bin/env node
/**
 * SMTP Connection Test Script
 * Tests if SMTP connection is working with current configuration
 * 
 * Usage: node test-smtp.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔧 Testing SMTP Connection...\n');

// Display current configuration
console.log('📋 Current SMTP Configuration:');
console.log('   Host:', process.env.SMTP_HOST || 'NOT SET');
console.log('   Port:', process.env.SMTP_PORT || 'NOT SET');
console.log('   Secure:', process.env.SMTP_SECURE || 'NOT SET');
console.log('   User:', process.env.SMTP_USER || 'NOT SET');
console.log('   Pass:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('');

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('❌ Error: SMTP_USER or SMTP_PASS not configured in .env file');
  process.exit(1);
}

// Test configurations to try
const configurations = [
  {
    name: 'Port 465 (SSL)',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      minVersion: 'TLSv1.2'
    }
  },
  {
    name: 'Port 587 (TLS)',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      minVersion: 'TLSv1.2'
    }
  }
];

async function testConfiguration(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log(`   ${config.host}:${config.port} (secure: ${config.secure})`);
  
  const transporter = nodemailer.createTransport({
    ...config,
    connectionTimeout: 15000,
    socketTimeout: 15000,
    family: 4 // Force IPv4
  });

  try {
    await transporter.verify();
    console.log(`   ✅ SUCCESS: ${config.name} is working!`);
    return true;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    if (error.code) {
      console.log(`   Error code: ${error.code}`);
    }
    return false;
  }
}

async function runTests() {
  let anySuccess = false;

  for (const config of configurations) {
    const result = await testConfiguration(config);
    if (result) {
      anySuccess = true;
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (anySuccess) {
    console.log('✅ At least one configuration is working!');
    console.log('Update your .env file with the working configuration.');
  } else {
    console.log('❌ All configurations failed!');
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('\n1️⃣  Render.com FREE tier issue:');
    console.log('   • Render blocks SMTP ports on free tier');
    console.log('   • Solution: Use SendGrid, Mailgun, or Brevo instead');
    console.log('   • Or upgrade to Render paid plan ($7/month)');
    console.log('\n2️⃣  Gmail App Password:');
    console.log('   • Must use App Password, not regular password');
    console.log('   • Generate at: https://myaccount.google.com/apppasswords');
    console.log('   • Enable 2FA first');
    console.log('\n3️⃣  Network/Firewall:');
    console.log('   • Check if your network blocks SMTP ports');
    console.log('   • Try from different network');
    console.log('\n📖 See RENDER_DEPLOYMENT_FIX.md for detailed solutions');
  }
  
  console.log('='.repeat(60) + '\n');
}

runTests().catch(console.error);
