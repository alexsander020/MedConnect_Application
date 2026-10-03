const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    ...tsJestTransformCfg,
  },
};