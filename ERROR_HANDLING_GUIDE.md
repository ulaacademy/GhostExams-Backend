# Error Handling Guide

## Overview

This project implements a comprehensive error handling system that ensures:
- ✅ No backend errors or stack traces are exposed to clients
- ✅ User-friendly error messages in Arabic
- ✅ Consistent error response format
- ✅ Internal error logging for developers

## Architecture

### 1. Custom Error Classes (`Backend/utils/AppError.js`)

Predefined error classes for common scenarios:

```javascript
const { 
  ValidationError,        // 400 - Bad Request
  AuthenticationError,    // 401 - Unauthorized
  AuthorizationError,     // 403 - Forbidden
  NotFoundError,          // 404 - Not Found
  SubscriptionLimitError, // 403 - Subscription limit exceeded
  ConflictError           // 409 - Conflict
} = require('../utils/AppError');
```

### 2. Global Error Handler (`Backend/middleware/errorHandler.js`)

Catches all errors and:
- Logs full error details internally (for developers)
- Returns clean, user-friendly messages to clients
- Never exposes stack traces

### 3. Async Handler Wrapper

Wraps async route handlers to automatically catch errors:

```javascript
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/create', asyncHandler(async (req, res) => {
  // Your code here - errors are automatically caught
}));
```

## Usage Examples

### In Controllers

**Before (Bad):**
```javascript
const createQuestion = async (req, res) => {
  try {
    // ... code ...
    res.status(201).json({ message: "Success" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error", error: error.message }); // ❌ Exposes error
  }
};
```

**After (Good):**
```javascript
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/AppError');

const createQuestion = asyncHandler(async (req, res) => {
  if (!req.body.questionText) {
    throw new ValidationError("نص السؤال مطلوب");
  }
  
  // ... code ...
  res.status(201).json({ 
    success: true,
    message: "تم إنشاء السؤال بنجاح",
    data: question 
  });
  // ✅ Errors are automatically caught and handled
});
```

### In Middleware

**Before (Bad):**
```javascript
if (!token) {
  return res.status(401).json({ message: "❌ No token" });
}
```

**After (Good):**
```javascript
const { AuthenticationError } = require('../utils/AppError');

if (!token) {
  throw new AuthenticationError('لم يتم العثور على التوكن');
  // ✅ Error is passed to global handler
}
```

## Error Response Format

All errors return this consistent format:

```json
{
  "success": false,
  "message": "رسالة خطأ واضحة بالعربية"
}
```

**In Development Only:**
```json
{
  "success": false,
  "message": "رسالة خطأ واضحة بالعربية",
  "errorType": "ValidationError"
}
```

## Default Error Messages

| Status Code | Default Message |
|-------------|----------------|
| 400 | البيانات المدخلة غير صحيحة |
| 401 | المستخدم غير مسجل |
| 403 | لا تملك صلاحية للوصول |
| 404 | المورد المطلوب غير موجود |
| 409 | يوجد تعارض في البيانات |
| 500 | حدث خطأ غير متوقع، يرجى المحاولة لاحقاً |

## Frontend Integration

The frontend automatically displays errors using the Toast component:

```javascript
// Errors are automatically caught and displayed
axios.post('/api/questions/create', data)
  .then(response => {
    // Success
  })
  .catch(error => {
    // Error is automatically displayed via Toast
    // No need to manually show error message
  });
```

## Best Practices

1. **Always use asyncHandler** for async route handlers
2. **Throw AppError instances** instead of returning error responses
3. **Use specific error types** (ValidationError, NotFoundError, etc.)
4. **Provide clear Arabic messages** for users
5. **Never expose stack traces** or internal error details
6. **Log errors internally** for debugging

## Migration Checklist

When updating existing controllers:

- [ ] Import `asyncHandler` and error classes
- [ ] Wrap async functions with `asyncHandler`
- [ ] Replace `res.status(400).json()` with `throw new ValidationError()`
- [ ] Replace `res.status(404).json()` with `throw new NotFoundError()`
- [ ] Replace `res.status(401).json()` with `throw new AuthenticationError()`
- [ ] Replace `res.status(403).json()` with `throw new AuthorizationError()`
- [ ] Remove try-catch blocks (asyncHandler handles them)
- [ ] Remove error details from response (only message)
- [ ] Test error responses to ensure clean messages

## Example: Complete Controller Update

**Before:**
```javascript
exports.createQuestion = async (req, res) => {
  try {
    if (!req.body.questionText) {
      return res.status(400).json({ 
        message: "❌ Question text required",
        error: "Missing field" 
      });
    }
    
    const question = await Question.create(req.body);
    res.status(201).json({ message: "✅ Success", question });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      message: "❌ Error creating question",
      error: error.message,
      stack: error.stack  // ❌ NEVER expose stack
    });
  }
};
```

**After:**
```javascript
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/AppError');

exports.createQuestion = asyncHandler(async (req, res) => {
  if (!req.body.questionText) {
    throw new ValidationError("نص السؤال مطلوب");
  }
  
  const question = await Question.create(req.body);
  res.status(201).json({ 
    success: true,
    message: "تم إنشاء السؤال بنجاح",
    data: question 
  });
  // ✅ Errors automatically handled
});
```

