import jwt from "jsonwebtoken";
import User from "../Models/user.model.js";
// import Admin from "../Models/admins.model.js";   // Uncomment later if needed

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
      return res.status(401).json({
        error: true,
        message: `No auth token provided for ${portal} portal`,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRAT);
    } catch (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid or expired token",
      });
    }

    if (!decoded || decoded.aud !== portal) {
      return res.status(401).json({
        error: true,
        message: "Cross-portal token detected",
      });
    }

    req.user = decoded.user;

    next();
  } catch (error) {
    console.error("Error in isUser middleware:", error);
    return res.status(500).json({
      error: true,
      message: "Authentication failed",
    });
  }
};