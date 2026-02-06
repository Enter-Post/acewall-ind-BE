import jwt from "jsonwebtoken";
import User from "../Models/user.model.js";
// import Admin from "../Models/admins.model.js";   // Uncomment later if needed

// Import error classes
import { AuthenticationError, AuthorizationError } from "../Utiles/errors.js";

// ----------------- Helper: detect portal -----------------
function getPortalFromReq(req) {
  let host = "";

  // Try Origin header first (browser fetch/AJAX usually sets this)
  const origin = req.get("origin");
  if (origin) {
    try {
      host = new URL(origin).hostname;
    } catch (err) {
      console.error("Invalid origin header:", origin);
    }
  }

  // Fallback to req.hostname (server-level detection)
  if (!host && req.hostname) {
    host = req.hostname;
  }

  // Default to client if still unknown
  if (!host) return "client";

  return host.startsWith("admin.") ? "admin" : "client";
}

// ----------------- Middleware -----------------
export const isUser = async (req, res, next) => {
  try {
    const portal = getPortalFromReq(req);
    const cookieName = portal === "admin" ? "ind_admin_jwt" : "ind_client_jwt";

    const token = req.cookies?.[cookieName];
    if (!token) {
      throw new AuthenticationError(
        `No auth token provided for ${portal} portal`,
        "AUTH_004"
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRAT);
    } catch (err) {
      throw new AuthenticationError(
        "Invalid or expired token",
        "AUTH_002"
      );
    }

    if (!decoded || decoded.aud !== portal) {
      throw new AuthorizationError(
        "Cross-portal token detected",
        "AUTH_003"
      );
    }

    req.user = decoded.user;

    next();
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};