process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters_long_for_testing!';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
