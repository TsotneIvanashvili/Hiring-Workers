const dns = require('dns').promises;
const net = require('net');
const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';

function parseBoolean(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return defaultValue;
}

async function resolveTransportHost() {
    const forceIpv4 = parseBoolean(process.env.SMTP_FORCE_IPV4, /gmail\.com$/i.test(smtpHost));
    const hostIsIp = net.isIP(smtpHost);
    const explicitTlsServername = process.env.SMTP_TLS_SERVERNAME;

    if (!forceIpv4 || hostIsIp) {
        return {
            host: smtpHost,
            tlsServername: explicitTlsServername || (hostIsIp ? undefined : smtpHost)
        };
    }

    try {
        const ipv4Addresses = await dns.resolve4(smtpHost);
        if (ipv4Addresses.length > 0) {
            return {
                host: ipv4Addresses[0],
                tlsServername: explicitTlsServername || smtpHost
            };
        }
    } catch (error) {
        console.warn(`SMTP IPv4 resolve failed for ${smtpHost}: ${error.message}. Falling back to hostname.`);
    }

    return {
        host: smtpHost,
        tlsServername: explicitTlsServername || smtpHost
    };
}

async function createTransporter() {
    const { host, tlsServername } = await resolveTransportHost();
    const transporterConfig = {
        host,
        port: Number.isNaN(smtpPort) ? 465 : smtpPort,
        secure: smtpSecure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    };

    if (tlsServername) {
        transporterConfig.tls = {
            servername: tlsServername
        };
    }

    return nodemailer.createTransport(transporterConfig);
}

function formatCurrency(value) {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return amount.toFixed(2);
}

async function sendEmail({ to, subject, html }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Email skipped: SMTP_USER and SMTP_PASS must be configured.');
        return;
    }

    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'HireWork Team'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
    };

    try {
        const transporter = await createTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error.message);
    }
}

async function sendRegistrationEmail({ email, name }) {
    const displayName = name || 'there';

    return sendEmail({
        to: email,
        subject: 'Welcome to HireWork',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Welcome to HireWork, ${displayName}!</h2>
                <p>Your account was created successfully.</p>
                <p>You can now log in and hire workers from the platform.</p>
                <br>
                <p>Best regards,<br><strong>HireWork Team</strong></p>
            </div>
        `
    });
}

async function sendLoginEmail({ email, name }) {
    const displayName = name || 'there';

    return sendEmail({
        to: email,
        subject: 'New login to your HireWork account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Hi ${displayName},</h2>
                <p>We noticed a login to your account.</p>
                <p>Time: ${new Date().toUTCString()}</p>
                <p>If this was not you, please change your password immediately.</p>
                <br>
                <p>Best regards,<br><strong>HireWork Team</strong></p>
            </div>
        `
    });
}

async function sendHireConfirmationEmail({ email, name, workerName, amount, balance, hireId }) {
    const displayName = name || 'there';

    return sendEmail({
        to: email,
        subject: `Hire confirmed: ${workerName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Hi ${displayName},</h2>
                <p>Your hire request was completed successfully.</p>
                <p><strong>Worker:</strong> ${workerName}</p>
                <p><strong>Amount charged:</strong> $${formatCurrency(amount)}</p>
                <p><strong>Remaining balance:</strong> $${formatCurrency(balance)}</p>
                <p><strong>Hire ID:</strong> ${hireId}</p>
                <br>
                <p>Thank you for using HireWork.</p>
            </div>
        `
    });
}

module.exports = {
    sendRegistrationEmail,
    sendLoginEmail,
    sendHireConfirmationEmail
};
