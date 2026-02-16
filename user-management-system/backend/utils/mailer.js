const dns = require('dns').promises;
const net = require('net');
const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const parsedPort = Number(process.env.SMTP_PORT || 465);
const smtpPort = Number.isNaN(parsedPort) ? 465 : parsedPort;
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

function isGmailHost(hostname) {
    return /(^|\.)gmail\.com$/i.test(hostname);
}

function isRetryableConnectionError(error) {
    const retryableCodes = new Set([
        'ETIMEDOUT',
        'ESOCKET',
        'ECONNECTION',
        'ENETUNREACH',
        'EHOSTUNREACH',
        'ECONNREFUSED',
        'EAI_AGAIN'
    ]);

    if (error && retryableCodes.has(error.code)) {
        return true;
    }

    const message = ((error && error.message) || '').toLowerCase();
    return message.includes('timeout') || message.includes('enetunreach') || message.includes('ehostunreach');
}

async function resolveTransportTargets() {
    const forceIpv4 = parseBoolean(process.env.SMTP_FORCE_IPV4, isGmailHost(smtpHost));
    const hostIsIp = net.isIP(smtpHost);
    const tlsServernameFromEnv = process.env.SMTP_TLS_SERVERNAME;
    const tlsServername = tlsServernameFromEnv || (hostIsIp ? undefined : smtpHost);
    const parsedMaxIpv4Targets = Number(process.env.SMTP_MAX_IPV4_TARGETS || 3);
    const maxIpv4Targets =
        Number.isNaN(parsedMaxIpv4Targets) || parsedMaxIpv4Targets < 1 ? 3 : Math.floor(parsedMaxIpv4Targets);

    if (!forceIpv4 || hostIsIp) {
        return [{ host: smtpHost, tlsServername }];
    }

    try {
        const ipv4Addresses = await dns.resolve4(smtpHost);
        if (ipv4Addresses.length > 0) {
            return [...new Set(ipv4Addresses)].slice(0, maxIpv4Targets).map((ipAddress) => ({
                host: ipAddress,
                tlsServername: tlsServernameFromEnv || smtpHost
            }));
        }
    } catch (error) {
        console.warn(`SMTP IPv4 resolve failed for ${smtpHost}: ${error.message}. Falling back to hostname.`);
    }

    return [{ host: smtpHost, tlsServername }];
}

function buildTransportConfig({ host, port, secure, tlsServername, requireTLS = false }) {
    const transporterConfig = {
        host,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    };

    if (requireTLS) {
        transporterConfig.requireTLS = true;
    }

    if (tlsServername) {
        transporterConfig.tls = {
            servername: tlsServername
        };
    }

    return transporterConfig;
}

async function getTransportAttempts() {
    const targets = await resolveTransportTargets();
    const attempts = [];
    const seenSignatures = new Set();

    const gmailPortFallbackEnabled = parseBoolean(
        process.env.SMTP_ENABLE_GMAIL_PORT_FALLBACK,
        isGmailHost(smtpHost)
    );

    const addAttempt = ({ host, tlsServername, port, secure, requireTLS, label }) => {
        const signature = `${host}:${port}:${secure ? 'secure' : 'starttls'}:${requireTLS ? 'require' : 'optional'}`;
        if (seenSignatures.has(signature)) {
            return;
        }

        seenSignatures.add(signature);
        attempts.push({
            label,
            config: buildTransportConfig({
                host,
                port,
                secure,
                tlsServername,
                requireTLS
            })
        });
    };

    targets.forEach(({ host, tlsServername }) => {
        addAttempt({
            host,
            tlsServername,
            port: smtpPort,
            secure: smtpSecure,
            requireTLS: false,
            label: `${host}:${smtpPort} (${smtpSecure ? 'SSL/TLS' : 'STARTTLS'})`
        });
    });

    const shouldAddGmail587Fallback =
        gmailPortFallbackEnabled &&
        isGmailHost(smtpHost) &&
        smtpPort === 465 &&
        smtpSecure === true;

    if (shouldAddGmail587Fallback) {
        targets.forEach(({ host, tlsServername }) => {
            addAttempt({
                host,
                tlsServername,
                port: 587,
                secure: false,
                requireTLS: true,
                label: `${host}:587 (STARTTLS fallback)`
            });
        });
    }

    return attempts;
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

    const attempts = await getTransportAttempts();
    let lastError = null;

    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
        const attempt = attempts[attemptIndex];

        try {
            const transporter = nodemailer.createTransport(attempt.config);
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${to}: ${subject} via ${attempt.label}`);
            return;
        } catch (error) {
            lastError = error;
            const isRetryable = isRetryableConnectionError(error);
            console.warn(
                `SMTP attempt ${attemptIndex + 1}/${attempts.length} failed for ${to} via ${attempt.label}: ${error.message}`
            );

            if (!isRetryable) {
                break;
            }
        }
    }

    if (lastError) {
        console.error(`Failed to send email to ${to}:`, lastError.message);
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
