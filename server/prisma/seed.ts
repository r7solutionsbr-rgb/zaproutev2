import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Seed para MVP (Mobile Test Mode)...');

  // 0. Limpar Banco de Dados (Ordem inversa das dependências)
  console.log('🧹 Limpando banco de dados...');
  await prisma.occurrence.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.route.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('✨ Banco limpo!');

  // 1. Criar/Atualizar o Tenant (A Empresa)
  const tenantName = 'Logística Rápida MVP';
  const tenantCnpj = '00.000.000/0001-91';

  const tenant = await prisma.tenant.upsert({
    where: { cnpj: tenantCnpj },
    update: {},
    create: {
      name: tenantName,
      cnpj: tenantCnpj,
    },
  });
  console.log(`🏢 Empresa configurada: ${tenant.name}`);

  // 2. Criar Usuário Admin
  const adminEmail = 'admin@zaproute.com.br';
  const commonPass = '123456';
  const hashedPassword = await bcrypt.hash(commonPass, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Gestor MVP',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log(`👤 Admin criado: ${adminEmail}`);

  // 3. Criar Veículos
  const vehiclesData = [
    {
      plate: 'MVP-0001',
      model: 'Fiorino',
      brand: 'Fiat',
      year: 2022,
      capKg: 650,
      capVol: 3.3,
    },
    {
      plate: 'MVP-0002',
      model: 'VUC HR',
      brand: 'Hyundai',
      year: 2021,
      capKg: 1800,
      capVol: 10.5,
    },
    {
      plate: 'MVP-0003',
      model: 'Sprinter',
      brand: 'Mercedes',
      year: 2023,
      capKg: 1200,
      capVol: 12.0,
    },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { id: `v-${v.plate}` },
      update: {},
      create: {
        id: `v-${v.plate}`,
        plate: v.plate,
        model: v.model,
        brand: v.brand,
        year: v.year,
        capacityWeight: v.capKg,
        capacityVolume: v.capVol,
        fuelType: 'DIESEL',
        status: 'AVAILABLE',
        lastMaintenance: new Date(),
        nextMaintenance: new Date(
          new Date().setMonth(new Date().getMonth() + 6),
        ),
        tenant: { connect: { id: tenant.id } },
        updatedAt: new Date(),
      },
    });
  }
  console.log(`🚚 ${vehiclesData.length} Veículos cadastrados.`);

  // 4. Criar Motoristas e seus Usuários para Login
  const driversData = [
    {
      name: 'João Silva',
      email: 'joao@motorista.com',
      phone: '11999990001',
      cnh: '11111111111',
    },
    {
      name: 'Maria Oliveira',
      email: 'maria@motorista.com',
      phone: '11999990002',
      cnh: '22222222222',
    },
  ];

  for (const d of driversData) {
    // 4.1 Criar Driver Profile
    await prisma.driver.upsert({
      where: { id: `d-${d.cnh}` },
      update: { email: d.email },
      create: {
        id: `d-${d.cnh}`,
        name: d.name,
        email: d.email,
        phone: d.phone,
        cnh: d.cnh,
        cpf: d.cnh,
        cnhCategory: 'B',
        cnhExpiration: new Date(2028, 1, 1),
        status: 'IDLE',
        tenant: { connect: { id: tenant.id } },
        avatarUrl: `https://ui-avatars.com/api/?name=${d.name}&background=random`,
        updatedAt: new Date(),
      },
    });

    // 4.2 Criar User Login (Para o App Mobile)
    await prisma.user.upsert({
      where: { email: d.email },
      update: { password: hashedPassword },
      create: {
        email: d.email,
        password: hashedPassword,
        name: d.name,
        role: 'DRIVER',
        tenantId: tenant.id,
      },
    });
  }
  console.log(
    `Drivers e Users criados para ${driversData.length} motoristas. Senha padrão: ${commonPass}`,
  );

  // 5. Criar Clientes (Base Ampliada para Mapa)
  // Gerar lat/lng ao redor do centro de Belém, PA (-1.4558, -48.4902)
  const customersData = [];
  const baseLat = -1.4558;
  const baseLng = -48.4902;

  for (let i = 0; i < 20; i++) {
    // Espalhar num raio de ~3km
    const latOffset = (Math.random() - 0.5) * 0.03;
    const lngOffset = (Math.random() - 0.5) * 0.03;

    customersData.push({
      id: `cust-mvp-${i}`,
      name: `Cliente Belém ${i + 1}`,
      address: `Av. Almirante Barroso, ${100 + i * 50} - Marco, Belém - PA`, // Endereço completo para evitar ambiguidade
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
    });
  }

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: { location: { lat: c.lat, lng: c.lng, address: c.address } },
      create: {
        id: c.id,
        legalName: `${c.name} Ltda`,
        tradeName: c.name,
        cnpj: `00.000.000/00${c.id.split('-').pop()}-00`, // Pseudo unique
        email: `contato@cliente${c.id}.com`,
        phone: '91988887777', // DDD 91 (Belém)
        status: 'ACTIVE',
        location: { lat: c.lat, lng: c.lng, address: c.address },
        addressDetails: {
          street: c.address,
          number: 'S/N',
          neighborhood: 'Marco',
          city: 'Belém',
          state: 'PA',
          zipCode: '66000-000',
        },
        tenant: { connect: { id: tenant.id } },
        updatedAt: new Date(),
      },
    });
  }
  console.log(
    `🏢 ${customersData.length} Clientes cadastrados com geolocalização.`,
  );

  // 6. Criar Rota de Teste para Hoje
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const driverId = 'd-11111111111'; // João Silva
  const vehicleId = 'v-MVP-0001';

  const routeId = `route-test-${today}`;

  await prisma.route.upsert({
    where: { id: routeId },
    update: {},
    create: {
      id: routeId,
      name: 'Rota Beta - Mobile Test',
      date: new Date(),
      status: 'IN_PROGRESS',
      tenant: { connect: { id: tenant.id } },
      driver: { connect: { id: driverId } },
      vehicle: { connect: { id: vehicleId } },
      updatedAt: new Date(),
    },
  });

  console.log(`🛣️ Rota criada: ${routeId}`);

  // 7. Criar Entregas para a Rota
  // Vamos criar 12 entregas com status variados
  const statuses = [
    'COMPLETED',
    'COMPLETED',
    'IN_PROGRESS',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
  ];

  for (let i = 0; i < statuses.length; i++) {
    const customer = customersData[i];
    const status = statuses[i];
    const deliveryId = `del-test-${today}-${i}`;

    await prisma.delivery.upsert({
      where: { id: deliveryId },
      update: { status, deliveryLat: customer.lat, deliveryLng: customer.lng }, // Garantir update se rodar de novo
      create: {
        id: deliveryId,
        orderId: `ORD-${1000 + i}`,
        date: today,
        product: `Produto Teste ${i}`,
        volume: 10 + i,
        status: status,
        priority: i % 5 === 0 ? 'HIGH' : 'NORMAL', // Alguns prioritários
        deliveryLat: customer.lat,
        deliveryLng: customer.lng,
        deliveryAddress: customer.address,
        customer: { connect: { id: customer.id } },
        route: { connect: { id: routeId } },
        driver: { connect: { id: driverId } }, // Redundante mas bom p/ queries diretas
        createdAt: new Date(),
        updatedAt: new Date(),
        // Se completed, adicionar data de baixa (simulada nos logs ou updated at)
      },
    });
  }

  console.log(`📦 ${statuses.length} Entregas criadas na rota de hoje.`);
  console.log('✅ Seed MVP Completo! Pronto para testes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
