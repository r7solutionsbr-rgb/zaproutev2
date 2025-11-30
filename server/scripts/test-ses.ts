import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis de ambiente do arquivo .env na raiz do server
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testEmail() {
    const toEmail = process.argv[2];

    if (!toEmail) {
        console.error('❌ Por favor, forneça um e-mail de destino.');
        console.error('Uso: npx ts-node scripts/test-ses.ts seu-email@exemplo.com');
        process.exit(1);
    }

    console.log('⚙️  Configuração carregada:');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER ? '******' : 'NÃO DEFINIDO'}`);
    console.log(`   From: ${process.env.EMAIL_FROM}`);
    console.log('---------------------------------------------------');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log(`📨 Tentando enviar e-mail para: ${toEmail}...`);

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Teste ZapRoute" <noreply@zaproute.com>',
            to: toEmail,
            subject: 'Teste de Configuração AWS SES 🚀',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #2563eb;">Funcionou! 🎉</h2>
                    <p>Se você recebeu este e-mail, sua configuração do Amazon SES está correta.</p>
                    <p><strong>Data:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `,
        });

        console.log('✅ E-mail enviado com sucesso!');
        console.log(`🆔 Message ID: ${info.messageId}`);
    } catch (error: any) {
        console.error('❌ Erro ao enviar e-mail:');
        console.error(error.message);
        if (error.code === 'EAUTH') {
            console.error('💡 Dica: Verifique se o Usuário e Senha SMTP estão corretos (não são as credenciais do console AWS).');
        }
        if (error.response && error.response.includes('Email address is not verified')) {
            console.error('💡 Dica: Se você está no modo Sandbox, precisa verificar tanto o remetente quanto o destinatário no console do SES.');
        }
    }
}

testEmail();
