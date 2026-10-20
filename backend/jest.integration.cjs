module.exports = { preset: 'ts-jest', testEnvironment: 'node', testMatch: ['**/tests/integration/**/*.test.ts'], setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'], testTimeout: 30000 };
