import { execSync } from 'child_process';
const { ensureTestDb } = require('../scripts/ensure-test-db');

export default async function globalSetup(): Promise<void> {
  // Garante que o banco de teste existe
  await ensureTestDb();

  // Aplica migrações pendentes no banco de teste
  const testDbUrl = process.env.DATABASE_URL || 'postgresql://medconnect_user:medconnect_dev_password_only_for_local@localhost:5432/medconnect_test?schema=public';
  try {
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl
      },
      stdio: 'ignore'
    });
  } catch (err) {
    console.error('Aviso ao aplicar migrations no globalSetup de testes:', err);
  }
}
