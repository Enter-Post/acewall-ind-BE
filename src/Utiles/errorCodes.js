/**
 * Error Code Registry
 * Centralized error codes with messages and HTTP status codes
 * Format: CATEGORY_NUMBER
 */

export const ERROR_CODES = {
  // Authentication Errors (AUTH_xxx)
  AUTH_001: {
    code: "AUTH_001",
    message: "Invalid credentials provided",
    statusCode: 401,
  },
  AUTH_002: {
    code: "AUTH_002",
    message: "Token expired or invalid",
    statusCode: 401,
  },
  AUTH_003: {
    code: "AUTH_003",
    message: "Unauthorized access - insufficient permissions",
    statusCode: 403,
  },
  AUTH_004: {
    code: "AUTH_004",
    message: "No authentication token provided",
    statusCode: 401,
  },
  AUTH_005: {
    code: "AUTH_005",
    message: "Email already exists",
    statusCode: 409,
  },
  AUTH_006: {
    code: "AUTH_006",
    message: "Invalid or expired OTP",
    statusCode: 400,
  },
  AUTH_007: {
    code: "AUTH_007",
    message: "User not found",
    statusCode: 404,
  },
  AUTH_008: {
    code: "AUTH_008",
    message: "Account not verified",
    statusCode: 403,
  },

  // Validation Errors (VAL_xxx)
  VAL_001: {
    code: "VAL_001",
    message: "Missing required fields",
    statusCode: 400,
  },
  VAL_002: {
    code: "VAL_002",
    message: "Invalid input format",
    statusCode: 400,
  },
  VAL_003: {
    code: "VAL_003",
    message: "Invalid email format",
    statusCode: 400,
  },
  VAL_004: {
    code: "VAL_004",
    message: "Password does not meet requirements",
    statusCode: 400,
  },
  VAL_005: {
    code: "VAL_005",
    message: "Invalid date format or range",
    statusCode: 400,
  },
  VAL_006: {
    code: "VAL_006",
    message: "Invalid file type or size",
    statusCode: 400,
  },
  VAL_007: {
    code: "VAL_007",
    message: "Invalid question type",
    statusCode: 400,
  },
  VAL_008: {
    code: "VAL_008",
    message: "Category weight exceeds 100%",
    statusCode: 400,
  },

  // Resource Errors (RES_xxx)
  RES_001: {
    code: "RES_001",
    message: "Resource not found",
    statusCode: 404,
  },
  RES_002: {
    code: "RES_002",
    message: "Resource already exists",
    statusCode: 409,
  },
  RES_003: {
    code: "RES_003",
    message: "Cannot delete resource - dependencies exist",
    statusCode: 409,
  },
  RES_004: {
    code: "RES_004",
    message: "Course not found",
    statusCode: 404,
  },
  RES_005: {
    code: "RES_005",
    message: "Assessment not found",
    statusCode: 404,
  },
  RES_006: {
    code: "RES_006",
    message: "Enrollment not found",
    statusCode: 404,
  },
  RES_007: {
    code: "RES_007",
    message: "Already enrolled in this course",
    statusCode: 409,
  },
  RES_008: {
    code: "RES_008",
    message: "Submission not found",
    statusCode: 404,
  },
  RES_009: {
    code: "RES_009",
    message: "Chapter not found",
    statusCode: 404,
  },
  RES_010: {
    code: "RES_010",
    message: "Lesson not found",
    statusCode: 404,
  },

  // Category Errors (CAT_xxx)
  CAT_001: {
    code: "CAT_001",
    message: "Category not found",
    statusCode: 404,
  },
  CAT_002: {
    code: "CAT_002",
    message: "Category already exists",
    statusCode: 409,
  },
  CAT_003: {
    code: "CAT_003",
    message: "Cannot delete category that contains courses",
    statusCode: 409,
  },

  // Payment Errors (PAY_xxx)
  PAY_001: {
    code: "PAY_001",
    message: "Payment processing failed",
    statusCode: 402,
  },
  PAY_002: {
    code: "PAY_002",
    message: "Invalid payment method",
    statusCode: 400,
  },
  PAY_003: {
    code: "PAY_003",
    message: "Payment amount mismatch",
    statusCode: 400,
  },
  PAY_004: {
    code: "PAY_004",
    message: "Stripe checkout session creation failed",
    statusCode: 500,
  },
  PAY_005: {
    code: "PAY_005",
    message: "Invalid webhook signature",
    statusCode: 400,
  },
  PAY_006: {
    code: "PAY_006",
    message: "Coupon not found or expired",
    statusCode: 404,
  },

  // Assessment Errors (ASM_xxx)
  ASM_001: {
    code: "ASM_001",
    message: "Assessment deadline has passed",
    statusCode: 400,
  },
  ASM_002: {
    code: "ASM_002",
    message: "Already submitted this assessment",
    statusCode: 409,
  },
  ASM_003: {
    code: "ASM_003",
    message: "Not enrolled in this course",
    statusCode: 403,
  },
  ASM_004: {
    code: "ASM_004",
    message: "Invalid assessment type",
    statusCode: 400,
  },
  ASM_005: {
    code: "ASM_005",
    message: "Missing answer for required question",
    statusCode: 400,
  },

  // External Service Errors (EXT_xxx)
  EXT_001: {
    code: "EXT_001",
    message: "External service unavailable",
    statusCode: 502,
  },
  EXT_002: {
    code: "EXT_002",
    message: "Email service failed",
    statusCode: 500,
  },
  EXT_003: {
    code: "EXT_003",
    message: "File upload service failed",
    statusCode: 500,
  },
  EXT_004: {
    code: "EXT_004",
    message: "AI service error",
    statusCode: 502,
  },

  // Network Errors (NET_xxx)
  NET_001: {
    code: "NET_001",
    message: "Network connection interrupted",
    statusCode: 503,
  },
  NET_002: {
    code: "NET_002",
    message: "Request timeout - please check your internet connection",
    statusCode: 503,
  },
  NET_003: {
    code: "NET_003",
    message: "Unable to reach server - check your internet connection",
    statusCode: 503,
  },
  NET_004: {
    code: "NET_004",
    message: "Connection refused by server",
    statusCode: 503,
  },
  NET_005: {
    code: "NET_005",
    message: "No internet connection detected",
    statusCode: 503,
  },

  // Database Errors (DB_xxx)
  DB_001: {
    code: "DB_001",
    message: "Database connection failed",
    statusCode: 503,
  },
  DB_002: {
    code: "DB_002",
    message: "Database query timeout",
    statusCode: 503,
  },
  DB_003: {
    code: "DB_003",
    message: "Database server unreachable",
    statusCode: 503,
  },

  // Server Errors (SRV_xxx)
  SRV_001: {
    code: "SRV_001",
    message: "Internal server error",
    statusCode: 500,
  },
  SRV_002: {
    code: "SRV_002",
    message: "Database operation failed",
    statusCode: 500,
  },
  SRV_003: {
    code: "SRV_003",
    message: "Service temporarily unavailable",
    statusCode: 503,
  },
};

/**
 * Helper function to get error details by code
 * @param {string} code - Error code (e.g., "AUTH_001")
 * @returns {object} Error details or default error
 */
export const getErrorByCode = (code) => {
  return (
    ERROR_CODES[code] || {
      code: "SRV_001",
      message: "Internal server error",
      statusCode: 500,
    }
  );
};
