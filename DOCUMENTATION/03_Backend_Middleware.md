# Backend Middleware - Detailed Explanation

## 1. `backend/src/middleware/auth.js` - Authentication Middleware

**Purpose**: Verifies JWT tokens and provides role-based authorization.

### Code Breakdown

```javascript
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
```

**Imports**:
- `jsonwebtoken`: Library for creating and verifying JWT tokens
- `dotenv`: Loads JWT secret from environment

### `authenticate` Function

```javascript
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, email, role }
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
}
```

**How it works**:
1. **Extract Token**: Gets token from `Authorization` header
2. **Validate Format**: Checks if header starts with "Bearer "
3. **Verify Token**: Uses JWT secret to verify token signature
4. **Decode Token**: Extracts user data (user_id, email, role)
5. **Attach to Request**: Adds `req.user` for use in route handlers
6. **Error Handling**: Handles invalid/expired tokens

**Usage**:
```javascript
router.get('/profile', authenticate, async (req, res) => {
  // req.user is available here
  const userId = req.user.user_id;
  // ...
});
```

### `requireRole` Function

```javascript
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
```

**How it works**:
1. **Higher-Order Function**: Returns middleware function
2. **Check Authentication**: Verifies user is authenticated
3. **Check Role**: Verifies user has required role
4. **Authorization**: Allows or denies access

**Usage**:
```javascript
// Only admins can access
router.get('/admin/stats', authenticate, requireRole('admin'), async (req, res) => {
  // Only admins reach here
});
```

---

## 2. `backend/src/middleware/validation.js` - Input Validation

**Purpose**: Validates request data using express-validator.

### Code Breakdown

```javascript
import { body, validationResult } from 'express-validator';
```

**Imports**:
- `body`: Validates request body fields
- `validationResult`: Extracts validation errors

### `handleValidationErrors` Function

```javascript
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
```

**How it works**:
1. **Get Errors**: Extracts validation errors from request
2. **Check Errors**: If errors exist, return 400 with error details
3. **Continue**: If no errors, call next middleware

### Validation Rules

#### Registration Validation

```javascript
export const validateRegister = [
  body('firstname').trim().notEmpty().withMessage('First name is required'),
  body('lastname').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];
```

**Validations**:
- `firstname`: Required, trimmed
- `lastname`: Required, trimmed
- `email`: Must be valid email format, normalized
- `password`: Minimum 6 characters

#### Login Validation

```javascript
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];
```

**Validations**:
- `email`: Valid email format
- `password`: Must not be empty

#### Alert Validation

```javascript
export const validateAlert = [
  body('alert_type').trim().notEmpty().withMessage('Alert type is required'),
  body('user_id').isInt().withMessage('Valid user ID is required'),
  handleValidationErrors,
];
```

**Validations**:
- `alert_type`: Required string
- `user_id`: Must be integer

#### Water Usage Validation

```javascript
export const validateWaterUsage = [
  body('user_id').isInt().withMessage('Valid user ID is required'),
  body('source_id').isInt().withMessage('Valid source ID is required'),
  body('quantity_used').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('date').isISO8601().withMessage('Valid date is required'),
  handleValidationErrors,
];
```

**Validations**:
- `user_id`: Integer
- `source_id`: Integer
- `quantity_used`: Positive float number
- `date`: ISO 8601 date format

---

## Usage Example

```javascript
import { validateRegister } from '../middleware/validation.js';

router.post('/register', validateRegister, async (req, res) => {
  // If validation fails, request never reaches here
  // Validation errors are returned automatically
  const { firstname, lastname, email, password } = req.body;
  // ... create user
});
```

---

## Key Points

1. **Security**: Prevents invalid data from reaching database
2. **User Experience**: Returns clear error messages
3. **Reusability**: Validation rules can be reused across routes
4. **Type Safety**: Ensures data types are correct
5. **Sanitization**: Trims and normalizes input data



