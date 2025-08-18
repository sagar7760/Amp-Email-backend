const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ResumeRefreshment = require('../models/ResumeRefreshment');

// Enhanced CORS middleware for AMP emails
router.use((req, res, next) => {
  const origin = req.get('Origin') || req.get('Referer');
  const ampSameOrigin = req.get('AMP-Same-Origin');
  const sourceOrigin = req.get('__amp_source_origin');
  
  console.log('🔍 AMP Headers:', {
    origin,
    ampSameOrigin,
    sourceOrigin,
    userAgent: req.get('User-Agent')
  });
  
  // Allow multiple Gmail and AMP-compatible domains
  const allowedOrigins = [
    'https://mail.google.com',
    'https://gmail.com',
    'https://googlemail.com', 
    'https://amp.gmail.dev',
    'https://amp-email-viewer.appspot.com'
  ];
  
  // For AMP emails, we need to be more permissive
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, AMP-Email-Sender, AMP-Email-Allow-Sender, AMP-Same-Origin, __amp_source_origin');
  res.header('Access-Control-Allow-Credentials', 'false'); // Changed to false for wildcard origin
  res.header('Access-Control-Expose-Headers', 'AMP-Access-Control-Allow-Source-Origin, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('🔍 AMP Request - Origin:', origin, 'Method:', req.method, 'Path:', req.path);
  next();
});

// Validation schema for resume refreshment submission
const resumeRefreshmentSchema = Joi.object({
  email: Joi.string().email().required(),
  applicantName: Joi.string().min(1).max(100).allow(''),
  jobTitle: Joi.string().allow(''),
  companyName: Joi.string().allow(''),
  sameCompany: Joi.string().valid('yes', 'no').required(),
  skills: Joi.array().items(
    Joi.string().valid(
      'React', 'Node.js', 'MongoDB', 'Big Data', 
      'Docker', 'Kubernetes', 'Python', 'Data Engineering'
    )
  ).default([]),
  currentRole: Joi.string().min(1).max(200).required(),
  yearsOfExperience: Joi.number().min(0).max(50).required(),
  relevantInfo: Joi.string().max(1200).allow('')
});

// Handle AMP form submission
router.post('/submit', async (req, res) => {
  try {
    console.log('📨 Received AMP form submission:', {
      body: req.body,
      headers: {
        origin: req.get('Origin'),
        referer: req.get('Referer'),
        userAgent: req.get('User-Agent'),
        ampEmailSender: req.get('AMP-Email-Sender'),
        contentType: req.get('Content-Type')
      }
    });

    // Validate the submission
    const { error, value } = resumeRefreshmentSchema.validate(req.body);
    if (error) {
      console.error('❌ Validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    // Add submission metadata
    const submissionData = {
      ...value,
      submissionMetadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        submissionSource: 'amp_email',
        emailMessageId: req.get('AMP-Email-Message-Id') || req.get('Message-Id'),
        serverUrl: req.app.locals.getServerUrl ? req.app.locals.getServerUrl(req) : (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`)
      }
    };

    // Check if submission already exists for this email
    const existingSubmission = await ResumeRefreshment.findOne({ 
      email: value.email 
    }).sort({ createdAt: -1 });

    let submission;
    
    if (existingSubmission) {
      // Update existing submission
      Object.assign(existingSubmission, submissionData);
      submission = await existingSubmission.save();
      console.log(`📝 Updated existing resume refreshment for ${value.email}`);
    } else {
      // Create new submission
      submission = new ResumeRefreshment(submissionData);
      await submission.save();
      console.log(`✨ Created new resume refreshment for ${value.email}`);
    }

    // Respond with success (required for AMP) with proper headers
    // For AMP emails, the source origin should match the email sender domain
    const ampSourceOrigin = req.get('__amp_source_origin');
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    
    let sourceOrigin = 'https://mail.google.com'; // Default fallback
    
    if (ampSourceOrigin) {
      sourceOrigin = ampSourceOrigin;
    } else if (origin && origin.includes('mail.google.com')) {
      sourceOrigin = origin;
    } else if (referer && referer.includes('mail.google.com')) {
      sourceOrigin = 'https://mail.google.com';
    }
    
    console.log('🔍 AMP Headers for response:', {
      '__amp_source_origin': ampSourceOrigin,
      'Origin': origin,
      'Referer': referer,
      'Setting sourceOrigin to': sourceOrigin
    });
    
    res.header('AMP-Access-Control-Allow-Source-Origin', sourceOrigin);
    res.header('Content-Type', 'application/json');
    
    // AMP forms expect a specific response format
    res.status(200).json({
      message: 'Resume information updated successfully!',
      submissionId: submission._id,
      applicantName: submission.applicantName
    });

  } catch (error) {
    console.error('❌ Error processing AMP submission:', error);
    
    // Set the same source origin header for error responses
    const ampSourceOrigin = req.get('__amp_source_origin');
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    
    let sourceOrigin = 'https://mail.google.com';
    if (ampSourceOrigin) {
      sourceOrigin = ampSourceOrigin;
    } else if (origin && origin.includes('mail.google.com')) {
      sourceOrigin = origin;
    } else if (referer && referer.includes('mail.google.com')) {
      sourceOrigin = 'https://mail.google.com';
    }
    
    res.header('AMP-Access-Control-Allow-Source-Origin', sourceOrigin);
    res.header('Content-Type', 'application/json');
    
    // Return error response with 400 status to trigger submit-error
    res.status(400).json({
      error: 'Failed to process submission',
      message: 'There was an error updating your information. Please try again.'
    });
  }
});

// AMP proxy endpoint (required for some AMP components)
router.get('/proxy', (req, res) => {
  const serverUrl = req.app.locals.getServerUrl ? req.app.locals.getServerUrl(req) : (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`);
  
  res.status(200).json({
    success: true,
    message: 'AMP proxy endpoint active',
    timestamp: new Date().toISOString(),
    serverUrl: serverUrl
  });
});

// Get resume refreshment submissions (for admin/monitoring)
router.get('/submissions', async (req, res) => {
  try {
    const { page = 1, limit = 10, email, status, sameCompany } = req.query;
    
    const query = {};
    if (email) query.email = new RegExp(email, 'i');
    if (status) query.status = status;
    if (sameCompany) query.sameCompany = sameCompany;

    const submissions = await ResumeRefreshment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await ResumeRefreshment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get specific submission by ID
router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await ResumeRefreshment.findById(req.params.id).select('-__v');
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });

  } catch (error) {
    console.error('❌ Error fetching submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
