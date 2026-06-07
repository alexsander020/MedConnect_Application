const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const pharmacies = await p.pharmacy.findMany({
    select: { id: true, email: true, cnpj: true, name: true }
  });
  console.log('=== PHARMACIES ===');
  console.log(JSON.stringify(pharmacies, null, 2));
}

main().finally(() => p.$disconnect());
