import nodemailer from "nodemailer";

export const sendSupportMail = async (req, res) => {
  const { fullName, email, feedback } = req.body;

  if (!fullName || !email || !feedback) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

  const mailOptions = {
  from: `"Support Inquiry" <${process.env.MAIL_USER}>`,
  to: process.env.MAIL_SUPPORT_TO,
  subject: "New Support Request",
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
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Support Request</h1>
      </div>

      <!-- Body -->
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;"><strong>Name:</strong> ${fullName}</p>
        <p style="font-size: 16px;"><strong>Email:</strong> ${email}</p>
        <p style="font-size: 16px;"><strong>Feedback:</strong></p>
        <div style="margin: 15px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #28a745;">
          <p style="margin: 0; font-size: 15px; color: #444;">${feedback}</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f0f4f8; color: #555; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">Acewall Scholars © ${new Date().getFullYear()}</p>
        <p style="margin: 0;">Do not reply to this automated message.</p>
      </div>
    </div>
  </div>
  `,
};


    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Support message sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ message: "Failed to send support email." });
  }
};
