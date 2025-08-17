const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ResumeRefreshment = require('../models/ResumeRefreshment');

// Validation schema for web form
const webFormSchema = Joi.object({
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

// Serve the resume refreshment form
router.get('/resume-form', (req, res) => {
  const { email, name, job, company } = req.query;
  
  const formData = {
    applicantEmail: email || '',
    applicantName: name || '',
    jobTitle: job || '',
    companyName: company || 'Hirefy',
    serverUrl: process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`
  };

  const htmlForm = generateResumeRefreshmentForm(formData);
  
  res.send(htmlForm);
});

// Handle web form submission
router.post('/resume-form', async (req, res) => {
  try {
    console.log('📝 Received web form submission:', req.body);

    // Validate the submission
    const { error, value } = webFormSchema.validate(req.body);
    if (error) {
      return res.status(400).send(generateErrorPage(error.details[0].message));
    }

    // Add submission metadata
    const submissionData = {
      ...value,
      submissionMetadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        submissionSource: 'web_form',
        referrer: req.get('Referer'),
        serverUrl: process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`
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

    // Return success page
    res.send(generateSuccessPage(submission));

  } catch (error) {
    console.error('❌ Error processing web form submission:', error);
    res.status(500).send(generateErrorPage('Failed to process submission. Please try again.'));
  }
});

// Helper function to generate the web form HTML
function generateResumeRefreshmentForm(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Resume Information - Hirefy</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
        .checkbox-group label { font-weight: normal; display: flex; align-items: center; }
        .checkbox-group input { width: auto; margin-right: 5px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .header { text-align: center; margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Update Resume Information</h1>
        <p>Please update your information for the position at ${data.companyName}</p>
    </div>
    
    <form method="POST" action="${data.serverUrl}/api/form/resume-form">
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" value="${data.applicantEmail}" required>
        </div>
        
        <div class="form-group">
            <label for="applicantName">Full Name:</label>
            <input type="text" id="applicantName" name="applicantName" value="${data.applicantName}">
        </div>
        
        <div class="form-group">
            <label for="sameCompany">Are you currently working at the same company as mentioned in your resume?</label>
            <select id="sameCompany" name="sameCompany" required>
                <option value="">Please select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Skills (select all that apply):</label>
            <div class="checkbox-group">
                <label><input type="checkbox" name="skills" value="React"> React</label>
                <label><input type="checkbox" name="skills" value="Node.js"> Node.js</label>
                <label><input type="checkbox" name="skills" value="MongoDB"> MongoDB</label>
                <label><input type="checkbox" name="skills" value="Big Data"> Big Data</label>
                <label><input type="checkbox" name="skills" value="Docker"> Docker</label>
                <label><input type="checkbox" name="skills" value="Kubernetes"> Kubernetes</label>
                <label><input type="checkbox" name="skills" value="Python"> Python</label>
                <label><input type="checkbox" name="skills" value="Data Engineering"> Data Engineering</label>
            </div>
        </div>
        
        <div class="form-group">
            <label for="currentRole">Current Role/Position:</label>
            <input type="text" id="currentRole" name="currentRole" required>
        </div>
        
        <div class="form-group">
            <label for="yearsOfExperience">Years of Experience:</label>
            <input type="number" id="yearsOfExperience" name="yearsOfExperience" min="0" max="50" required>
        </div>
        
        <div class="form-group">
            <label for="relevantInfo">Additional Relevant Information:</label>
            <textarea id="relevantInfo" name="relevantInfo" rows="4" placeholder="Any additional information you'd like to share..."></textarea>
        </div>
        
        <button type="submit">Update Resume Information</button>
    </form>
</body>
</html>
  `;
}

// Helper function to generate success page
function generateSuccessPage(submission) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Success - Resume Updated</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .success { color: #28a745; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1 class="success">✅ Resume Information Updated Successfully!</h1>
    <div class="info">
        <p><strong>Email:</strong> ${submission.email}</p>
        <p><strong>Current Role:</strong> ${submission.currentRole}</p>
        <p><strong>Experience:</strong> ${submission.yearsOfExperience} years</p>
        <p><strong>Submission ID:</strong> ${submission._id}</p>
    </div>
    <p>Thank you for updating your information. We'll review your submission and get back to you soon.</p>
</body>
</html>
  `;
}

// Helper function to generate error page
function generateErrorPage(message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Resume Update</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .error { color: #dc3545; }
    </style>
</head>
<body>
    <h1 class="error">❌ Error</h1>
    <p>${message}</p>
    <button onclick="history.back()">Go Back</button>
</body>
</html>
  `;
}

module.exports = router;
