const nodemailer = require('nodemailer');

let cachedTransporter;

const createTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS environment variables.');
    }

    const port = parseInt(process.env.SMTP_PORT) || 587;
    const secure = port === 465 || process.env.SMTP_SECURE === 'true';
    
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 10000, 
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        minVersion: 'TLSv1.2'
      }
    };

    console.log('📧 Email transporter configuration:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
      hasPassword: !!config.auth.pass
    });

    cachedTransporter = nodemailer.createTransport(config);

    // Verify connection in background
    cachedTransporter.verify()
      .then(() => console.log('✅ SMTP connection verified'))
      .catch((err) => console.error('⚠️  SMTP verification warning:', err.message));

    return cachedTransporter;
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    throw error;
  }
};

module.exports = { createTransporter };
