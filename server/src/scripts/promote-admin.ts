import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'rafael@zaproute.com.br';
    console.log(`Promoting user ${email} to SUPER_ADMIN...`);
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'SUPER_ADMIN' },
        });
        console.log(`SUCCESS: User ${user.email} is now a ${user.role}.`);
    } catch (e) {
        console.error('ERROR: Could not promote user. Make sure the user exists.');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
