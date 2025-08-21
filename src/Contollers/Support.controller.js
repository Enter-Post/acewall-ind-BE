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
        <h3>Support Request</h3>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Feedback:</strong><br/>${feedback}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Support message sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ message: "Failed to send support email." });
  }
};
