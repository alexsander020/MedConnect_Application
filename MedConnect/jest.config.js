export default {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules', '<rootDir>/../node_modules'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
