const dns = require('dns').promises;
const net = require('net');
const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const parsedSmtpPort = Number(process.env.SMTP_PORT || 465);
const smtpPort = Number.isNaN(parsedSmtpPort) ? 465 : parsedSmtpPort;
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
const parsedSocketConnectTimeoutMs = Number(process.env.SMTP_SOCKET_CONNECT_TIMEOUT_MS || 10000);
const socketConnectTimeoutMs =
    Number.isNaN(parsedSocketConnectTimeoutMs) || parsedSocketConnectTimeoutMs < 1000
        ? 10000
        : Math.floor(parsedSocketConnectTimeoutMs);

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

async function resolveSocketHost() {
    const forceIpv4 = parseBoolean(process.env.SMTP_FORCE_IPV4, false);

    if (!forceIpv4 || net.isIP(smtpHost)) {
        return smtpHost;
    }

    try {
        const record = await dns.lookup(smtpHost, { family: 4 });
        if (record && record.address) {
            return record.address;
        }
    } catch (error) {
        console.warn(`SMTP IPv4 lookup failed for ${smtpHost}: ${error.message}. Falling back to hostname.`);
    }

    return smtpHost;
}

function createSocketConnector({ connectHost, connectPort }) {
    return (_options, callback) => {
        let settled = false;

        const done = (err, data) => {
            if (settled) {
                return;
            }
            settled = true;
            callback(err, data);
        };

        const socket = net.connect({
            host: connectHost,
            port: connectPort
        });

        socket.setTimeout(socketConnectTimeoutMs);

        socket.once('connect', () => {
            socket.setTimeout(0);
            done(null, { connection: socket });
        });

        socket.once('timeout', () => {
            const timeoutError = new Error('Connection timeout');
            timeoutError.code = 'ETIMEDOUT';
            socket.destroy();
            done(timeoutError);
        });

        socket.once('error', (error) => {
            done(error);
        });
    };
}

function buildTransportConfig({ connectHost, connectPort, secure, requireTLS }) {
    const tlsServername = process.env.SMTP_TLS_SERVERNAME || (net.isIP(smtpHost) ? undefined : smtpHost);

    const transporterConfig = {
        host: smtpHost,
        port: connectPort,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: socketConnectTimeoutMs,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        getSocket: createSocketConnector({ connectHost, connectPort })
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
    const connectHost = await resolveSocketHost();
    const attempts = [];
    const baseLabelHost = connectHost === smtpHost ? smtpHost : `${smtpHost} (${connectHost})`;
    const gmailPortFallbackEnabled = parseBoolean(
        process.env.SMTP_ENABLE_GMAIL_PORT_FALLBACK,
        isGmailHost(smtpHost)
    );

    attempts.push({
        label: `${baseLabelHost}:${smtpPort} (${smtpSecure ? 'SSL/TLS' : 'STARTTLS'})`,
        config: buildTransportConfig({
            connectHost,
            connectPort: smtpPort,
            secure: smtpSecure,
            requireTLS: false
        })
    });

    const shouldAddGmail587Fallback =
        gmailPortFallbackEnabled &&
        isGmailHost(smtpHost) &&
        smtpPort === 465 &&
        smtpSecure === true;

    if (shouldAddGmail587Fallback) {
        attempts.push({
            label: `${baseLabelHost}:587 (STARTTLS fallback)`,
            config: buildTransportConfig({
                connectHost,
                connectPort: 587,
                secure: false,
                requireTLS: true
            })
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
