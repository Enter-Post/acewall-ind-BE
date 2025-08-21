import jwt from "jsonwebtoken";
import User from "../Models/user.model.js";
// import Admin from "../Models/admins.model.js";

export const isUser = async (req, res, next) => {
  //   console.log("middleware executed", req);
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(400).json({
        message: "user not found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRAT);

    // console.log(decoded);

    if (!decoded) {
      return res.status(500).json({
        message: "Unauthorized token",
      });
    }

    const customer = await User.findById(decoded.userID).select("-password");
    // const admin = await Admin.findById(decoded.userID).select("-password");

    if (!customer) {
      return res.status(500).json({
        message: "User not found",
      });
    }

    req.user = customer;

    // if (admin) {
    //   req.user = admin;
    // } else {
    //   req.user = customer;
    // }

    next();
  } catch (error) {
    console.log("error in isUser middleware ==>", error);
    return res.status(500).json({
      error: true,
      message: "some thing went wrong",
    });
  }
};
