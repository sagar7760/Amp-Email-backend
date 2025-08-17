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
        .bulk-textarea { height: 120px; }
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
                <button type="submit">Send Email</button>
            </form>
            <div id="singleResult" class="results" style="display: none;"></div>
        </div>

        <!-- Bulk Email Section -->
        <div class="form-section">
            <h3>📦 Send Bulk Emails</h3>
            <form id="bulkEmailForm">
                <div class="form-group">
                    <label for="emailList">Email List (one per line: email,name,jobTitle):</label>
                    <textarea id="emailList" name="emailList" class="bulk-textarea" placeholder="john@gmail.com,John Doe,Software Engineer
jane@yahoo.com,Jane Smith,Data Scientist
bob@gmail.com,Bob Wilson,DevOps Engineer"></textarea>
                </div>
                <div class="form-group">
                    <label for="bulkCompany">Company Name:</label>
                    <input type="text" id="bulkCompany" name="bulkCompany" value="Hirefy">
                </div>
                <button type="submit">Send Bulk Emails</button>
            </form>
            <div id="bulkResult" class="results" style="display: none;"></div>
        </div>

        <!-- Recent Submissions -->
        <div class="form-section">
            <h3>📋 Recent Submissions</h3>
            <button onclick="loadSubmissions()">Refresh Submissions</button>
            <div id="submissions" style="margin-top: 15px;"></div>
        </div>
    </div>

    <script>
        const API_BASE = '${serverUrl}';
        
        // Load initial stats
        loadStats();
        loadSubmissions();
        
        // Single email form handler
        document.getElementById('singleEmailForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch(\`\${API_BASE}/api/test/send-test\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: data.email,
                        applicantName: data.applicantName,
                        jobTitle: data.jobTitle,
                        companyName: data.companyName
                    })
                });
                
                const result = await response.json();
                const resultDiv = document.getElementById('singleResult');
                
                if (result.success) {
                    resultDiv.innerHTML = \`<div class="success">✅ Email sent successfully to \${data.email}!</div>\`;
                } else {
                    resultDiv.innerHTML = \`<div class="error">❌ Failed to send email: \${result.error}</div>\`;
                }
                
                resultDiv.style.display = 'block';
                loadStats(); // Refresh stats
            } catch (error) {
                document.getElementById('singleResult').innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
                document.getElementById('singleResult').style.display = 'block';
            }
        });
        
        // Bulk email form handler
        document.getElementById('bulkEmailForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const emailList = formData.get('emailList').trim();
            const companyName = formData.get('bulkCompany');
            
            if (!emailList) {
                alert('Please enter email list');
                return;
            }
            
            const emails = emailList.split('\\n').map(line => {
                const [email, name, jobTitle] = line.split(',').map(s => s.trim());
                return { email, name, jobTitle };
            }).filter(item => item.email);
            
            const resultDiv = document.getElementById('bulkResult');
            resultDiv.innerHTML = '<div>Sending emails...</div>';
            resultDiv.style.display = 'block';
            
            const results = [];
            for (const emailData of emails) {
                try {
                    const response = await fetch(\`\${API_BASE}/api/test/send-test\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: emailData.email,
                            applicantName: emailData.name,
                            jobTitle: emailData.jobTitle,
                            companyName: companyName
                        })
                    });
                    
                    const result = await response.json();
                    results.push(\`\${emailData.email}: \${result.success ? '✅ Success' : '❌ Failed'}\`);
                } catch (error) {
                    results.push(\`\${emailData.email}: ❌ Error\`);
                }
                
                // Update progress
                resultDiv.innerHTML = \`<div>Progress: \${results.length}/\${emails.length}</div><div>\${results.join('<br>')}</div>\`;
                
                // Wait 1 second between emails
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            loadStats(); // Refresh stats
        });
        
        async function loadStats() {
            try {
                const response = await fetch(\`\${API_BASE}/api/amp/submissions\`);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('totalSubmissions').textContent = data.data.pagination.total;
                    
                    // Count AMP supported emails (rough estimate)
                    const ampCount = data.data.submissions.filter(s => 
                        s.email.includes('gmail.com') || s.email.includes('yahoo.com')
                    ).length;
                    document.getElementById('ampSupported').textContent = ampCount;
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        async function loadSubmissions() {
            try {
                const response = await fetch(\`\${API_BASE}/api/amp/submissions?limit=5\`);
                const data = await response.json();
                
                if (data.success) {
                    const submissionsHTML = data.data.submissions.map(sub => \`
                        <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 4px;">
                            <strong>\${sub.email}</strong> - \${sub.currentRole} 
                            <small style="color: #666;">(\${new Date(sub.createdAt).toLocaleDateString()})</small>
                        </div>
                    \`).join('');
                    
                    document.getElementById('submissions').innerHTML = submissionsHTML || '<p>No submissions yet.</p>';
                }
            } catch (error) {
                document.getElementById('submissions').innerHTML = '<p>Failed to load submissions.</p>';
            }
        }
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
