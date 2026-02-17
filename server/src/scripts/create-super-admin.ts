import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@zaproute.com.br';
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Upserting Super Admin: ${email}...`);

  try {
    // 1. Find or Create a Tenant for the Admin
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Creating "System Admin" tenant...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'System Admin',
          cnpj: '00.000.000/0001-00',
          status: 'ACTIVE',
        },
      });
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Upsert User
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        tenant: { connect: { id: tenant.id } },
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        tenant: { connect: { id: tenant.id } },
      },
    });

    console.log(
      `SUCCESS: User ${user.email} is now SUPER_ADMIN with ID: ${user.id}`,
    );
  } catch (e) {
    console.error('ERROR: Could not upsert super admin.');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
