import User from "../Models/user.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import { generateToken } from "../Utiles/jwtToken.js";
import bcrypt from "bcrypt";
import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import nodemailer from "nodemailer";
import OTP from "../Models/opt.model.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import Enrollment from "../Models/Enrollement.model.js";
import mongoose from "mongoose";

export const initiateSignup = async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    // pronouns,
    // gender,
    role,
    email,
    phone,
    homeAddress,
    mailingAddress,
    password,
  } = req.body;

  try {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !role ||
      !phone
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }

    function generateOTP(length = 6) {
      const digits = "0123456789";
      let otp = "";
      const bytes = crypto.randomBytes(length);

      for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % digits.length];
      }

      return otp;
    }
    const hashedPassword = await bcrypt.hash(password, 11);

    const otp = generateOTP();

    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.findOneAndUpdate(
      { email },
      {
        otp: hashedOTP,
        expiresAt: Date.now() + 10 * 60 * 1000,
        userData: {
          firstName,
          middleName,
          lastName,
          // pronoun: pronouns,
          // gender,
          role,
          email,
          phone,
          homeAddress,
          mailingAddress,
          password: hashedPassword,
        },
      },
      { upsert: true }
    );

    // Send OTP via email (or SMS)
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(201).json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Signup initiation error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(404).json({
        message: "No OTP record found for this email. Please sign up again.",
      });
    }

    function generateOTP(length = 6) {
      const digits = "0123456789";
      let otp = "";
      const bytes = crypto.randomBytes(length);

      for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % digits.length];
      }

      return otp;
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    otpRecord.otp = hashedOTP;
    otpRecord.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await otpRecord.save();

    // Resend email
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your New OTP Code",
      text: `Your new OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: "New OTP has been sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};




export const verifyOtpAndSignup = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpEntry = await OTP.findOne({ email });
    if (!otpEntry) {
      return res
        .status(400)
        .json({ message: "OTP not found or already used." });
    }

    const isExpired = Date.now() > otpEntry.expiresAt;
    const isValid = await bcrypt.compare(otp, otpEntry.otp);

    if (!isValid || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const userData = otpEntry.userData;

    const newUser = new User({ ...userData });
    await newUser.save();
    await OTP.deleteOne({ email });

    // 🔔 Send welcome email if role is teacher
    if (newUser.role === "teacher" && process.env.MAIL_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME || "Acewall Scholars"}" <${process.env.MAIL_USER}>`,
        to: newUser.email,
        subject: `Welcome to Acewall Scholars as an Instructor`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Welcome to Acewall Scholars, ${newUser.firstName}!</h2>
            <p>Thank you for registering to be an instructor on the <strong>Acewall Scholars Learning Platform</strong>. We are excited to partner with you.</p>
            <p>You can start creating your course now! Before it can be published for purchase, please submit the required documents:</p>
            <ul>
              <li>University Transcripts</li>
              <li>Teachers License or Certifications in field of instruction</li>
              <li>Two Forms of ID:
                <ul>
                  <li>Passport</li>
                  <li>Government issued ID</li>
                  <li>Driver’s License</li>
                  <li>Birth Certificate</li>
                </ul>
              </li>
              <li>Resume/CV</li>
            </ul>
            <p><em>(File types allowed: JPG, JPEG, PDF)</em></p>
            <p>We look forward to seeing the impact you will make!</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Instructor welcome email sent to:", newUser.email);
      } catch (emailErr) {
        console.error("❌ Error sending instructor email:", emailErr.message);
      }
    }

    generateToken(newUser._id, newUser.role, res);

    res.status(201).json({
      message: "Your account has been created successfully.",
      newUser,
    });

  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};




export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!password || !email) {
      return res.status(400).json({
        message: "all fields must be filled",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        error: true,
        message: "Invalid Credentials",
      });
    }

    const isAuthorized = await bcrypt.compare(password, user.password);

    if (!isAuthorized) {
      return res.status(500).json({
        error: true,
        message: "Invalid Credentials",
      });
    }
    generateToken(user._id, user.role, res);
    return res.status(200).json({
      message: "Login Successfull",
    });
  } catch (error) {
    console.log("error in login==>", error.message);
    return res.status(500).json({
      message: "Some this Went Wrong, sorry for inconvenience",
    });
  }
};

