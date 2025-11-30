import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis de ambiente do arquivo .env na raiz do server
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testR2() {
    console.log('⚙️  Configuração R2 carregada:');
    console.log(`   Endpoint: ${process.env.AWS_ENDPOINT}`);
    console.log(`   Bucket: ${process.env.AWS_BUCKET}`);
    console.log(`   Public URL: ${process.env.AWS_PUBLIC_URL}`);
    console.log('---------------------------------------------------');

    if (!process.env.AWS_ENDPOINT || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET) {
        console.error('❌ Configuração incompleta. Verifique seu .env');
        process.exit(1);
    }

    const s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.AWS_ENDPOINT,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    const fileName = `test-upload-${Date.now()}.txt`;
    const fileContent = 'Este é um arquivo de teste do ZapRoute para verificar o Cloudflare R2.';

    try {
        console.log(`📤 Tentando enviar arquivo: ${fileName}...`);

        await s3Client.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: fileName,
                Body: fileContent,
                ContentType: 'text/plain',
            }),
        );

        console.log('✅ Upload realizado com sucesso!');

        const publicUrl = process.env.AWS_PUBLIC_URL
            ? `${process.env.AWS_PUBLIC_URL}/${fileName}`
            : `${process.env.AWS_ENDPOINT}/${process.env.AWS_BUCKET}/${fileName}`;

        console.log(`🔗 URL Pública (Teste de acesso): ${publicUrl}`);
        console.log('⚠️  Nota: Se a URL pública não abrir, verifique se seu bucket está configurado para acesso público ou se o domínio customizado está correto.');

    } catch (error: any) {
        console.error('❌ Erro ao fazer upload:');
        console.error(error.message);
    }
}

testR2();
