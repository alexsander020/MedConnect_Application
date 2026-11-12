process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://medconnect_user:medconnect_dev_password_only_for_local@localhost:5432/medconnect_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters_long_for_testing!';
process.env.CPF_ENCRYPTION_KEY = process.env.CPF_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';

// Com --runInBand todas as suítes rodam no mesmo processo e cada uma cria seu próprio PrismaClient,
// que por padrão abre até (núcleos × 2 + 1) conexões. Com 40+ suítes isso esgota o max_connections
// do Postgres ("too many clients already"). Um pool pequeno por cliente basta para os testes,
// inclusive os de concorrência (duas transações simultâneas).
if (process.env.DATABASE_URL && !/[?&]connection_limit=/.test(process.env.DATABASE_URL)) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=3`;
}
