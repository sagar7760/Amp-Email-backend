const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');
const ampRoutes = require('./routes/amp');
const formRoutes = require('./routes/form');
const testRoutes = require('./routes/test');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment (IMPORTANT for HTTPS URLs)
app.set('trust proxy', 1);

// Helper function to get correct server URL
function getServerUrl(req) {
  // In production, force HTTPS
  if (process.env.NODE_ENV === 'production') {
    return process.env.SERVER_URL || `https://${req.get('host')}`;
  }
  // In development, use the detected protocol
  return process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
}

// Make helper available to routes
app.locals.getServerUrl = getServerUrl;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Enhanced CORS for AMP emails
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://mail.google.com',
      'https://gmail.com',
      'https://googlemail.com',
      'https://amp.gmail.dev',
      'https://amp-email-viewer.appspot.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Check if origin is in allowed list or is a Google/Gmail subdomain
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.includes('.google.com') || 
                     origin.includes('.gmail.com') ||
                     origin.includes('.googlemail.com');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(' CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'AMP-Email-Sender',
    'AMP-Email-Allow-Sender',
    'AMP-Same-Origin'
  ],
  exposedHeaders: [
    'AMP-Access-Control-Allow-Source-Origin'
  ]
}));

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverUrl: process.env.SERVER_URL || `http://localhost:${PORT}`
  });
});

// API Routes
app.use('/api/amp', ampRoutes);
app.use('/api/form', formRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AMP Email Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ampSubmit: '/api/amp/submit',
      ampProxy: '/api/amp/proxy',
      webForm: '/api/form/resume-form',
      testEmail: '/api/test/send-test',
      testConnection: '/api/test/test-connection',
      adminDashboard: '/api/admin/dashboard'
    },
    serverUrl: process.env.SERVER_URL || `http://localhost:${PORT}`
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 AMP Email Backend ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server URL: ${process.env.SERVER_URL || `http://localhost:${PORT}`}`);
});

module.exports = app;
