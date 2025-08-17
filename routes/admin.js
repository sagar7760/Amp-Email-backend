const express = require('express');
const router = express.Router();
const EmailService = require('../services/EmailService');
const ResumeRefreshment = require('../models/ResumeRefreshment');

// Admin dashboard - email sending interface
router.get('/dashboard', (req, res) => {
  const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
  
  const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Admin Dashboard - Hirefy</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; color: #333; }
        .form-section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        input, textarea, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        button { padding: 12px 24px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #005a87; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007cba; }
        .results { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Email Admin Dashboard</h1>
            <p>Send AMP resume update emails to applicants</p>
        </div>
        
        <!-- Stats Section -->
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="totalSent">-</div>
                <div>Emails Sent</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalSubmissions">-</div>
                <div>Form Submissions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="ampSupported">-</div>
                <div>AMP Supported</div>
            </div>
        </div>

        <!-- Single Email Section -->
        <div class="form-section">
            <h3>📤 Send Single Email</h3>
            <form id="singleEmailForm">
                <div class="form-group">
                    <label for="email">Email Address:</label>
                    <input type="email" id="email" name="email" required placeholder="applicant@gmail.com">
                </div>
                <div class="form-group">
                    <label for="applicantName">Applicant Name:</label>
                    <input type="text" id="applicantName" name="applicantName" required placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label for="jobTitle">Job Title:</label>
                    <input type="text" id="jobTitle" name="jobTitle" required placeholder="Software Engineer">
                </div>
                <div class="form-group">
                    <label for="companyName">Company Name:</label>
                    <input type="text" id="companyName" name="companyName" value="Hirefy">
                </div>
                <button type="button" id="sendEmailBtn">Send Email</button>
            </form>
            <div id="singleResult" class="results" style="display: none;"></div>
        </div>

        <!-- Recent Submissions -->
        <div class="form-section">
            <h3>📋 Recent Submissions</h3>
            <button id="refreshBtn">Refresh Submissions</button>
            <div id="submissions" style="margin-top: 15px;"></div>
        </div>
    </div>

    <script>
        // Determine API base URL dynamically
        const API_BASE = window.location.origin;
        console.log('Dashboard loaded, API_BASE:', API_BASE);
        console.log('Current URL:', window.location.href);
        
        // Function to send single email
        function sendSingleEmail() {
            console.log('sendSingleEmail function called!');
            
            const email = document.getElementById('email').value;
            const applicantName = document.getElementById('applicantName').value;
            const jobTitle = document.getElementById('jobTitle').value;
            const companyName = document.getElementById('companyName').value;
            
            console.log('Form data:', { email, applicantName, jobTitle, companyName });
            
            if (!email || !applicantName || !jobTitle) {
                alert('Please fill in all required fields');
                return;
            }
            
            const resultDiv = document.getElementById('singleResult');
            resultDiv.innerHTML = '<div>Sending email...</div>';
            resultDiv.style.display = 'block';
            
            const requestData = {
                to: email,
                applicantName: applicantName,
                jobTitle: jobTitle,
                companyName: companyName
            };
            
            console.log('Making request to:', API_BASE + '/api/test/send-test');
            console.log('Request data:', requestData);
            
            fetch(API_BASE + '/api/test/send-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                console.log('Response received:', response);
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            })
            .then(result => {
                console.log('Result:', result);
                if (result.success) {
                    resultDiv.innerHTML = '<div class="success">✅ Email sent successfully to ' + email + '!</div>';
                    document.getElementById('singleEmailForm').reset();
                } else {
                    resultDiv.innerHTML = '<div class="error">❌ Failed to send email: ' + (result.error || result.details || 'Unknown error') + '</div>';
                }
                
                try {
                    loadStats();
                } catch (statsError) {
                    console.warn('Failed to load stats:', statsError);
                }
            })
            .catch(error => {
                console.error('Error sending email:', error);
                resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
            });
        }
        
        // Load stats function
        function loadStats() {
            console.log('Loading stats...');
            fetch(API_BASE + '/api/amp/submissions')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    document.getElementById('totalSubmissions').textContent = data.data.pagination.total;
                    
                    const ampCount = data.data.submissions.filter(function(s) {
                        return s.email.includes('gmail.com') || s.email.includes('yahoo.com');
                    }).length;
                    document.getElementById('ampSupported').textContent = ampCount;
                } else {
                    console.warn('Failed to load stats:', data);
                    document.getElementById('totalSubmissions').textContent = '0';
                    document.getElementById('ampSupported').textContent = '0';
                }
            })
            .catch(function(error) {
                console.error('Failed to load stats:', error);
                document.getElementById('totalSubmissions').textContent = 'Error';
                document.getElementById('ampSupported').textContent = 'Error';
            });
        }
        
        // Load submissions function
        function loadSubmissions() {
            console.log('Loading submissions...');
            fetch(API_BASE + '/api/amp/submissions?limit=5')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                if (data.success && data.data.submissions) {
                    const submissionsHTML = data.data.submissions.map(function(sub) {
                        return '<div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 4px;">' +
                               '<strong>' + sub.email + '</strong> - ' + sub.currentRole + ' ' +
                               '<small style="color: #666;">(' + new Date(sub.createdAt).toLocaleDateString() + ')</small>' +
                               '</div>';
                    }).join('');
                    
                    document.getElementById('submissions').innerHTML = submissionsHTML || '<p>No submissions yet.</p>';
                } else {
                    document.getElementById('submissions').innerHTML = '<p>No submissions yet.</p>';
                }
            })
            .catch(function(error) {
                console.error('Failed to load submissions:', error);
                document.getElementById('submissions').innerHTML = '<p>Failed to load submissions. Check console for details.</p>';
            });
        }
        
        // Initialize when page loads
        window.onload = function() {
            console.log('Page loaded, initializing...');
            
            // Add event listeners
            document.getElementById('sendEmailBtn').addEventListener('click', sendSingleEmail);
            document.getElementById('refreshBtn').addEventListener('click', loadSubmissions);
            
            // Prevent form submissions
            document.getElementById('singleEmailForm').addEventListener('submit', function(e) {
                e.preventDefault();
                sendSingleEmail();
            });
            
            // Load initial data
            try {
                loadStats();
                loadSubmissions();
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        };
    </script>
</body>
</html>
  `;
  
  res.send(dashboardHTML);
});

// Bulk email sending endpoint
router.post('/send-bulk', async (req, res) => {
  try {
    const { emails, companyName = 'Hirefy' } = req.body;
    
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Email list is required'
      });
    }

    const emailService = new EmailService();
    const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
    const results = [];

    for (const emailData of emails) {
      try {
        const result = await emailService.sendResumeRefreshmentEmail({
          to: emailData.email,
          applicantName: emailData.name,
          jobTitle: emailData.jobTitle,
          companyName: companyName,
          serverUrl,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        });

        results.push({
          email: emailData.email,
          success: true,
          messageId: result.messageId
        });

      } catch (error) {
        results.push({
          email: emailData.email,
          success: false,
          error: error.message
        });
      }

      // Rate limiting - wait 1 second between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      message: `Processed ${emails.length} emails`,
      results: results
    });

  } catch (error) {
    console.error('❌ Bulk email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk emails',
      details: error.message
    });
  }
});

module.exports = router;
