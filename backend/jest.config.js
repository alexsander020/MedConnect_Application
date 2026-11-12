const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  setupFiles: ["<rootDir>/tests/setup.ts"],
  transform: {
    ...tsJestTransformCfg,
  },
  collectCoverageFrom: [
    "src/controllers/**/*.ts",
    "src/services/**/*.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
    },
  },
};
