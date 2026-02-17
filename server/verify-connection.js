const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando integridade do Schema no Banco de Dados...');

    // Query para verificar colunas específicas que foram adicionadas recentemente
    const columns = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('Tenant', 'Seller', 'Customer', 'Driver', 'Delivery') 
      AND column_name IN ('config', 'externalId', 'sellerId', 'arrivedAt', 'unloadingStartedAt', 'unloadingEndedAt', 'deliveredAt')
      ORDER BY table_name, column_name;
    `;

    console.log('\n📋 Colunas Críticas Encontradas:');
    console.table(columns);

    const expectedColumns = [
      { table: 'Tenant', column: 'config' },
      { table: 'Seller', column: 'id' }, // Se a tabela Seller existir, terá id
      { table: 'Customer', column: 'sellerId' },
      { table: 'Driver', column: 'externalId' },
      { table: 'Delivery', column: 'arrivedAt' },
      { table: 'Delivery', column: 'unloadingStartedAt' },
      { table: 'Delivery', column: 'unloadingEndedAt' },
      { table: 'Delivery', column: 'deliveredAt' },
    ];

    // Verificação simples da tabela Seller (que é nova)
    const sellerTable = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'Seller';
    `;

    if (sellerTable.length > 0) {
      console.log('✅ Tabela "Seller" existe.');
    } else {
      console.error('❌ Tabela "Seller" NÃO encontrada.');
    }

    console.log(
      '\n✅ Verificação concluída. Se as colunas acima aparecerem, o banco está atualizado.',
    );
  } catch (e) {
    console.error('❌ Erro ao verificar schema:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
