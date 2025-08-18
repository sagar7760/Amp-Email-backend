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
      // Generate email content
      const emailContent = this.generateEmailContent({
        applicantName,
        jobTitle,
        companyName,
        serverUrl,
        recipientEmail: to,
        isAmpSupported: this.isAmpSupported(to)
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
          'X-AMP-Supported': this.isAmpSupported(to).toString()
        }
      };

      // Add AMP content only if supported
      if (this.isAmpSupported(to)) {
        mailOptions.amp = emailContent.amp;
        console.log(`📧 Sending AMP email to ${to} (AMP supported domain)`);
      } else {
        console.log(`📧 Sending static email to ${to} (non-AMP domain)`);
      }

      console.log('📤 Attempting to send email with options:', mailOptions);

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', info);

      return {
        success: true,
        messageId: info.messageId,
        recipient: to,
        ampSupported: this.isAmpSupported(to),
        sentAt: new Date(),
        info: info
      };

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      // Attach more error details for debugging
      throw new Error(`Failed to send email: ${error && error.message ? error.message : error}`);
    }
  }

  /**
   * Generate email content (AMP + HTML fallback)
   */
  generateEmailContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail, isAmpSupported }) {
    const ampContent = this.generateAmpContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail });
    const htmlContent = this.generateHtmlContent({ applicantName, jobTitle, companyName, serverUrl });

    return {
      amp: ampContent,
      html: htmlContent
    };
  }

  /**
   * Generate AMP email content
   */
  generateAmpContent({ applicantName, jobTitle, companyName, serverUrl, recipientEmail }) {
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

    <form method="POST" action-xhr="${serverUrl}/api/amp/submit">
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
  generateHtmlContent({ applicantName, jobTitle, companyName, serverUrl }) {
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
            <a href="${serverUrl}/api/form/resume-form?email=${encodeURIComponent(applicantName)}&name=${encodeURIComponent(applicantName)}&job=${encodeURIComponent(jobTitle)}&company=${encodeURIComponent(companyName)}" class="cta-button">
                Update Resume Information
            </a>
        </div>
        
        <p>Click the button above to update your information. This will help us better understand your current qualifications and experience.</p>
        
        <div class="footer">
            <p>This email was sent by ${companyName}. If you have any questions, please contact our HR team.</p>
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
