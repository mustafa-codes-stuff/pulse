// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDefaultPreset } = require("ts-jest");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};