import jwt from "jsonwebtoken";

export const generateJitsiToken = (user, roomName, isTeacher) => {
  const JITSI_APP_ID = "my-lms-app"; // You'll configure this on your Jitsi server later
  const JITSI_SECRET = process.env.JITSI_APP_SECRET; // A different secret from your LMS secret

  const payload = {
    iss: JITSI_APP_ID,
    aud: JITSI_APP_ID,
    sub: "meet.yourdomain.com", // Your Jitsi domain
    room: roomName,
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // Valid for 1 hour
    context: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatar: user.profileImg,
        moderator: isTeacher ? "true" : "false" // Gives teacher host controls
      },
      features: {
        recording: isTeacher, // Only teacher can record
        livestreaming: isTeacher
      }
    }
  };

  return jwt.sign(payload, JITSI_SECRET);
};



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
    profileImg: user.profileImg,
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