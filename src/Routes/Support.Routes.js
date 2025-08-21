// // routes/Support.Routes.js
// import express from "express";
// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();
// const router = express.Router();

// router.post("/", async (req, res) => {
//   const { fullName, email, feedback } = req.body;

//   if (!fullName || !email || !feedback) {
//     return res.status(400).json({ message: "All fields are required." });
//   }

//   try {
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.MAIL_USER, // your email
//         pass: process.env.MAIL_PASS, // app password (not regular password)
//       },
//     });

//     const mailOptions = {
//       from: email,
//       to: process.env.MAIL_RECEIVER, // your target support email
//       subject: `Support Request from ${fullName}`,
//       html: `
//         <h3>Support Message</h3>
//         <p><strong>Name:</strong> ${fullName}</p>
//         <p><strong>Email:</strong> ${email}</p>
//         <p><strong>Message:</strong><br/>${feedback}</p>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     res.status(200).json({ message: "Support request sent successfully." });
//   } catch (err) {
//     console.error("Email send error:", err);
//     res.status(500).json({ message: "Failed to send email. Please try again later." });
//   }
// });

// export default router;
