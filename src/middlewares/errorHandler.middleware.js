import { AppError } from "../Utiles/errors.js";
import { ERROR_CODES } from "../Utiles/errorCodes.js";

/**
 * Centralized Error Handler Middleware
 * Catches all errors and formats them into a consistent response structure
 */
export const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || "SRV_001";
  let message = err.message || "Internal server error";
  let details = err.details || null;

  // Log error for debugging (in production, use a proper logger like Winston)
  // console.error("Error:", {
  //   timestamp: new Date().toISOString(),
  //   path: req.path,
  //   method: req.method,
  //   errorCode,
  //   message: err.message,
  //   stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  // });

  // Handle specific error types
  if (err.name === "ValidationError" && err.errors) {
    // Mongoose validation error
    statusCode = 400;
    errorCode = "VAL_001";
    message = "Validation failed";
    details = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
  } else if (err.name === "CastError") {
    // Mongoose invalid ObjectId
    statusCode = 400;
    errorCode = "VAL_002";
    message = "Invalid ID format";
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    errorCode = "RES_002";
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    details = { field, value: err.keyValue[field] };
  } else if (err.name === "JsonWebTokenError") {
    // JWT error
    statusCode = 401;
    errorCode = "AUTH_002";
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    // JWT expired
    statusCode = 401;
    errorCode = "AUTH_002";
    message = "Token expired";
  } else if (err.name === "MulterError") {
    // File upload error
    statusCode = 400;
    errorCode = "VAL_006";
    message = `File upload error: ${err.message}`;
  } else if (err.name === "MongoNetworkError" || err.name === "MongoServerError") {
    // MongoDB connection/network errors
    statusCode = 503;
    errorCode = "DB_001";
    message = "Database connection failed. Please try again later.";
    details = process.env.NODE_ENV === "development" ? err.message : null;
  } else if (err.code === "ECONNREFUSED") {
    // Connection refused
    statusCode = 503;
    errorCode = "NET_004";
    message = "Service temporarily unavailable - connection refused";
  } else if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
    // Request timeout
    statusCode = 503;
    errorCode = "NET_002";
    message = "Request timeout - please check your internet connection";
  } else if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
    // DNS resolution failed
    statusCode = 503;
    errorCode = "NET_003";
    message = "Network error - unable to reach server";
  } else if (err.code === "ECONNRESET" || err.code === "EPIPE") {
    // Connection reset
    statusCode = 503;
    errorCode = "NET_001";
    message = "Network connection interrupted";
  } else if (err.syscall === "querySrv" || err.code === "ESERVFAIL") {
    // DNS service failure (MongoDB Atlas connection issues)
    statusCode = 503;
    errorCode = "DB_003";
    message = "Database server unreachable - check internet connection";
  }

  // Build error response (frontend-compatible format with error codes)
  const errorResponse = {
    message,
    errorCode,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.path,
    }),
  };

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 * Place this after all routes to catch undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    "RES_001"
  );
  next(error);
};
