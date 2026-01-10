/**
 * Global Error Handler Middleware
 * 
 * This middleware catches all errors and ensures:
 * 1. Internal errors are logged for developers
 * 2. User-friendly messages are sent to clients
 * 3. Stack traces are NEVER exposed to clients
 * 4. Consistent error response format
 */

const { AppError } = require('../utils/AppError');

// ✅ Default user-friendly error messages
const DEFAULT_MESSAGES = {
  400: 'البيانات المدخلة غير صحيحة',
  401: 'المستخدم غير مسجل',
  403: 'لا تملك صلاحية للوصول',
  404: 'المورد المطلوب غير موجود',
  409: 'يوجد تعارض في البيانات',
  500: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً',
  503: 'الخدمة غير متاحة حالياً، يرجى المحاولة لاحقاً'
};

/**
 * Format error response for client
 */
const formatErrorResponse = (err, req) => {
  // ✅ Always return a clean, user-friendly message
  let message = err.message || DEFAULT_MESSAGES[err.statusCode] || DEFAULT_MESSAGES[500];
  let statusCode = err.statusCode || 500;
  
  // ✅ For validation errors, include field-specific messages if available
  if (err.name === 'ValidationError' && err.errors) {
    const validationMessages = Object.values(err.errors).map(e => e.message);
    message = validationMessages.length > 0 
      ? validationMessages.join(', ') 
      : message;
  }
  
  // ✅ For MongoDB duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'الحقل';
    message = `${field} موجود بالفعل`;
  }
  
  // ✅ For MongoDB cast errors (invalid ID format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'معرف غير صحيح';
  }
  
  // ✅ Build response object
  const response = {
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      // Only include error name in development, never stack trace
      errorType: err.name
    })
  };
  
  return { statusCode, response };
};

/**
 * Log error internally for developers
 */
const logError = (err, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    message: err.message,
    name: err.name,
    stack: err.stack,
    user: req.user ? {
      id: req.user.id,
      role: req.user.role
    } : null,
    body: req.body,
    query: req.query,
    params: req.params
  };
  
  // ✅ Log to console with full details (for developers)
  console.error('❌ [ERROR HANDLER]', JSON.stringify(errorLog, null, 2));
  
  // ✅ In production, you might want to log to a file or external service
  // Example: winston.error(errorLog);
};

/**
 * Global error handler middleware
 * Must be added AFTER all routes
 */
const errorHandler = (err, req, res, next) => {
  // ✅ Log the full error internally (for developers only)
  logError(err, req);
  
  // ✅ Format error response for client
  const { statusCode, response } = formatErrorResponse(err, req);
  
  // ✅ Send clean response to client (NO stack trace, NO internal details)
  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors (route not found)
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`المسار ${req.originalUrl} غير موجود`, 404);
  next(err);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
  console.error('❌ [UNHANDLED REJECTION]', err);
  // In production, you might want to gracefully shutdown
  // process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  console.error('❌ [UNCAUGHT EXCEPTION]', err);
  // In production, you might want to gracefully shutdown
  // process.exit(1);
});

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};

