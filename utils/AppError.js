/**
 * Custom Application Error Class
 * 
 * This class provides consistent error handling across the application.
 * It ensures that:
 * - User-friendly messages are returned to clients
 * - Internal error details are logged but not exposed
 * - Stack traces are never sent to clients
 */

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational; // Operational errors are expected and handled
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ✅ Predefined error types for common scenarios
class ValidationError extends AppError {
  constructor(message = 'البيانات المدخلة غير صحيحة') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'المستخدم غير مسجل') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'لا تملك صلاحية للوصول') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'المورد') {
    super(`${resource} غير موجود`, 404);
    this.name = 'NotFoundError';
  }
}

class SubscriptionLimitError extends AppError {
  constructor(message = 'تم تجاوز الحد المسموح به في الاشتراك') {
    super(message, 403);
    this.name = 'SubscriptionLimitError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'يوجد تعارض في البيانات') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  SubscriptionLimitError,
  ConflictError
};

