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
import twilio from "twilio";
import stripe from "../config/stripe.js";

// Import error classes
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

const generateReferralCode = async (firstName) => {
  const prefix = firstName.toUpperCase().replace(/\s+/g, "").slice(0, 4);
  let isUnique = false;
  let code = "";

  while (!isUnique) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    code = `${prefix}${randomDigits}`;
    const existingUser = await User.findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return code;
};

export const initiateSignup = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    middleName,
    lastName,
    role,
    email,
    homeAddress,
    mailingAddress,
    password,
  } = req.body;

  // 1. Removed 'phone' from the required fields check
  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !role
  ) {
    throw new ValidationError("All required fields must be filled.", "VAL_001");
  }

  console.log("working here 1");
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError("User with this email already exists.", "AUTH_005");
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

  // 2. Removed phone number formatting logic (phoneNumUpdated)

  console.log("working here 2");

  await OTP.findOneAndUpdate(
    { email },
    {
      otp: hashedOTP,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userData: {
        firstName,
        middleName,
        lastName,
        role,
        email,
        // 3. Removed 'phone' from the userData object
        homeAddress,
        mailingAddress,
        password: hashedPassword,
      },
    },
    { upsert: true }
  );

  console.log("working here 3");

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

  console.log("working here 4");

  await transporter.sendMail({
    from: `"OTP Verification" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Your OTP Code - Acewall Scholars",
    html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">OTP Verification</h1>
      </div>

      <div style="padding: 20px; color: #333; text-align: center;">
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 16px;">Use the following One-Time Password (OTP) to complete your verification:</p>
        
        <div style="margin: 20px auto; display: inline-block; background: #28a745; color: #ffffff; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 6px; letter-spacing: 4px;">
          ${otp}
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          This code will expire in <b>10 minutes</b>. If you did not request this, please ignore this email.
        </p>
      </div>

      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
  });

  console.log("working here 5");

  res.status(201).json({ message: "OTP sent to your email." });
});


export const resendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError("Email is required.", "VAL_001");
  }

  const otpRecord = await OTP.findOne({ email });

  if (!otpRecord) {
    throw new NotFoundError(
      "No OTP record found for this email. Please sign up again.",
      "AUTH_006"
    );
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
    subject: "Your New OTP Code - Acewall Scholars",
    html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <!-- Logo -->
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <!-- Header -->
      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">New OTP Code</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333; text-align: center;">
    <p style="font-size: 16px;">
          Hello,
        </p>        <p style="font-size: 16px;">Here is your new One-Time Password (OTP). Use it to complete your verification:</p>
        
        <div style="margin: 20px auto; display: inline-block; background: #28a745; color: #ffffff; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 6px; letter-spacing: 4px;">
          ${otp}
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          This code will expire in <b>10 minutes</b>. If you did not request this, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
  });


  res.status(200).json({ message: "New OTP has been sent to your email." });
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_ACCOUNT_TOKEN
);

export const verifyEmailOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  // 1. Find the OTP record
  const otpEntry = await OTP.findOne({ email });
  if (!otpEntry) {
    throw new ValidationError("OTP not found or already used.", "AUTH_006");
  }

  // 2. Check validity and expiration
  const isExpired = Date.now() > otpEntry.expiresAt;
  const isValid = await bcrypt.compare(otp, otpEntry.otp);

  if (!isValid || isExpired) {
    throw new ValidationError("Invalid or expired OTP.", "AUTH_006");
  }

  // 3. Extract user data stored during the initiateSignup phase
  const {
    firstName,
    middleName,
    lastName,
    role,
    email: userEmail,
    homeAddress,
    mailingAddress,
    password,
  } = otpEntry.userData;

  // 4. Create the final User account
  const newUser = new User({
    firstName,
    middleName,
    lastName,
    role,
    email: userEmail,
    homeAddress,
    mailingAddress,
    password, // This is already hashed from initiateSignup
    isVerified: true, // Mark the user as verified
  });

  if (role === "student") {
    newUser.referralCode = await generateReferralCode(firstName);
  }

  await newUser.save();

  const account = await stripe.accounts.create({
    type: "express",
    email: otpEntry.userData.email,
    capabilities: {
      transfers: { requested: true },
    },
  });

  newUser.stripeAccountId = account.id;
  await newUser.save();

  // 5. Delete the OTP record so it can't be reused
  await OTP.deleteOne({ email });

  // 6. Return the user data (excluding password) for the frontend session
  const userResponse = newUser.toObject();
  delete userResponse.password;

  // ✅ Issue JWT token so user is auto-logged in after signup
  generateToken(newUser, newUser.role, req, res);

  res.status(200).json({
    message: "Email verified successfully. Registration complete!",
    user: userResponse,
  });
});

export const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const otpEntry = await OTP.findOne({ email });
  if (!otpEntry || !otpEntry.isVerified) {
    throw new ValidationError("Email not verified yet.", "AUTH_008");
  }

  const isExpired = Date.now() > otpEntry.expiresAt;
  const isValid = await bcrypt.compare(otp, otpEntry.phoneOtp);

  if (!isValid || isExpired) {
    return res.status(400).json({ message: "Invalid or expired phone OTP." });
  }

  const newUser = new User({ ...otpEntry.userData });

  if (newUser.role === "student") {
    newUser.referralCode = await generateReferralCode(newUser.firstName);
  }

  await newUser.save();

  // Delete OTP entry since it's used
  await OTP.deleteOne({ email });

  // 🔔 Send welcome email if teacher
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
    <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Logo -->
        <div style="text-align: center; padding: 20px; background: #ffffff;">
          <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
               alt="Acewall Scholars Logo" 
               style="height: 60px; margin: 0 auto;" />
        </div>

        <!-- Header -->
        <div style="background: #28a745; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Welcome to Acewall Scholars</h1>
        </div>

        <!-- Body -->
        <div style="padding: 20px; color: #333; text-align: left;">
          <h2 style="margin-top: 0;">Hello ${newUser.firstName},</h2>
          <p>
            Thank you for registering to be an <strong>Instructor</strong> on the 
            <strong>Acewall Scholars Learning Platform</strong>. We are excited to partner with you.
          </p>
          <p>You can start creating your course now! Before it can be published for purchase, please submit the required documents:</p>
          <ul>
            <li>University Transcripts</li>
            <li>Teacher’s License or Certifications in your field of instruction</li>
            <li>Two Forms of ID:
              <ul>
                <li>Passport</li>
                <li>Government issued ID</li>
                <li>Driver's License</li>
                <li>Birth Certificate</li>
              </ul>
            </li>
            <li>Resume/CV</li>
          </ul>
          <p><em>(File types allowed: JPG, JPEG, PDF)</em></p>
          <p>We look forward to seeing the impact you will make!</p>
        </div>

        <!-- Footer -->
        <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
          <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
          <p style="margin: 0;">If you have any query contact us on same email</p>
        </div>
      </div>
    </div>
    `,
    };

    await transporter.sendMail(mailOptions);
  }




  // ✅ issue token
  generateToken(newUser, newUser.role, req, res);

  return res.status(201).json({
    message: "User created successfully.",
    user: newUser
  });
});

