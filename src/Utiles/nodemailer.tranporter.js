import nodemailer from "nodemailer";

let transporter;

export const createTransporter = () => {
  try {

    if (transporter) {
      return transporter; // reuse existing transporter
    }

    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    return transporter;

  } catch (error) {

    console.error("❌ Transporter creation failed:", error.message);
    throw error;

  }
};