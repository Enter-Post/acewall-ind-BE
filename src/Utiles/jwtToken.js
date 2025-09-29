import jwt from "jsonwebtoken";

export const generateToken = (user, role, req, res) => {
  // ----------------- Detect portal -----------------
  let host = "";
  const origin = req.get("origin");

  if (origin) {
    try {
      host = new URL(origin).hostname;
    } catch (err) {
      console.error("Invalid origin header:", origin);
    }
  }
  if (!host && req.hostname) {
    host = req.hostname;
  }

  const portal = host && host.startsWith("admin.") ? "admin" : "client";

  // ----------------- Cookie name based on portal -----------------
  const cookieName = portal === "admin" ? "ind_admin_jwt" : "ind_client_jwt";

  // ----------------- Clean user object -----------------
  const safeUser = {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: role || user.role,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    gender: user.gender,
    homeAddress: user.homeAddress,
    phone: user.phone,
    pronoun: user.pronoun,
  };

  // ----------------- Sign JWT -----------------
  const token = jwt.sign(
    { user: safeUser, aud: portal },
    process.env.JWT_SECRAT,
    { expiresIn: "7d" }
  );

  // ----------------- Cookie options -----------------

  if (!res || !res.cookie) {
    throw new Error("❌ Express `res` object not passed into generateToken");
  }

  res.cookie(cookieName, token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  console.log(`✅ Cookie [${cookieName}] sent for portal: ${portal}`);

  return token;
};