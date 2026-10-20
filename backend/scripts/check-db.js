/**
 * AVISO: Script de uso exclusivo local em ambiente de desenvolvimento.
 * NUNCA executar ou expor este utilitário em produção.
 */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = {
    User: await prisma.user.count(),
    Pharmacy: await prisma.pharmacy.count(),
    Prescription: await prisma.prescription.count(),
    Quote: await prisma.quote.count(),
    Order: await prisma.order.count(),
  };
  console.log('=== STATUS DO BANCO DE DADOS LOCAL (CONTAGEM) ===');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
