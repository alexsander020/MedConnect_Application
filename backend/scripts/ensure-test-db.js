const { Client } = require('pg');

async function ensureTestDb() {
  const adminUrl = process.env.POSTGRES_ADMIN_URL || 'postgresql://medconnect_user:medconnect_dev_password_only_for_local@localhost:5432/medconnect';
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='medconnect_test'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE medconnect_test');
      console.log('✅ Banco de dados de teste medconnect_test criado com sucesso.');
    } else {
      console.log('ℹ️ Banco de dados medconnect_test já existe.');
    }
  } catch (err) {
    console.error('Erro ao verificar/criar banco medconnect_test:', err.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  ensureTestDb();
}

module.exports = { ensureTestDb };