export const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const isExist = await User.findOne({ email });

    if (!isExist) {
      return res.status(404).json({
        message: "User with this email does not exist",
      });
    }

    function generateOTP(length = 6) {
      const digits = "0123456789";
      let otp = "";
      const bytes = crypto.randomBytes(length);

      for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % digits.length];
      }

      return otp;
    }

    const otp = generateOTP();

    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.findOneAndUpdate(
      { email },
      {
        otp: hashedOTP,
        expiresAt: Date.now() + 10 * 60 * 1000,
        userData: {
          email,
        },
      },
      { upsert: true }
    );

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.log("error in forget Passoword", err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const verifyOTPForgotPassword = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpEntry = await OTP.findOne({ email });

    if (!otpEntry) {
      return res
        .status(400)
        .json({ message: "OTP not found or already used." });
    }

    const isExpired = Date.now() > otpEntry.expiresAt;
    const isValid = await bcrypt.compare(otp, otpEntry.otp);

    if (!isValid || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await OTP.updateOne(
      { email },
      {
        $set: {
          isVerified: true,
        },
      }
    );

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  console.log(email, newPassword);

  try {
    // Check if OTP was verified
    const otpEntry = await OTP.findOne({ email });

    if (!otpEntry || !otpEntry.isVerified) {
      return res.status(400).json({
        message: "OTP not verified or session expired",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.updateOne({ email }, { password: hashedPassword });

    // Clean up the OTP record
    await OTP.deleteOne({ email });

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true on production (HTTPS)
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/", // must match the original cookie path
    });
    return res.status(200).json({
      message: "User Logged Out Successfully",
    });
  } catch (error) {
    console.log("error in logout==>", error.message);
    return res.status(500).json({
      message: "Some this Went Wrong, sorry for inconvenience",
    });
  }
};

export const allUser = async (req, res) => {
  try {
    const allUser = await User.find();

    res.status(200).json({
      allUser,
      message: "User finded Successfully",
    });
  } catch (error) {
    console.log("error in getting allUser==>", error.message);
    res.status(500).json({
      message: "Some this Went Wrong, sorry for inconvenience",
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    console.log("error in check Auth", error.message);
    res.status(500).json({
      message: "Internal server Error",
    });
  }
};

export const updateUser = async (req, res) => {
  const userId = req.user._id;

  console.log(req.body, "body");

  try {
    let updatedFields = { ...req.body };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    res.json({ message: "User Updated Successfully", updatedUser });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};
export const checkUser = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    } else {
      return res.status(200).json({ message: "User does not exist" });
    }
  } catch (err) {
    console.error("Error checking user:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const allTeacher = async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select(
      "firstName lastName email createdAt profileImg _id isVarified"
    );

    const formattedTeachers = await Promise.all(
      teachers.map(async (teacher) => {
        const courseCount = await CourseSch.countDocuments({
          createdby: teacher._id,
        });

        return {
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          joiningDate: teacher.createdAt,
          courses: courseCount,
          profileImg: teacher.profileImg,
          id: teacher._id,
          isVarified: teacher.isVarified, // ✅ Include this
        };
      })
    );

    res.status(200).json(formattedTeachers);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


export const allStudent = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select(
      "firstName lastName email createdAt courses profileImg id"
    );

    const formattedStudent = students.map((student) => ({
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      joiningDate: student.createdAt, // from timestamps
      numberOfCourses: student.courses?.length || 0,
      profileImg: student.profileImg,
      id: student._id,
    }));

    res.status(200).json(formattedStudent);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get student/user info
    const user = await User.findById(id).select(
      "firstName middleName lastName email profileImg createdAt"
    );
    if (!user) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Use aggregation to get enrollments with course and teacher info
    const enrollments = await Enrollment.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(id) } },

      // Lookup course
      {
        $lookup: {
          from: "coursesches", // collection name (check actual collection if pluralized)
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // Lookup teacher info from createdby field in course
      {
        $lookup: {
          from: "users", // collection name for teachers
          localField: "course.createdby",
          foreignField: "_id",
          as: "course.createdby",
        },
      },
      { $unwind: "$course.createdby" },

      // Optionally project only necessary fields
      {
        $project: {
          _id: 1,
          course: {
            courseTitle: 1,
            courseDescription: 1,
            createdby: {
              firstName: 1,
              lastName: 1,
              email: 1,
            },
          },
          // exclude student field
        },
      },
    ]);

    res.status(200).json({
      user,
      enrollments,
      message: "Student and enrollments fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getTeacherById = async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await User.findById(id).select(
      "firstName lastName email profileImg createdAt documents isVarified"
    );
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const courses = await CourseSch.aggregate([
      { $match: { createdby: new mongoose.Types.ObjectId(id) } },
      { $project: { courseTitle: 1, courseDescription: 1, _id: 1 } },
    ]);

    res.status(200).json({ teacher, courses });
  } catch (error) {
    console.error("Error fetching teacher by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserInfo = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json("User not found");
    }
    return res.status(200).json({ message: "User found successfully", user });
  } catch (error) {
    console.log("error in getUserInfo:", error);
    return res.status(500).json("Internal Server Error");
  }
};
export const updateProfileImg = async (req, res) => {
  const userId = req.user._id;
  const file = req.file;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete previous image from Cloudinary
    if (user.profileImg?.publicId) {
      try {
        await cloudinary.uploader.destroy(user.profileImg.publicId);
      } catch (err) {
        console.warn(
          "Failed to delete previous image from Cloudinary:",
          err.message
        );
      }
    }

    // Upload new image
    const result = await uploadToCloudinary(file.buffer, "profile_images");

    // Update user's profileImg field
    user.profileImg = {
      url: result.secure_url,
      filename: result.original_filename,
      publicId: result.public_id,
    };

    await user.save();

    return res
      .status(200)
      .json({ message: "Profile image updated successfully", user });
  } catch (error) {
    console.error("Error in updateProfileImg:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const updatePasswordOTP = async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate old password
    const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Reject if newPassword === old password
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({ message: "New password must be different from the old password" });
    }

    // Check if new and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    // Hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, 11);

    // Generate OTP
    function generateOTP(length = 6) {
      const digits = "0123456789";
      let otp = "";
      const bytes = crypto.randomBytes(length);

      for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % digits.length];
      }

      return otp;
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Save OTP and password update request
    await OTP.findOneAndUpdate(
      { email: user.email },
      {
        otp: hashedOTP,
        expiresAt: Date.now() + 10 * 60 * 1000,
        userData: {
          newPassword: newHashedPassword,
        },
      },
      { upsert: true }
    );

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    return res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("Error in updatePasswordOTP:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const updatePassword = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpEntry = await OTP.findOne({ email });

    if (!otpEntry) {
      return res
        .status(400)
        .json({ message: "OTP not found or already used." });
    }

    const isExpired = Date.now() > otpEntry.expiresAt;
    const isValid = await bcrypt.compare(otp, otpEntry.otp);

    if (!isValid || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await OTP.updateOne(
      { email },
      {
        $set: {
          isVerified: true,
        },
      }
    );

    const { newPassword } = otpEntry.userData;

    await User.updateOne({ email }, { password: newPassword });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("error in updatePassword:", error);
    return res.status(500).json("Internal Server Error");
  }
};

export const updateEmailOTP = async (req, res) => {
  const userId = req.user._id;
  const { newEmail } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isExist = await User.findOne({ email: newEmail });
    if (isExist) {
      return res.status(400).json({ message: "Email already exists" });
    }

    function generateOTP(length = 6) {
      const digits = "0123456789";
      let otp = "";
      const bytes = crypto.randomBytes(length);

      for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % digits.length];
      }

      return otp;
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.findOneAndUpdate(
      { email: user.email },
      {
        otp: hashedOTP,
        expiresAt: Date.now() + 10 * 60 * 1000,
        userData: {
          newEmail: newEmail,
        },
      },
      { upsert: true }
    );

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    return res
      .status(200)
      .json({ message: "OTP sent successfully to previous email" });
  } catch (error) {
    console.error("Error in updatePasswordOTP:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateEmail = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpEntry = await OTP.findOne({ email });

    if (!otpEntry) {
      return res
        .status(400)
        .json({ message: "OTP not found or already used." });
    }

    const isExpired = Date.now() > otpEntry.expiresAt;
    const isValid = await bcrypt.compare(otp, otpEntry.otp);

    if (!isValid || isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await OTP.updateOne(
      { email },
      {
        $set: {
          isVerified: true,
        },
      }
    );

    const { newEmail } = otpEntry.userData;

    await User.findOneAndUpdate({ email: email }, { email: newEmail });

    return res.status(200).json({ message: "Email updated successfully" });
  } catch (error) {
    console.log("error in updatePassword:", error);
    return res.status(500).json("Internal Server Error");
  }
};






export const uploadTeacherDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const file = req.file;
    const { category } = req.body;

    if (!file || !category) {
      return res.status(400).json({ message: "Category and file are required" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Unauthorized or not a teacher" });
    }

    // Document category limits
    const documentCategories = {
      universityTranscripts: 4,
      teacherLicenses: 4,
      ids: 2,
      resume: 2,
      portfolio: 1,
    };

    if (!documentCategories.hasOwnProperty(category)) {
      return res.status(400).json({ message: "Invalid document category" });
    }

    // Ensure document storage structure exists
    if (!user.documents) user.documents = {};
    if (!Array.isArray(user.documents[category])) {
      user.documents[category] = [];
    }

    // Check limit
    if (user.documents[category].length >= documentCategories[category]) {
      return res.status(400).json({
        message: `Maximum upload limit reached for ${category}`,
      });
    }

    // Upload file
    const uploaded = await uploadToCloudinary(file.buffer, "teacher_documents");

    // Format category name (e.g., universityTranscripts => University Transcripts)
    const formattedCategoryName = category

      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (str) => str.toUpperCase());

    const index = user.documents[category].length + 1;

    const document = {
      name: `${formattedCategoryName} ${index}`,
      url: uploaded.secure_url,
      filename: uploaded.public_id,
      uploadedAt: new Date(),
    };

    user.documents[category].push(document);
    await user.save();

    res.status(200).json({
      message: "Document uploaded successfully",
      documents: user.documents,
    });

  } catch (err) {
    console.error("Error uploading document:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};










export const deleteTeacherDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const { documentId } = req.params;

    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Unauthorized or not a teacher" });
    }

    // Find and remove document from nested categories
    let deleted = false;
    for (const category in user.documents) {
      const index = user.documents[category].findIndex(
        (doc) => doc._id.toString() === documentId
      );
      if (index !== -1) {
        const [docToDelete] = user.documents[category].splice(index, 1);

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(docToDelete.filename);

        // Re-index document names
        const label = {
          universityTranscripts: "University Transcripts",
          teacherLicenses: "Teacher Licenses",
          ids: "Identification Documents",
          resume: "Resume",
          portfolio: "Portfolio"
        }[category] || category;

        user.documents[category] = user.documents[category].map((doc, i) => ({
          ...doc,
          name: `${label} ${i + 1}`,
        }));

        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    await user.save();

    return res.status(200).json({
      message: "Document deleted and reindexed successfully",
      documents: user.documents,
    });

  } catch (err) {
    console.error("Error deleting document:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};




export const verifyTeacherDocument = async (req, res) => {
  const { userId, documentId } = req.params;
  const { status } = req.body;

  if (!["verified", "not_verified"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status value. Must be 'verified' or 'not_verified'.",
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Documents are stored per category, so we need to find the document by its _id in any category array
    let foundDoc = null;
    let foundCategory = null;

    for (const [category, docs] of Object.entries(user.documents || {})) {
      const doc = docs.find((d) => d._id.toString() === documentId);
      if (doc) {
        foundDoc = doc;
        foundCategory = category;
        break;
      }
    }

    if (!foundDoc) return res.status(404).json({ message: "Document not found." });

    // Update document verification status
    foundDoc.verificationStatus = status;

    // Check if all documents across all categories are verified
    const allDocs = Object.values(user.documents || {}).flat();
    const allVerified = allDocs.length > 0 && allDocs.every(d => d.verificationStatus === "verified");

    user.isVarified = allVerified; // keep your existing naming if you want

    await user.save();

    // Prepare email transporter (single instance)
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Send email if user is fully verified
    if (user.isVarified && status === "verified") {
      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: user.email,
          subject: "You Are Now Verified!",
          html: `
            <h2>Congratulations, ${user.firstName}!</h2>
            <p>Your documents have been successfully verified by the admin team.</p>
            <p>You are now a verified teacher on our platform and can start your journey.</p>
            <br/>
            <p>Best regards,<br/>Team LMS</p>
          `,
        });
      } catch (mailError) {
        console.error("Error sending verification email:", mailError);
      }
    }

    // Send email if any document is rejected
    if (status === "not_verified") {
      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: user.email,
          subject: "Document Rejected",
          html: `
            <h2>Hello, ${user.firstName}</h2>
            <p>One of your submitted documents has been <strong>rejected</strong> by the admin team.</p>
            <p>Please review your document and upload a valid one to proceed with verification.</p>
            <br/>
            <p>If you have any questions, feel free to reach out to support.</p>
            <p>Best regards,<br/>Team LMS</p>
          `,
        });
      } catch (mailError) {
        console.error("Error sending rejection email:", mailError);
      }
    }

    return res.status(200).json({
      message: `Document ${status === "verified" ? "verified" : "rejected"} successfully.`,
      isVarified: user.isVarified,
      document: foundDoc,
      documents: user.documents, // send back updated documents to frontend
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};




