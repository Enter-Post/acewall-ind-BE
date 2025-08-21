import jwt from "jsonwebtoken";

export const generateToken = (userID, role, res) => {
  const token = jwt.sign({ userID, role }, process.env.JWT_SECRAT, {
    expiresIn: "7d",
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  });

  console.log("Cookie sent with:", {
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });

  return token;
};
