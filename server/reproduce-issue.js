require('dotenv').config({ path: 'server/.env' });
const nodemailer = require('nodemailer');

async function main() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 2525;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Logic from mail.service.ts
    const secure = process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : port === 465;

    console.log(`Config: Host=${host}, Port=${port}, Secure=${secure}, User=${user}`);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
        tls: {
            rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true',
        },
        family: 4, // Force IPv4
        connectionTimeout: 60000, // 60s
        logger: true,
        debug: true,
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection verified!');
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

main();
