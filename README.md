# AMP Email Backend - Hirefy Resume Refreshment

This is a Node.js backend for sending interactive AMP emails that allow job applicants to update their resume information directly from their email inbox.

## 🚀 Quick Deploy to Render

### Prerequisites
1. MongoDB Atlas account with a database created
2. Gmail account with App Password enabled
3. Render.com account

### Deployment Steps

1. **Clone/Upload this backend folder** to your Git repository

2. **Connect to Render:**
   - Go to [Render.com](https://render.com)
   - Create new Web Service
   - Connect your Git repository
   - Select the `backend` folder as root directory

3. **Environment Variables in Render:**
   Set these in your Render dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   SERVER_URL=https://your-app-name.onrender.com
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/amp-email-db
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-gmail-app-password
   ```

4. **Build & Deploy:**
   - Render will automatically install dependencies
   - Start command: `npm start`

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Use this as `SMTP_PASS`

### Domain Authentication (Important for AMP)
For production AMP emails, configure:
- **SPF Record**: `v=spf1 include:_spf.google.com ~all`
- **DKIM**: Through Gmail/Google Workspace
- **DMARC**: Basic policy for domain verification

## 🔧 API Endpoints

### Health Check
```
GET /health
```

### Send AMP Email (Test)
```
POST /api/amp/submit
```

### Web Form Fallback
```
GET /api/form/resume-form?email=test@example.com&name=John&job=Developer&company=Hirefy
```

## 🧪 Testing

1. **Test Email Connectivity:**
   ```bash
   curl https://your-app.onrender.com/health
   ```

2. **Send Test Email:**
   ```javascript
   // Use your frontend or API client to call the EmailService
   ```

3. **Check AMP Support:**
   - Gmail: ✅ Supported
   - Yahoo Mail: ✅ Supported
   - Outlook: ❌ Falls back to HTML

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js      # MongoDB connection
│   └── email.js         # Email transporter
├── models/
│   └── ResumeRefreshment.js  # Data model
├── routes/
│   ├── amp.js           # AMP form handling
│   └── form.js          # Web form fallback
├── services/
│   └── EmailService.js  # Email sending logic
├── middleware/
│   └── errorHandler.js  # Error handling
├── server.js            # Express app
├── package.json         # Dependencies
└── .env.example         # Environment template
```

## 🔍 Troubleshooting

### AMP Email Not Rendering in Gmail
1. **Check HTTPS**: Gmail requires HTTPS URLs
2. **Verify SERVER_URL**: Must match your Render deployment URL
3. **CORS Headers**: Ensure Gmail domains are allowed
4. **Content Validation**: AMP content must be valid

### Email Not Sending
1. **Check Gmail App Password**: Ensure it's correctly set
2. **SMTP Settings**: Verify host, port, and authentication
3. **Rate Limits**: Gmail has sending limits

### Database Connection Issues
1. **MongoDB URI**: Check connection string format
2. **Network Access**: Ensure 0.0.0.0/0 is allowed in MongoDB Atlas
3. **Database Name**: Verify database exists

## 📈 Monitoring

- Health endpoint: `/health`
- Submission stats: `/api/amp/submissions`
- Error logs: Check Render dashboard logs

## 🔐 Security

- Rate limiting enabled (100 requests per 15 minutes)
- CORS configured for Gmail domains
- Input validation with Joi
- Helmet.js for security headers

## 📝 Usage Example

Once deployed, you can send AMP emails programmatically:

```javascript
const EmailService = require('./services/EmailService');
const emailService = new EmailService();

await emailService.sendResumeRefreshmentEmail({
  to: 'applicant@gmail.com',
  applicantName: 'John Doe',
  jobTitle: 'Software Engineer',
  companyName: 'Hirefy',
  serverUrl: process.env.SERVER_URL
});
```

## 🚨 Important Notes

1. **localhost Testing**: AMP emails will NOT work from localhost
2. **HTTPS Required**: All form actions must use HTTPS
3. **Gmail Domain**: Only works with AMP-supported email providers
4. **Render Deployment**: Free tier spins down after inactivity

---

**Ready to deploy?** Follow the deployment steps above and your AMP email backend will be live! 🎉
