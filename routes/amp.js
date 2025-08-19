const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ResumeRefreshment = require('../models/ResumeRefreshment');

// --- CORRECTED & MORE FLEXIBLE AMP CORS MIDDLEWARE ---
// This middleware correctly handles the specific CORS requirements for AMP for Email.
const ampCorsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const sourceOrigin = req.query.__amp_source_origin;

  // 1. Verify the request is coming from a list of trusted origins.
  // This allows support for Gmail, Yahoo, and other AMP providers.
  const allowedOrigins = [
    'https://mail.google.com',
    'https://mail.yahoo.com',
    'https://e.mail.ru' // Official origin for Mail.ru
  ];

  // Allow localhost and development origins for testing
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));

  if (!origin || (!allowedOrigins.includes(origin) && !(isDevelopment && isLocalhost))) {
    console.error('❌ AMP CORS Error: Invalid or untrusted Origin -', origin);
    return res.status(403).send('Forbidden: Invalid Origin');
  }

  // 2. Set the standard Access-Control-Allow-Origin header.
  res.setHeader('Access-Control-Allow-Origin', origin);

  // 3. Set the required AMP-Access-Control-Allow-Source-Origin header.
  // This MUST match the __amp_source_origin query parameter exactly.
  if (sourceOrigin) {
    res.setHeader('AMP-Access-Control-Allow-Source-Origin', sourceOrigin);
  } else {
    // If this query param is missing, the request from AMP is invalid.
    console.error('❌ AMP CORS Error: Missing __amp_source_origin query parameter.');
    return res.status(400).send('Bad Request: Missing __amp_source_origin');
  }

  // 4. Expose the AMP header so the browser can read it.
  res.setHeader('Access-Control-Expose-Headers', 'AMP-Access-Control-Allow-Source-Origin');

  // 5. Handle preflight OPTIONS requests.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Required for some clients
    return res.status(204).send('');
  }

  next();
};


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

// --- CLEANED UP AMP FORM SUBMISSION ROUTE ---
// Apply the dedicated middleware ONLY to this route.
router.post('/submit', ampCorsMiddleware, async (req, res) => {
  try {
    console.log('📨 Received AMP form submission:', { body: req.body });

    // Validate the submission
    const { error, value } = resumeRefreshmentSchema.validate(req.body);
    if (error) {
      console.error('❌ Validation error:', error.details[0].message);
      // AMP requires a 400 status to trigger the 'submit-error' template
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    // Add submission metadata
    const submissionData = {
      ...value,
      submissionMetadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        submissionSource: 'amp_email',
      }
    };

    // Check if submission already exists for this email
    const existingSubmission = await ResumeRefreshment.findOne({ email: value.email }).sort({ createdAt: -1 });

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

    // Respond with success. The CORS headers are already set by the middleware.
    return res.status(200).json({
      message: 'Resume information updated successfully!',
      submissionId: submission._id,
      applicantName: submission.applicantName
    });

  } catch (error) {
    console.error('❌ Error processing AMP submission:', error);
    // The middleware has already set the required CORS headers,
    // so we just need to send the error response.
    return res.status(500).json({
      error: 'Failed to process submission',
      message: 'An internal server error occurred. Please try again.'
    });
  }
});


// --- OTHER ROUTES (Unchanged) ---

// Get resume refreshment submissions (for admin/monitoring)
router.get('/submissions', (req, res, next) => {
  // Add basic CORS for admin dashboard
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, async (req, res) => {
  try {
    const { page = 1, limit = 10, email } = req.query;
    const query = email ? { email: new RegExp(email, 'i') } : {};

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
    });
  }
});

module.exports = router;

