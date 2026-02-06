import nodemailer from "nodemailer";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const sendSchoolcontactmail = asyncHandler(async (req, res) => {
    const {
        organization,
        contactPerson,
        contactNumber,
        contactEmail,
        teachers,
        students,
        schoolSize,
        address,
    } = req.body;

        // Transporter setup (replace with your SMTP)
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        // test connection
        transporter.verify((error, success) => {
            if (error) {
                console.error("SMTP Error:", error);
            } else {
                console.log("SMTP Connected:", success);
            }
        });

        // Mail options
        const mailOptions = {
            from: `"Acewall Scholars Contact" <${process.env.MAIL_USER}>`,
            to: ["support@acewallscholars.org", "programs@acewallscholars.org"],
            subject: `New Contact Submission from ${organization}`,
            html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f7fb; padding: 20px;">
    <!-- Header -->
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <div style="background: #28a745; padding: 20px; text-align: center;">
        <img src="https://yourdomain.com/logo.png" alt="Acewall Scholars Logo" style="height: 50px; margin-bottom: 10px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">New School Contact Submission</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px; margin-bottom: 20px;">You have received a new contact submission from a school.</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8; width: 40%;">Organization</td>
            <td style="padding: 8px;">${organization}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">Contact Person</td>
            <td style="padding: 8px;">${contactPerson}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">Contact Number</td>
            <td style="padding: 8px;">${contactNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">Contact Email</td>
            <td style="padding: 8px;">${contactEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">No. of Teachers</td>
            <td style="padding: 8px;">${teachers}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">No. of Students</td>
            <td style="padding: 8px;">${students}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">School Size</td>
            <td style="padding: 8px;">${schoolSize}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; background: #f0f4f8;">Address</td>
            <td style="padding: 8px;">${address}</td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div style="background: #28a745; color: #ffffff; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">This email was automatically generated. Please do not reply.</p>
      </div>
    </div>
  </div>
  `,
        };


    // Send email
    await transporter.sendMail(mailOptions);

    return res.json({ 
        message: "Email sent successfully!" 
    });
});