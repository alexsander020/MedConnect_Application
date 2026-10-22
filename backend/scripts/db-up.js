/**
 * Script para inicialização do serviço PostgreSQL para desenvolvimento local.
 * Tenta executar o Docker Compose ('docker compose up -d postgres').
 * Caso o Docker não esteja instalado ou disponível no ambiente, inicia uma instância
 * nativa do PostgreSQL via 'embedded-postgres' na porta 5432 com as mesmas credenciais.
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PORT = process.env.POSTGRES_PORT || 5432;
const DB_USER = process.env.POSTGRES_USER || 'medconnect_user';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'medconnect_dev_password_only_for_local';
const DB_NAME = process.env.POSTGRES_DB || 'medconnect';

async function main() {
  console.log('🔄 Inicializando serviço PostgreSQL...');

  // 1. Tentar Docker Compose
  try {
    const hasDocker = execSync('docker --version', { stdio: 'ignore' });
    console.log('🐳 Docker detectado. Executando "docker compose up -d postgres"...');
    execSync('docker compose up -d postgres', { stdio: 'inherit' });
    console.log('✅ PostgreSQL iniciado com sucesso via Docker Compose.');
    return;
  } catch (err) {
    console.log('ℹ️  Docker não disponível ou desligado. Inicializando PostgreSQL local embutido...');
  }

  // 2. Fallback para embedded-postgres
  try {
    const EmbeddedPostgres = require('embedded-postgres').default;
    const pgDataDir = path.resolve(__dirname, '../.pgdata-dev');
    const isInitialized = fs.existsSync(pgDataDir);

    const pg = new EmbeddedPostgres({
      port: Number(DB_PORT),
      databaseDir: pgDataDir,
      user: DB_USER,
      password: DB_PASSWORD,
      persistent: true
    });

    if (!isInitialized) {
      console.log('📦 Inicializando cluster PostgreSQL local...');
      await pg.initialise();
    }

    console.log(`🚀 Iniciando PostgreSQL na porta ${DB_PORT}...`);
    await pg.start();

    try {
      await pg.createDatabase(DB_NAME);
      console.log(`📁 Banco de dados '${DB_NAME}' criado/verificado.`);
    } catch (e) {
      // Banco já pode existir
    }

    console.log(`✅ PostgreSQL local ativo em postgresql://${DB_USER}:****@localhost:${DB_PORT}/${DB_NAME}`);
    console.log('Pressione Ctrl+C para encerrar o serviço.');

    // Manter o processo vivo
    process.on('SIGINT', async () => {
      console.log('\n🛑 Encerrando PostgreSQL local...');
      await pg.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await pg.stop();
      process.exit(0);
    });

    // Loop de espera
    setInterval(() => {}, 1000);
  } catch (err) {
    console.error('❌ Erro ao iniciar PostgreSQL local:', err);
    process.exit(1);
  }
}

main();
