const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const newPassword = '@A2345678';
  const hashed = await bcrypt.hash(newPassword, 10);
  await p.pharmacy.update({
    where: { email: 'love@hotmail.com' },
    data: { password: hashed },
  });
  console.log('✅ Senha atualizada para: @A2345678');
}

main().finally(() => p.$disconnect());
