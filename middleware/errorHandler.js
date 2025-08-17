const errorHandler = (err, req, res, next) => {
  console.error('❌ Error Stack:', err.stack);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    status: err.statusCode || 500
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(error => error.message).join(', ');
    error = {
      success: false,
      message: 'Validation Error',
      details: message,
      status: 400
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      success: false,
      message: `Duplicate value for field: ${field}`,
      status: 400
    };
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = {
      success: false,
      message: 'Invalid ID format',
      status: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      status: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      status: 401
    };
  }

  // Send error response
  res.status(error.status).json({
    success: error.success,
    error: error.message,
    details: error.details || undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
