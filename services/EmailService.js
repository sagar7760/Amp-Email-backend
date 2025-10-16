const { createTransporter } = require('../config/email');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
    this.ampSupportedDomains = [
      'gmail.com', 
      'googlemail.com',
      'yahoo.com',
      'yahoo.co.uk',
      'yahoo.ca',
      'yahoo.co.jp',
      'mail.ru'
    ];
  }

  /**
   * Check if recipient's email domain supports AMP
   */
  isAmpSupported(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    const isSupported = this.ampSupportedDomains.includes(domain);
    console.log(`🔍 AMP Detection: ${email} → domain: ${domain} → supported: ${isSupported}`);
    return isSupported;
  }

  /**
   * Send email with automatic AMP/static fallback
   */
  async sendResumeRefreshmentEmail({
    to,
    subject = 'Update Your Resume Information ',
    applicantName = 'Applicant',
    jobTitle = 'Position',
    companyName = 'KLE',
    serverUrl,
    userAgent = '',
    ipAddress = ''
  }) {
    try {
      if (!to) {
        throw new Error('Recipient email address is required');
      }

      const ampSupported = this.isAmpSupported(to);
      const normalizedServerUrl = serverUrl || process.env.SERVER_URL;

      // Generate email content
      const emailContent = this.generateEmailContent({
        applicantName,
        jobTitle,
        companyName,
        serverUrl: normalizedServerUrl,
        recipientEmail: to,
        isAmpSupported: ampSupported
      });

      // Prepare mail options
      const mailOptions = {
        from: {
          name: `${companyName} - Resume Update`,
          address: process.env.SMTP_USER
        },
        to: to,
        subject: subject,
        html: emailContent.html, // Always include HTML fallback
        headers: {
          'X-Email-Type': 'Resume-Refreshment-Request',
          'X-Company': companyName,
          'X-Position': jobTitle,
          'X-AMP-Supported': ampSupported.toString(),
          'X-Email-Client-UA': userAgent || 'unknown',
          'X-Email-Client-IP': Array.isArray(ipAddress) ? ipAddress.join(',') : ipAddress
        }
      };

      // Add AMP content only if supported
      if (ampSupported) {
        mailOptions.amp = emailContent.amp;
        console.log(`📧 Sending AMP email to ${to} (AMP supported domain)`);
      } else {
        console.log(`📧 Sending static email to ${to} (non-AMP domain)`);
      }

      console.log('📤 Attempting to send email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasAmp: !!mailOptions.amp,
        hasHtml: !!mailOptions.html
      });

      // Send email with retry logic
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📧 Send attempt ${attempt}/${maxRetries}...`);
          const info = await this.transporter.sendMail(mailOptions);
          
          console.log('✅ Email sent successfully:', {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response
          });

          return {
            success: true,
            messageId: info.messageId,
            recipient: to,
            ampSupported: ampSupported,
            sentAt: new Date(),
            info: info,
            attempts: attempt
          };
        } catch (sendError) {
          lastError = sendError;
          console.error(`❌ Send attempt ${attempt}/${maxRetries} failed:`, sendError.message);
          
          // If connection timeout or network error, wait before retry
          if (attempt < maxRetries && (sendError.code === 'ETIMEDOUT' || sendError.code === 'ECONNECTION')) {
            const waitTime = attempt * 2000; // Progressive delay: 2s, 4s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // All retries failed
      throw lastError;

    } catch (error) {
      console.error('❌ Email sending failed after all retries:', error);
      
      // Provide helpful error messages based on error code
      let helpfulMessage = error.message || 'Unknown error';
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        helpfulMessage += '\n\n💡 CONNECTION TIMEOUT:\n' +
          '   • Check SMTP credentials are correct\n' +
          '   • Verify SMTP_HOST and SMTP_PORT environment variables\n' +
          '   • Ensure network/firewall allows SMTP connections';
      } else if (error.code === 'EAUTH') {
        helpfulMessage += '\n\n🔐 AUTHENTICATION FAILED:\n' +
          '   • Gmail requires App Password (not regular password)\n' +
          '   • Generate at: https://myaccount.google.com/apppasswords\n' +
          '   • Enable 2FA first if not already enabled';
      }
      
      const supplemental = error.code ? ` (code: ${error.code})` : '';
      throw new Error(`Failed to send email: ${helpfulMessage}${supplemental}`);
    }
  }

  /**
   * Generate email content (AMP + HTML fallback)
   */
  generateEmailContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail, isAmpSupported }) {
    const ampContent = this.generateAmpContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail });
    const htmlContent = this.generateHtmlContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail, isAmpSupported });

    return {
      amp: ampContent,
      html: htmlContent
    };
  }

  /**
   * Generate AMP email content
   */
  generateAmpContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail }) {
    const safeServerUrl = (serverUrl || process.env.SERVER_URL || '').replace(/\/$/, '');
    return `<!doctype html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp4email-boilerplate>body{visibility:hidden}</style>
  <style amp-custom>
    body { font-family: Arial, sans-serif; background: #1a1a1a; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #2d2d2d; border-radius: 8px; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company-logo { color: #4CAF50; font-size: 24px; font-weight: bold; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; color: #cccccc; font-weight: 500; }
    .form-input { width: 100%; padding: 12px; border: 1px solid #555; border-radius: 4px; background: #1a1a1a; color: #ffffff; font-size: 14px; }
    .form-input:focus { border-color: #4CAF50; outline: none; }
    .radio-group { display: flex; gap: 20px; margin-top: 8px; }
    .radio-option { display: flex; align-items: center; }
    .radio-option input { margin-right: 8px; }
    .skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px; }
    .skill-option { display: flex; align-items: center; }
    .skill-option input { margin-right: 8px; }
    .submit-btn { width: 100%; padding: 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .submit-btn:hover { background: #45a049; }
    .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-logo">${companyName}</div>
      <h1>Update Your Resume Information</h1>
      <p>Hi ${applicantName}, please update your information for the ${jobTitle} position.</p>
    </div>

  <form method="POST" action-xhr="${safeServerUrl}/api/amp/submit">
      <div class="form-group">
        <label for="email">Email Address:</label>
        <input type="email" id="email" name="email" class="form-input" value="${recipientEmail}" required readonly>
      </div>

      <div class="form-group">
        <label for="applicantName">Full Name:</label>
        <input type="text" id="applicantName" name="applicantName" class="form-input" value="${applicantName}">
      </div>

      <div class="form-group">
        <label>Are you currently working at the same company as mentioned in your resume?</label>
        <div class="radio-group">
          <div class="radio-option">
            <input type="radio" id="same-yes" name="sameCompany" value="yes" required>
            <label for="same-yes">Yes</label>
          </div>
          <div class="radio-option">
            <input type="radio" id="same-no" name="sameCompany" value="no" required>
            <label for="same-no">No</label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Skills (select all that apply):</label>
        <div class="skills-grid">
          <div class="skill-option">
            <input type="checkbox" id="skill-react" name="skills" value="React">
            <label for="skill-react">React</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-nodejs" name="skills" value="Node.js">
            <label for="skill-nodejs">Node.js</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-mongodb" name="skills" value="MongoDB">
            <label for="skill-mongodb">MongoDB</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-bigdata" name="skills" value="Big Data">
            <label for="skill-bigdata">Big Data</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-docker" name="skills" value="Docker">
            <label for="skill-docker">Docker</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-k8s" name="skills" value="Kubernetes">
            <label for="skill-k8s">Kubernetes</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-python" name="skills" value="Python">
            <label for="skill-python">Python</label>
          </div>
          <div class="skill-option">
            <input type="checkbox" id="skill-dataeng" name="skills" value="Data Engineering">
            <label for="skill-dataeng">Data Engineering</label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="currentRole">Current Role/Position:</label>
        <input type="text" id="currentRole" name="currentRole" class="form-input" required>
      </div>

      <div class="form-group">
        <label for="yearsOfExperience">Years of Experience:</label>
        <input type="number" id="yearsOfExperience" name="yearsOfExperience" class="form-input" min="0" max="50" required>
      </div>

      <div class="form-group">
        <label for="relevantInfo">Additional Relevant Information:</label>
        <textarea id="relevantInfo" name="relevantInfo" class="form-input" rows="4" placeholder="Any additional information you'd like to share..."></textarea>
      </div>

      <button type="submit" class="submit-btn">Update Resume Information</button>

      <div submit-success>
        <template type="amp-mustache">
          <p style="color: #4CAF50; text-align: center; margin-top: 20px;">
            ✅ {{message}}
          </p>
        </template>
      </div>

      <div submit-error>
        <template type="amp-mustache">
          <p style="color: #f44336; text-align: center; margin-top: 20px;">
            ❌ {{message}}
          </p>
        </template>
      </div>
    </form>

    <div class="footer">
      <p>This email was sent by ${companyName}. If you have any questions, please contact our HR team.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate HTML fallback content
   */
  generateHtmlContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail, isAmpSupported }) {
    const safeServerUrl = (serverUrl || process.env.SERVER_URL || '').replace(/\/$/, '');
    const resumeFormUrl = `${safeServerUrl}/api/form/resume-form?email=${encodeURIComponent(recipientEmail || '')}&name=${encodeURIComponent(applicantName)}&job=${encodeURIComponent(jobTitle)}&company=${encodeURIComponent(companyName)}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Your Resume Information - ${companyName}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .company-logo { color: #4CAF50; font-size: 24px; font-weight: bold; }
        .cta-button { display: inline-block; padding: 15px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: 600; margin: 20px 0; }
        .cta-button:hover { background: #45a049; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-logo">${companyName}</div>
            <h1>Update Your Resume Information</h1>
            <p>Hi ${applicantName},</p>
            <p>We'd like you to update your resume information for the <strong>${jobTitle}</strong> position.</p>
        </div>
        
        <div style="text-align: center;">
      <a href="${resumeFormUrl}" class="cta-button">
                Update Resume Information
            </a>
        </div>
        
        <p>Click the button above to update your information. This will help us better understand your current qualifications and experience.</p>
        
        <div class="footer">
      <p>This email was sent by ${companyName}. If you have any questions, please contact our HR team.</p>
      <p style="font-size: 12px; color: #999;">AMP support detected: ${isAmpSupported ? 'Yes' : 'No'}.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Test email connectivity
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connected successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = EmailService;