export const resendPhoneOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError("Email is required.", "VAL_001");
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

  const phoneOtp = generateOTP();
  const hashedOTP = await bcrypt.hash(phoneOtp, 10);

  otpRecord.phoneOtp = hashedOTP;
  otpRecord.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await otpRecord.save();

  // Resend email
  const userData = otpRecord.userData;

  console.log(userData, "userData")

  // 🚀 Send SMS using purchased number
  await twilioClient.messages.create({
    body: `Your Acewall Scholars phone verification code is: ${phoneOtp}`,
    from: process.env.TWILIO_PHONE_NUMBER, // purchased Twilio number
    to: userData.phone,
  });

  return res.status(200).json({
    message: "New OTP has been sent to your phone number."
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError("All fields must be filled", "VAL_001");
  }

  const user = await User.findOne({ email });

  console.log(user, "user in the login")
  if (!user) {
    throw new AuthenticationError("Invalid credentials", "AUTH_001");
  }

  const isAuthorized = await bcrypt.compare(password, user.password);
  if (!isAuthorized) {
    throw new AuthenticationError("Invalid credentials", "AUTH_001");
  }

  // Ensure students have a referral code (for legacy users)
  if (user.role === "student" && !user.referralCode) {
    user.referralCode = await generateReferralCode(user.firstName);
    await user.save();
  }

  // ✅ Pass both req and res here
  const token = generateToken(user, user.role, req, res);

  return res.status(200).json({
    message: "Login Successful",
    user,
    token, // optional, since cookie is already set
  });
});

