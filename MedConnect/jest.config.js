// Pacotes publicados só como ESM precisam passar pelo Babel no Jest
const ESM_PACKAGES = [
  'motion',
  'framer-motion',
  'motion-dom',
  'motion-utils',
  '@animate-ui',
  'cn',
  'radix-ui',
  '@radix-ui',
  'lucide-react',
].join('|');

export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEnv.js'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules', '<rootDir>/../node_modules'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': '<rootDir>/test/styleMock.js',
  },
  transform: {
    '^.+\\.[mc]?[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [`/node_modules/(?!(${ESM_PACKAGES})/)`],
};
