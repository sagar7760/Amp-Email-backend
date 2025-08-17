#!/usr/bin/env node

/**
 * Command Line Email Sender for Backend
 * 
 * Usage Examples:
 * node email-cli.js single --email john@gmail.com --name "John Doe" --job "Software Engineer"
 * node email-cli.js bulk --file applicants.csv
 * node email-cli.js webhook --port 3001
 */

const axios = require('axios');
const fs = require('fs');
const express = require('express');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://your-app-name.onrender.com';

// Command line arguments parsing
const args = process.argv.slice(2);
const command = args[0];

async function sendSingleEmail(email, name, jobTitle, companyName = 'Hirefy') {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/test/send-test`, {
      to: email,
      applicantName: name,
      jobTitle: jobTitle,
      companyName: companyName
    });
    
    console.log(`✅ Email sent to ${email}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error.response?.data || error.message);
    return null;
  }
}

async function sendBulkEmails(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`📦 Processing ${lines.length - 1} emails from ${filePath}`);
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const applicant = {
        email: values[0],
        name: values[1],
        jobTitle: values[2],
        companyName: values[3] || 'Hirefy'
      };
      
      console.log(`📤 Sending email ${i}/${lines.length - 1} to ${applicant.email}...`);
      
      const result = await sendSingleEmail(
        applicant.email,
        applicant.name,
        applicant.jobTitle,
        applicant.companyName
      );
      
      results.push({ ...applicant, success: !!result });
      
      // Rate limiting - wait 2 seconds between emails
      if (i < lines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
    
    return results;
  } catch (error) {
    console.error(`❌ Error processing bulk emails:`, error.message);
    return null;
  }
}

function startWebhookServer(port = 3001) {
  const app = express();
  app.use(express.json());
  
  // Webhook endpoint for external systems
  app.post('/send-email', async (req, res) => {
    const { email, name, jobTitle, companyName } = req.body;
    
    if (!email || !name || !jobTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, jobTitle'
      });
    }
    
    const result = await sendSingleEmail(email, name, jobTitle, companyName);
    
    if (result) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });
  
  // Bulk webhook endpoint
  app.post('/send-bulk', async (req, res) => {
    const { applicants } = req.body;
    
    if (!applicants || !Array.isArray(applicants)) {
      return res.status(400).json({
        success: false,
        error: 'applicants array is required'
      });
    }
    
    res.json({ success: true, message: 'Bulk email processing started' });
    
    // Process in background
    setTimeout(async () => {
      const results = [];
      for (const applicant of applicants) {
        const result = await sendSingleEmail(
          applicant.email,
          applicant.name,
          applicant.jobTitle,
          applicant.companyName
        );
        results.push({ ...applicant, success: !!result });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('Bulk email processing completed:', results);
    }, 100);
  });
  
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Email CLI Webhook Server' });
  });
  
  app.listen(port, () => {
    console.log(`🎣 Webhook server running on http://localhost:${port}`);
    console.log(`📧 Send emails via POST to http://localhost:${port}/send-email`);
    console.log(`📦 Send bulk via POST to http://localhost:${port}/send-bulk`);
  });
}

// Command handlers
switch (command) {
  case 'single':
    const emailIndex = args.indexOf('--email');
    const nameIndex = args.indexOf('--name');
    const jobIndex = args.indexOf('--job');
    const companyIndex = args.indexOf('--company');
    
    if (emailIndex === -1 || nameIndex === -1 || jobIndex === -1) {
      console.error('Usage: node email-cli.js single --email <email> --name <name> --job <job> [--company <company>]');
      process.exit(1);
    }
    
    sendSingleEmail(
      args[emailIndex + 1],
      args[nameIndex + 1],
      args[jobIndex + 1],
      companyIndex !== -1 ? args[companyIndex + 1] : 'Hirefy'
    );
    break;
    
  case 'bulk':
    const fileIndex = args.indexOf('--file');
    
    if (fileIndex === -1) {
      console.error('Usage: node email-cli.js bulk --file <csv-file>');
      console.error('CSV format: email,name,jobTitle,companyName');
      process.exit(1);
    }
    
    sendBulkEmails(args[fileIndex + 1]);
    break;
    
  case 'webhook':
    const portIndex = args.indexOf('--port');
    const port = portIndex !== -1 ? parseInt(args[portIndex + 1]) : 3001;
    
    startWebhookServer(port);
    break;
    
  default:
    console.log(`
📧 Hirefy Email CLI Tool

Commands:
  single    Send a single email
  bulk      Send bulk emails from CSV file
  webhook   Start webhook server for external integrations

Examples:
  node email-cli.js single --email john@gmail.com --name "John Doe" --job "Software Engineer"
  node email-cli.js bulk --file applicants.csv
  node email-cli.js webhook --port 3001

Environment Variables:
  BACKEND_URL - Your deployed backend URL (default: https://your-app-name.onrender.com)

CSV Format for bulk emails:
  email,name,jobTitle,companyName
  john@gmail.com,John Doe,Software Engineer,Hirefy
  jane@yahoo.com,Jane Smith,Data Scientist,Hirefy
    `);
    process.exit(1);
}
