import { NetworkError, DatabaseError, ExternalServiceError } from "./errors.js";

/**
 * Detects if an error is network-related and throws appropriate custom error
 * @param {Error} error - The original error object
 * @param {string} context - Context description (e.g., "email service", "stripe", "database")
 * @throws {NetworkError|DatabaseError} - Appropriate network/database error
 */
export const handleNetworkError = (error, context = "service") => {
  const errorCode = error.code;
  const errorName = error.name;
  const syscall = error.syscall;

  // MongoDB/Database specific errors
  if (
    errorName === "MongoNetworkError" ||
    errorName === "MongoServerError" ||
    errorName === "MongoTimeoutError" ||
    errorCode === "ESERVFAIL" ||
    syscall === "querySrv"
  ) {
    throw new DatabaseError(
      context === "database"
        ? "Database connection failed"
        : `Database connection failed during ${context}`,
      "DB_001",
      error.message
    );
  }

  // DNS resolution errors - likely internet issue
  if (errorCode === "ENOTFOUND" || errorCode === "EAI_AGAIN") {
    throw new NetworkError(
      "Unable to reach server - check your internet connection",
      "NET_003",
      error.message
    );
  }

  // Timeout errors - slow or no internet
  if (
    errorCode === "ETIMEDOUT" ||
    errorCode === "ESOCKETTIMEDOUT" ||
    errorName === "TimeoutError"
  ) {
    throw new NetworkError(
      "Request timeout - check your internet connection",
      "NET_002",
      error.message
    );
  }

  // Connection refused - service down or firewall
  if (errorCode === "ECONNREFUSED") {
    throw new NetworkError(
      `Unable to connect to ${context}`,
      "NET_004",
      error.message
    );
  }

  // Connection reset/broken pipe - connection interrupted
  if (errorCode === "ECONNRESET" || errorCode === "EPIPE") {
    throw new NetworkError(
      "Network connection interrupted",
      "NET_001",
      error.message
    );
  }

  // Network unreachable
  if (errorCode === "ENETUNREACH") {
    throw new NetworkError(
      "Network unreachable - no internet connection",
      "NET_005",
      error.message
    );
  }

  // If not a network error, re-throw original
  throw error;
};

/**
 * Wrapper for external API calls with automatic network error handling
 * Use this to wrap calls to Stripe, email services, Cloudinary, etc.
 * 
 * @param {Function} apiCall - Async function to execute
 * @param {string} serviceName - Name of the service (e.g., "Stripe", "Email", "Cloudinary")
 * @returns {Promise<any>} - Result of the API call
 * @throws {NetworkError|ExternalServiceError} - If network or service error occurs
 * 
 * @example
 * const session = await withNetworkErrorHandling(
 *   async () => await stripe.checkout.sessions.create({...}),
 *   "Stripe"
 * );
 */
export const withNetworkErrorHandling = async (apiCall, serviceName) => {
  try {
    return await apiCall();
  } catch (error) {
    // Check if it's a network/connection error
    const networkErrorCodes = [
      "ENOTFOUND",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ECONNRESET",
      "EPIPE",
      "EAI_AGAIN",
      "ESOCKETTIMEDOUT",
      "ENETUNREACH",
      "ESERVFAIL",
    ];

    const isNetworkError =
      networkErrorCodes.includes(error.code) ||
      error.name === "MongoNetworkError" ||
      error.syscall === "querySrv";

    if (isNetworkError) {
      handleNetworkError(error, serviceName);
    }

    // If not network error, wrap as external service error
    throw new ExternalServiceError(
      `${serviceName} service error: ${error.message}`,
      "EXT_001",
      error.message
    );
  }
};

/**
 * Checks if system has internet connectivity
 * Tests by attempting to resolve a reliable DNS entry
 * 
 * @returns {Promise<boolean>} - True if internet is available
 */
export const checkInternetConnection = async () => {
  const dns = await import("dns");
  const { promisify } = await import("util");
  const lookup = promisify(dns.lookup);

  try {
    await lookup("google.com");
    return true;
  } catch (error) {
    return false;
  }
};
