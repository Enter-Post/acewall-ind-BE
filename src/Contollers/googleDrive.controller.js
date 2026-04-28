import { google } from "googleapis";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import User from "../Models/user.model.js";
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from "../Utiles/errors.js";

/**
 * Google Drive OAuth2 Configuration
 * Separate from Google Sign-In
 */
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const GOOGLE_DRIVE_REDIRECT_URI =
  process.env.GOOGLE_DRIVE_REDIRECT_URI ||
  "http://localhost:5050/api/drive/callback";

// Required OAuth scopes for Google Drive
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/drive.readonly",
];

/**
 * Create OAuth2 client instance
 */
export const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    GOOGLE_DRIVE_CLIENT_ID,
    GOOGLE_DRIVE_CLIENT_SECRET,
    GOOGLE_DRIVE_REDIRECT_URI
  );
};

export { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI };

/**
 * Generate OAuth URL for Google Drive connection
 * GET /api/drive/auth-url
 */
export const getGoogleDriveAuthUrl = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET) {
    throw new ValidationError(
      "Google Drive credentials not configured",
      "VAL_001"
    );
  }

  const oauth2Client = createOAuth2Client();

  // Generate authorization URL with offline access and consent prompt
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId.toString(), // Pass user ID to callback for verification
    include_granted_scopes: true,
  });

  return res.status(200).json({
    success: true,
    authUrl,
  });
});

/**
 * Handle OAuth callback from Google
 * GET /api/drive/callback
 */
export const handleGoogleDriveCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("Google OAuth error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/drive-callback?error=${encodeURIComponent(
        error
      )}`
    );
  }

  if (!code || !state) {
    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/drive-callback?error=invalid_callback`
    );
  }

  const userId = state;

  try {
    const oauth2Client = createOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new ValidationError("Failed to obtain access token", "VAL_002");
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USR_001");
    }

    // Update user with Google Drive tokens
    user.googleDrive = {
      connected: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope || SCOPES.join(" "),
    };

    await user.save();

    // Redirect to frontend with success
    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/drive-callback?status=success`
    );
  } catch (error) {
    console.error("Google Drive callback error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/drive-callback?error=${encodeURIComponent(
        error.message || "connection_failed"
      )}`
    );
  }
});

/**
 * Check Google Drive connection status
 * GET /api/drive/status
 */
export const checkDriveConnectionStatus = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  const user = await User.findById(userId).select("googleDrive");

  if (!user) {
    throw new NotFoundError("User not found", "USR_001");
  }

  // Check if token needs refresh
  let isExpired = false;
  if (user.googleDrive?.expiryDate && user.googleDrive?.accessToken) {
    isExpired = new Date() >= new Date(user.googleDrive.expiryDate);
  }

  return res.status(200).json({
    success: true,
    connected: user.googleDrive?.connected || false,
    isExpired,
    hasRefreshToken: !!user.googleDrive?.refreshToken,
  });
});

/**
 * Disconnect Google Drive
 * POST /api/drive/disconnect
 */
export const disconnectGoogleDrive = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found", "USR_001");
  }

  // Revoke token if possible
  if (user.googleDrive?.accessToken) {
    try {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: user.googleDrive.accessToken,
      });
      await oauth2Client.revokeCredentials();
    } catch (revokeError) {
      console.warn("Failed to revoke Google Drive token:", revokeError.message);
      // Continue with disconnection even if revoke fails
    }
  }

  // Clear stored tokens
  user.googleDrive = {
    connected: false,
    accessToken: null,
    refreshToken: null,
    expiryDate: null,
    scope: null,
  };

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Google Drive disconnected successfully",
  });
});

/**
 * Refresh access token if expired
 * Returns new access token or null if refresh fails
 */
export const refreshAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId).select("googleDrive");

    if (!user || !user.googleDrive?.connected || !user.googleDrive?.refreshToken) {
      return null;
    }

    // Check if token is actually expired
    if (user.googleDrive.expiryDate && new Date() < new Date(user.googleDrive.expiryDate)) {
      return user.googleDrive.accessToken;
    }

    const oauth2Client = createOAuth2Client();

    oauth2Client.setCredentials({
      refresh_token: user.googleDrive.refreshToken,
    });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token");
    }

    // Update user with new tokens
    user.googleDrive = {
      ...user.googleDrive,
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000), // Default 1 hour
    };

    // Update refresh token if a new one was provided
    if (credentials.refresh_token) {
      user.googleDrive.refreshToken = credentials.refresh_token;
    }

    await user.save();

    return credentials.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    
    // If refresh fails permanently, mark as disconnected
    if (error.message?.includes("invalid_grant")) {
      await User.findByIdAndUpdate(userId, {
        "googleDrive.connected": false,
        "googleDrive.accessToken": null,
        "googleDrive.refreshToken": null,
      });
    }
    
    return null;
  }
};

/**
 * Get valid access token (auto-refreshes if needed)
 * Internal helper function
 */
export const getValidAccessToken = async (userId) => {
  const user = await User.findById(userId).select("googleDrive");

  if (!user || !user.googleDrive?.connected) {
    throw new AuthenticationError(
      "Google Drive not connected",
      "DRIVE_001"
    );
  }

  // Check if token is expired and needs refresh
  const isExpired =
    !user.googleDrive.expiryDate ||
    new Date() >= new Date(user.googleDrive.expiryDate);

  if (isExpired) {
    const newToken = await refreshAccessToken(userId);
    if (!newToken) {
      throw new AuthenticationError(
        "Failed to refresh Google Drive access. Please reconnect.",
        "DRIVE_002"
      );
    }
    return newToken;
  }

  return user.googleDrive.accessToken;
};

/**
 * Get Google Drive client with valid token
 * Internal helper for making API calls
 */
export const getDriveClient = async (userId) => {
  const accessToken = await getValidAccessToken(userId);

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
};
