const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const email = process.argv[2] || process.env.RESET_EMAIL;
  const newPassword = process.argv[3] || process.env.RESET_PASSWORD;

  if (!email || !newPassword) {
    console.log('Uso: node reset-password.js <email> <nova_senha>');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  try {
    await p.pharmacy.update({
      where: { email },
      data: { password: hashed },
    });
    console.log(`✅ Senha da farmácia (${email}) atualizada com sucesso!`);
  } catch {
    await p.user.update({
      where: { email },
      data: { password: hashed },
    });
    console.log(`✅ Senha do usuário (${email}) atualizada com sucesso!`);
  }
}

main().catch(console.error).finally(() => p.$disconnect());
