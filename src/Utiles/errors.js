/**
 * Custom Error Classes for Standardized Error Handling
 * Each error class extends AppError and includes an error code and HTTP status
 */

class AppError extends Error {
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Distinguish operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errorCode = "VAL_001", details = null) {
    super(message, 400, errorCode, details);
    this.name = "ValidationError";
  }
}

class AuthenticationError extends AppError {
  constructor(message, errorCode = "AUTH_001") {
    super(message, 401, errorCode);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends AppError {
  constructor(message, errorCode = "AUTH_003") {
    super(message, 403, errorCode);
    this.name = "AuthorizationError";
  }
}

class NotFoundError extends AppError {
  constructor(message, errorCode = "RES_001") {
    super(message, 404, errorCode);
    this.name = "NotFoundError";
  }
}

class ConflictError extends AppError {
  constructor(message, errorCode = "RES_002") {
    super(message, 409, errorCode);
    this.name = "ConflictError";
  }
}

class PaymentError extends AppError {
  constructor(message, errorCode = "PAY_001", details = null) {
    super(message, 402, errorCode, details);
    this.name = "PaymentError";
  }
}

class ExternalServiceError extends AppError {
  constructor(message, errorCode = "EXT_001", details = null) {
    super(message, 502, errorCode, details);
    this.name = "ExternalServiceError";
  }
}

class NetworkError extends AppError {
  constructor(message, errorCode = "NET_001", details = null) {
    super(message, 503, errorCode, details);
    this.name = "NetworkError";
  }
}

class DatabaseError extends AppError {
  constructor(message, errorCode = "DB_001", details = null) {
    super(message, 503, errorCode, details);
    this.name = "DatabaseError";
  }
}

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  PaymentError,
  ExternalServiceError,
  NetworkError,
  DatabaseError,
};
