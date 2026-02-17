import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const email = 'joao@motorista.com';

  console.log(`Checking data for: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }
  console.log(`✅ User found: ${user.id} (Role: ${user.role})`);

  const driver = await prisma.driver.findFirst({
    where: { email: email },
  });

  if (!driver) {
    console.log('❌ Driver profile not found for this email');
    return;
  }
  console.log(`✅ Driver found: ${driver.id}`);

  const deliveries = await prisma.delivery.findMany({
    where: { driverId: driver.id },
  });

  console.log(`📦 Deliveries found for driver: ${deliveries.length}`);
  deliveries.forEach((d) => {
    console.log(` - ${d.id}: ${d.status} (Date: ${d.date})`);
  });
}

check()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
