const nodemailer = require('nodemailer');

const createTransporter = () => {
  try {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // In production, TLS should always be enforced and certificates verified.
      // Only disable this for local development with self-signed certificates.
      ...(process.env.NODE_ENV !== 'production' && {
        tls: { rejectUnauthorized: false }
      })
    };

    console.log('📧 Email transporter configuration:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
      hasPassword: !!config.auth.pass
    });

    return nodemailer.createTransport(config);
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

module.exports = { createTransporter };
