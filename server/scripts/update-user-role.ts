import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'rafael@zaproute.com.br';
    const newRole = 'ADMIN';

    console.log(`Looking for user with email: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    console.log(`Found user: ${user.name} (Current Role: ${user.role})`);

    if (user.role === newRole) {
        console.log(`User is already ${newRole}. No changes needed.`);
        return;
    }

    const updatedUser = await prisma.user.update({
        where: { email },
        data: { role: newRole },
    });

    console.log(`✅ User updated successfully!`);
    console.log(`Name: ${updatedUser.name}`);
    console.log(`New Role: ${updatedUser.role}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
