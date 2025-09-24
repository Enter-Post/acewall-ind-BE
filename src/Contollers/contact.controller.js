import nodemailer from "nodemailer";

export const sendSchoolcontactmail = async (req, res) => {
    try {
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
            from: `"Acewall Scholars Contact" <${process.env.MAIL_USER}>`, // sender address
            to: ["support@acewallscholars.org", "programs@acewallscholars.org"], 
            subject: `New Contact Submission from ${organization}`,
            html: `
        <h2>New School Contact Information</h2>
        <p><b>Organization:</b> ${organization}</p>
        <p><b>Contact Person:</b> ${contactPerson}</p>
        <p><b>Contact Number:</b> ${contactNumber}</p>
        <p><b>Contact Email:</b> ${contactEmail}</p>
        <p><b>No of Teachers:</b> ${teachers}</p>
        <p><b>No of Students:</b> ${students}</p>
        <p><b>School Size:</b> ${schoolSize}</p>
        <p><b>Address:</b> ${address}</p>
      `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Email sent successfully!" });
    } catch (error) {
        console.log("error in sending contact mail", error);
        res.status(500).json({ message: "Internal Server Error" })
    }
}