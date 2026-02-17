import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Seed para MVP (Produção)...');

  // 1. Criar/Atualizar o Tenant (A Empresa)
  const tenantName = 'Logística Rápida MVP';
  const tenantCnpj = '12.345.678/0001-90';

  const tenant = await prisma.tenant.upsert({
    where: { cnpj: tenantCnpj },
    update: {},
    create: {
      name: tenantName,
      cnpj: tenantCnpj,
      // plan: 'ENTERPRISE', // Removido pois não existe no schema
    },
  });
  console.log(`🏢 Empresa configurada: ${tenant.name}`);

  // 2. Criar Usuário Admin
  const adminEmail = 'admin@zaproute.com.br';
  const adminPass = 'senha123';
  const hashedPassword = await bcrypt.hash(adminPass, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Gestor MVP',
      role: 'ADMIN',
      tenant: { connect: { id: tenant.id } },
    },
  });
  console.log(`👤 Admin criado: ${adminEmail} (Senha: ${adminPass})`);

  // 3. Criar Veículos (Exemplos Reais)
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

  // 4. Criar Motoristas
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
    await prisma.driver.upsert({
      where: { id: `d-${d.cnh}` },
      update: {},
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
  }
  console.log(`Drivers ${driversData.length} Motoristas cadastrados.`);

  // 5. Criar Clientes (Base para Rotas)
  const customersData = [
    { name: 'Mercado Central', address: 'Av. Paulista, 1000, SP' },
    { name: 'Padaria do Zé', address: 'Rua Augusta, 500, SP' },
    { name: 'Farmácia Saúde', address: 'Rua da Consolação, 1200, SP' },
    { name: 'Restaurante Sabor', address: 'Alameda Santos, 800, SP' },
    { name: 'Loja de Peças', address: 'Av. 23 de Maio, 2000, SP' },
  ];

  for (const [i, c] of customersData.entries()) {
    await prisma.customer.upsert({
      where: { id: `cust-mvp-${i}` },
      update: {},
      create: {
        id: `cust-mvp-${i}`,
        legalName: `${c.name} Ltda`,
        tradeName: c.name,
        cnpj: `00.000.000/000${i}-00`,
        email: `contato@cliente${i}.com`,
        phone: '1133334444',
        status: 'ACTIVE',
        location: {
          lat: -23.5505 + i * 0.001,
          lng: -46.6333 + i * 0.001,
          address: c.address,
        },
        addressDetails: {
          street: c.address,
          number: 'S/N',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
        },
        tenant: { connect: { id: tenant.id } },
        updatedAt: new Date(),
      },
    });
  }
  console.log(`🏢 ${customersData.length} Clientes cadastrados.`);
  console.log('✅ Seed MVP concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