export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const isExist = await User.findOne({ email });

  if (!isExist) {
    throw new NotFoundError(
      "User with this email does not exist",
      "AUTH_007"
    );
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
    subject: "Your OTP Code - Acewall Scholars",
    html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <!-- Logo -->
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <!-- Header -->
      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">OTP Verification</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333; text-align: center;">
    <p style="font-size: 16px;">
          Hello,
        </p>        <p style="font-size: 16px;">Use the following One-Time Password (OTP) to complete your verification:</p>
        
        <div style="margin: 20px auto; display: inline-block; background: #28a745; color: #ffffff; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 6px; letter-spacing: 4px;">
          ${otp}
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          This code will expire in <b>10 minutes</b>. If you did not request this, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
  });


  return res.status(200).json({
    message: "OTP sent successfully",
  });
});

export const verifyOTPForgotPassword = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  const otpEntry = await OTP.findOne({ email });

  if (!otpEntry) {
    throw new ValidationError("OTP not found or already used.", "AUTH_006");
  }

  const isExpired = Date.now() > otpEntry.expiresAt;
  const isValid = await bcrypt.compare(otp, otpEntry.otp);

  if (!isValid || isExpired) {
    throw new ValidationError("Invalid or expired OTP.", "AUTH_006");
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
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, newPassword } = req.body;

  console.log(email, newPassword);

  // Check if OTP was verified
  const otpEntry = await OTP.findOne({ email });

  if (!otpEntry || !otpEntry.isVerified) {
    throw new ValidationError(
      "OTP not verified or session expired",
      "AUTH_006"
    );
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
});

export const logout = asyncHandler(async (req, res) => {
  // Detect portal like in generateToken/isUser
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
  const cookieName = portal === "admin" ? "ind_admin_jwt" : "ind_client_jwt";

  // Clear the cookie
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/", // Must match original cookie path
  });

  return res.status(200).json({
    message: `User logged out successfully from ${portal} portal`,
  });
});

export const allUser = asyncHandler(async (req, res) => {
  const allUser = await User.find();

  return res.status(200).json({
    users: allUser,
    message: "Users retrieved successfully",
  });
});

export const checkAuth = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  // Ensure students have a referral code (for legacy users)
  if (user && user.role === "student" && !user.referralCode) {
    user.referralCode = await generateReferralCode(user.firstName);
    await user.save();
  }

  return res.status(200).json({
    user: user
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  console.log(req.body, "body");

  let updatedFields = { ...req.body };

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updatedFields },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    message: "User Updated Successfully",
    user: updatedUser
  });
});
export const checkUser = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError("Email is required", "VAL_001");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({
      message: "User already exists"
    });
  } else {
    return res.status(200).json({
      message: "User does not exist"
    });
  }
});

export const allTeacher = asyncHandler(async (req, res) => {
  const { name, email } = req.query;

  // Build query based on available filters
  let query = { role: "teacher" };

  // Filter by name (firstName or lastName)
  if (name) {
    const nameRegex = new RegExp(name, "i"); // Case-insensitive search
    query.$or = [
      { firstName: { $regex: nameRegex } },
      { lastName: { $regex: nameRegex } }
    ];
  }

  // Filter by email
  if (email) {
    const emailRegex = new RegExp(email, "i"); // Case-insensitive search
    query.email = { $regex: emailRegex };
  }

  // Fetch teachers with the constructed query
  const teachers = await User.find(query).select(
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

  return res.status(200).json({
    teachers: formattedTeachers
  });
});

export const allStudent = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const skip = (page - 1) * limit;
  const search = req.query.search || ""; // get search term

  // Base query
  const query = { role: "student" };

  // If search provided, add filter (case-insensitive)
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const totalStudents = await User.countDocuments(query);

  const students = await User.find(query)
    .sort({ createdAt: -1 })
    .select("firstName lastName email createdAt courses profileImg _id")
    .skip(skip)
    .limit(limit);

  const formattedStudents = students.map((student) => ({
    name: `${student.firstName} ${student.lastName}`,
    email: student.email,
    joiningDate: student.createdAt,
    numberOfCourses: student.courses?.length || 0,
    profileImg: student.profileImg,
    id: student._id,
  }));

  return res.status(200).json({
    total: totalStudents,
    currentPage: page,
    totalPages: Math.ceil(totalStudents / limit),
    students: formattedStudents,
  });
});

export const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get student/user info
  const user = await User.findById(id).select(
    "firstName middleName lastName email profileImg createdAt"
  );
  if (!user) {
    throw new NotFoundError("Student not found.", "AUTH_009");
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

  return res.status(200).json({
    user,
    enrollments,
    message: "Student and enrollments fetched successfully",
  });
});

