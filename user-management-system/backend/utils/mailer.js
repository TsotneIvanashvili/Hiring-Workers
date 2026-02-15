const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

/**
 * Sends a welcome-back email to the user after successful login.
 * Errors are caught and logged — they never block the login flow.
 */
async function sendWelcomeEmail(userEmail) {
    const mailOptions = {
        from: `"HireWork Team" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: 'Welcome back 👋',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Hi there,</h2>
                <p>We noticed you just logged into your account.</p>
                <p>We're happy to have you back! 🚀</p>
                <p>If this wasn't you, please secure your account immediately.</p>
                <br>
                <p>Best regards,<br><strong>HireWork Team</strong></p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${userEmail}`);
    } catch (error) {
        console.error(`Failed to send welcome email to ${userEmail}:`, error.message);
    }
}

module.exports = { sendWelcomeEmail };
