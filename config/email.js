const nodemailer = require('nodemailer');

let cachedTransporter;

const toNumber = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const createTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS environment variables.');
    }

    const baseConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: toNumber(process.env.SMTP_PORT, 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: process.env.SMTP_POOL === 'true',
      maxConnections: toNumber(process.env.SMTP_MAX_CONNECTIONS, 3),
      maxMessages: toNumber(process.env.SMTP_MAX_MESSAGES, 100),
      connectionTimeout: toNumber(process.env.SMTP_CONNECTION_TIMEOUT, 15000),
      greetingTimeout: toNumber(process.env.SMTP_GREETING_TIMEOUT, 10000),
      socketTimeout: toNumber(process.env.SMTP_SOCKET_TIMEOUT, 20000),
      requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
      family: toNumber(process.env.SMTP_IP_FAMILY, 4),
      tls: {
        ...((process.env.NODE_ENV !== 'production' || process.env.SMTP_ALLOW_INVALID_CERTS === 'true') && {
          rejectUnauthorized: false
        }),
        servername: process.env.SMTP_TLS_SERVERNAME || process.env.SMTP_HOST || 'smtp.gmail.com'
      }
    };

    // Optional debug logging to help when diagnosing connection problems
    if (process.env.SMTP_DEBUG === 'true') {
      baseConfig.logger = true;
      baseConfig.debug = true;
    }

    console.log('📧 Email transporter configuration:', {
      host: baseConfig.host,
      port: baseConfig.port,
      secure: baseConfig.secure,
      user: baseConfig.auth.user,
      hasPassword: !!baseConfig.auth.pass,
      pool: baseConfig.pool,
      requireTLS: baseConfig.requireTLS,
      family: baseConfig.family,
      connectionTimeout: baseConfig.connectionTimeout
    });

    cachedTransporter = nodemailer.createTransport(baseConfig);

    // Perform a background verification so that deployment failures surface in logs
    cachedTransporter.verify()
      .then(() => console.log('✅ SMTP connection verified'))
      .catch((err) => console.error('⚠️  SMTP verification failed:', err.message));

    return cachedTransporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

module.exports = { createTransporter };
