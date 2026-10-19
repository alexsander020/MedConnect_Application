/**
 * AVISO: Script de uso exclusivo local em ambiente de desenvolvimento.
 * NUNCA executar ou expor este utilitário em produção.
 */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');
const prisma = new PrismaClient();

function promptInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let email = process.argv[2];
  let newPassword = process.argv[3];

  if (!email) {
    email = await promptInput('Digite o e-mail da conta: ');
  }

  if (!newPassword) {
    newPassword = await promptInput('Digite a nova senha: ');
  }

  if (!email || !newPassword) {
    console.error('Uso: node reset-password.js <email> [nova_senha] (ou informe via stdin)');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  try {
    await prisma.pharmacy.update({
      where: { email: email.toLowerCase().trim() },
      data: { password: hashed },
    });
    console.log('✅ Senha da farmácia atualizada com sucesso.');
  } catch {
    try {
      await prisma.user.update({
        where: { email: email.toLowerCase().trim() },
        data: { password: hashed },
      });
      console.log('✅ Senha do usuário atualizada com sucesso.');
    } catch {
      console.error('❌ Conta não encontrada para o e-mail informado.');
      process.exit(1);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
