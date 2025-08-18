const express = require('express');
const router = express.Router();
const EmailService = require('../services/EmailService');

// Test email sending
router.post('/send-test', async (req, res) => {
  try {
    const { to, applicantName = 'Test User', jobTitle = 'Software Engineer', companyName = 'Hirefy' } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const emailService = new EmailService();
    const serverUrl = req.app.locals.getServerUrl ? req.app.locals.getServerUrl(req) : (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`);
    
    console.log('🔗 Server URL for email:', serverUrl); // Debug log

    let result;
    try {
      result = await emailService.sendResumeRefreshmentEmail({
        to,
        applicantName,
        jobTitle,
        companyName,
        serverUrl,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });
    } catch (err) {
      // Return error details for debugging
      return res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        details: err.message || err
      });
    }

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

// Test email connectivity
router.get('/test-connection', async (req, res) => {
  try {
    const emailService = new EmailService();
    const result = await emailService.testConnection();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

module.exports = router;
