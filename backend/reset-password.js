const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const newPassword = '@A345678';
  const hashed = await bcrypt.hash(newPassword, 10);
  
  const updated = await p.pharmacy.update({
    where: { email: 'love@hotmail.com' },
    data: { password: hashed },
    select: { id: true, email: true, name: true }
  });
  
  console.log('✅ Senha redefinida com sucesso!');
  console.log('Farmácia:', JSON.stringify(updated, null, 2));
  console.log('\nAgora faça login com:');
  console.log('  Email:', updated.email);
  console.log('  Senha: @A345678');
}

main().finally(() => p.$disconnect());
