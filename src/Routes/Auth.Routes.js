import express from "express";
import {
  allUser,
  checkAuth,
  login,
  logout,
  updateUser,
  checkUser,
  allTeacher,
  verifyOtpAndSignup,
  initiateSignup,
  resendOTP,
  forgetPassword,
  resetPassword,
  getUserInfo,
  updateProfileImg,
  updatePassword,
  updatePasswordOTP,
  updateEmailOTP,
  updateEmail,
  verifyOTPForgotPassword,
  getStudentById,
  uploadTeacherDocument,
  deleteTeacherDocument,
  verifyTeacherDocument,
} from "../Contollers/auth.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { upload } from "../lib/multer.config.js";
// import { checkRole, isAllowed } from "../Middlewares/admins.Middleware.js";
const router = express.Router();

router.post("/register", initiateSignup);
router.post("/verifyOTP", verifyOtpAndSignup);
router.post("/resendOTP", resendOTP);
router.post("/login", login);
router.post("/forgotPassword", forgetPassword);
router.post("/verifyForgotPassOTP", verifyOTPForgotPassword);
router.post("/resetPassword", resetPassword);
router.post("/logout", logout);
router.get("/checkAuth", isUser, checkAuth);
router.post("/check-existence", checkUser);
router.get("/users", allUser);
router.put("/updateuser", isUser, updateUser);
router.get("/allTeacher", allTeacher);
router.get("/getUserInfo", isUser, getUserInfo);
router.put(
  "/updateProfileImg",
  isUser,
  upload.single("profileImg"),
  updateProfileImg
);
router.post("/updatePasswordOTP", isUser, updatePasswordOTP);
router.put("/updatePassword", isUser, updatePassword);
router.post("/updateEmailOTP", isUser, updateEmailOTP);
router.put("/updateEmail", isUser, updateEmail);


router.post(
  "/uploadDocument",
  isUser,
  upload.single("document"), 
  uploadTeacherDocument
);

router.delete('/teacher/document/:documentId', isUser, deleteTeacherDocument);
router.patch("/verify-document/:userId/:documentId", verifyTeacherDocument);

export default router;