export const getTeacherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacher = await User.findById(id).select(
    "firstName lastName email profileImg createdAt documents isVarified"
  );
  if (!teacher) {
    throw new NotFoundError("Teacher not found.", "AUTH_010");
  }

  const courses = await CourseSch.aggregate([
    { $match: { createdby: new mongoose.Types.ObjectId(id) } },
    { $project: { courseTitle: 1, courseDescription: 1, _id: 1 } },
  ]);

  return res.status(200).json({
    teacher,
    courses
  });
});

export const getUserInfo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new NotFoundError("User not found", "AUTH_011");
  }
  return res.status(200).json({
    message: "User found successfully",
    user
  });
});

export const updateProfileImg = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const file = req.file;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found", "AUTH_012");
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

  return res.status(200).json({
    message: "Profile image updated successfully",
    user
  });
});

export const updatePasswordOTP = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found", "AUTH_013");
  }

  // Validate old password
  const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordMatch) {
    throw new ValidationError("Old password is incorrect", "AUTH_014");
  }

  // Reject if newPassword === old password
  const isSameAsOld = await bcrypt.compare(newPassword, user.password);
  if (isSameAsOld) {
    throw new ValidationError("New password must be different from the old password", "AUTH_015");
  }

  // Check if new and confirm password match
  if (newPassword !== confirmPassword) {
    throw new ValidationError("New password and confirm password do not match", "AUTH_016");
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
    subject: "Your OTP Code - Acewall Scholars",
    html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <!-- Logo -->
      <div style="text-align: center; padding: 20px; background: #ffffff;">
        <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
             alt="Acewall Scholars Logo" 
             style="height: 60px; margin: 0 auto;" />
      </div>

      <!-- Header -->
      <div style="background: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">OTP Verification</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333; text-align: center;">
        <p style="font-size: 16px;">
          Hello ${user.name ? user.name : ""},
        </p>
        <p style="font-size: 16px;">Use the following One-Time Password (OTP) to complete your verification:</p>
        
        <div style="margin: 20px auto; display: inline-block; background: #28a745; color: #ffffff; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 6px; letter-spacing: 4px;">
          ${otp}
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          This code will expire in <b>10 minutes</b>. If you did not request this, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">If you have any query contact us on same email</p>
      </div>
    </div>
  </div>
  `,
  });


  return res.status(200).json({
    message: "OTP sent successfully"
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const otpEntry = await OTP.findOne({ email });

  if (!otpEntry) {
    throw new ValidationError("OTP not found or already used.", "AUTH_017");
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

  return res.status(200).json({
    message: "Password updated successfully"
  });
});

export const updateEmailOTP = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { newEmail } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found", "AUTH_019");
  }

  const isExist = await User.findOne({ email: newEmail });
  if (isExist) {
    throw new ConflictError("Email already exists", "AUTH_020");
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

  return res.status(200).json({
    message: "OTP sent successfully to previous email"
  });
});

export const updateEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const userId = req.user._id;
  const user = await User.findById(userId).select("-email");

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

  const newUser = await User.findOneAndUpdate({ email: email }, { email: newEmail }, { new: true });

  generateToken(newUser, newUser.role, req, res)

  return res.status(200).json({
    message: "Email updated successfully"
  });
});

export const updatePhoneOTP = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { newPhone } = req.body;

  console.log(newPhone, "newPhone");

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found", "AUTH_023");
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

  const phoneOtp = generateOTP();
  const hashedOTP = await bcrypt.hash(phoneOtp, 10);

  const phoneNumUpdated = `+${newPhone.replace(/\D+/g, "")}`;

  await OTP.findOneAndUpdate(
    { email: user.email },
    {
      phoneOtp: hashedOTP,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userData: {
        phone: phoneNumUpdated,
      },
    },
    { upsert: true }
  );

  // 🚀 Send SMS using purchased number
  await twilioClient.messages.create({
    body: `Your Acewall Scholars phone verification code is: ${phoneOtp}`,
    from: process.env.TWILIO_PHONE_NUMBER, // purchased Twilio number
    to: phoneNumUpdated,
  });

  return res.status(200).json({
    message: "OTP sent successfully to new phone number"
  });
});

export const updatePhone = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const otpEntry = await OTP.findOne({ email });

  console.log(otpEntry, "otpEntry");

  if (!otpEntry) {
    throw new ValidationError("OTP not found or already used.", "AUTH_024");
  }

  const isExpired = Date.now() > otpEntry.expiresAt;
  const isValid = await bcrypt.compare(otp, otpEntry.phoneOtp);

  if (!isValid || isExpired) {
    throw new ValidationError("Invalid or expired OTP.", "AUTH_025");
  }

  await OTP.updateOne(
    { email },
    {
      $set: {
        isVerified: true,
      },
    }
  );

  const { phone } = otpEntry.userData;

  console.log(otpEntry.userData, "otpEntry.userData")

  await User.findOneAndUpdate({ email: email }, { phone });

  return res.status(200).json({
    message: "Phone number updated successfully"
  });
});

export const uploadTeacherDocument = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const file = req.file;
  const { category } = req.body;

  if (!file || !category) {
    throw new ValidationError("Category and file are required", "VAL_002");
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
    throw new ValidationError("Invalid document category", "VAL_003");
  }

  // Ensure document storage structure exists
  if (!user.documents) user.documents = {};
  if (!Array.isArray(user.documents[category])) {
    user.documents[category] = [];
  }

  // Check limit
  if (user.documents[category].length >= documentCategories[category]) {
    throw new ValidationError(
      `Maximum upload limit reached for ${category}`,
      "VAL_004"
    );
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

  return res.status(200).json({
    message: "Document uploaded successfully",
    documents: user.documents,
  });
});










export const deleteTeacherDocument = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { documentId } = req.params;

  const user = await User.findById(userId);
  if (!user || user.role !== "teacher") {
    throw new AuthenticationError("Unauthorized or not a teacher", "AUTH_027");
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
    throw new NotFoundError("Document not found", "AUTH_028");
  }

  await user.save();

  return res.status(200).json({
    message: "Document deleted and reindexed successfully",
    documents: user.documents,
  });
});




export const verifyTeacherDocument = asyncHandler(async (req, res) => {
  const { userId, documentId } = req.params;
  const { status } = req.body;

  if (!["verified", "not_verified"].includes(status)) {
    throw new ValidationError(
      "Invalid status value. Must be 'verified' or 'not_verified'.",
      "VAL_005"
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found.", "AUTH_029");
  }

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

  if (!foundDoc) {
    throw new NotFoundError("Document not found.", "AUTH_030");
  }

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
        subject: "Document Rejected - Acewall Scholars",
        html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          
          <!-- Logo -->
          <div style="text-align: center; padding: 20px; background: #ffffff;">
            <img src="https://lirp.cdn-website.com/6602115c/dms3rep/multi/opt/acewall+scholars-431w.png" 
                 alt="Acewall Scholars Logo" 
                 style="height: 60px; margin: 0 auto;" />
          </div>

          <!-- Header -->
          <div style="background: #28a745; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Document Rejected</h1>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hello ${user.firstName || ""},</p>
            <p style="font-size: 16px;">
              One of your submitted documents has been <strong>rejected</strong> by the admin team.
            </p>
            <p style="font-size: 16px;">
              Please review your document and upload a valid one to proceed with verification.
            </p>
            <p style="font-size: 16px; margin-top: 20px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
            <p style="font-size: 16px; margin-top: 20px;">
              Best regards,<br/>
              <strong>Team LMS</strong>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
            <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
            <p style="margin: 0;">If you have any query contact us on same email</p>
          </div>
        </div>
      </div>
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
    documents: user.documents,
  });
});






export const previewSignIn = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new AuthenticationError("No user found", "AUTH_031");
  }

  // Clear old cookie
  res.clearCookie("ind_client_jwt", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  const prevRole = "teacherAsStudent";

  // Generate new token with new role
  generateToken(user, prevRole, req, res);

  // Return the updated user object
  const updatedUser = { ...user, role: prevRole };

  return res.status(200).json({
    message: "Preview Signin Successful",
    user: updatedUser,
  });
});

export const previewSignOut = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new AuthenticationError("No user found", "AUTH_032");
  }

  // Clear old cookie
  res.clearCookie("ind_client_jwt", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  const teacherUser = await User.findById(req.user._id);
  if (!teacherUser) {
    throw new NotFoundError("User not found", "AUTH_033");
  }

  // Generate new token with new role
  generateToken(teacherUser, teacherUser.role, req, res);

  return res.status(200).json({
    message: "Preview Signout Successful",
  });
});