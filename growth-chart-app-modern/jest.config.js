/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle CSS imports (e.g., if you import CSS files in components)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': 'jest-transform-stub',
    // Handle module path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'], // Optional: for setup files
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
    '^.+\\.m?js$': 'babel-jest', // Add babel-jest for js/mjs files in node_modules if needed
  },
  transformIgnorePatterns: [
    // Allow fhirclient and jose (and its dependencies if they also use ESM) to be transformed.
    // This pattern means "ignore node_modules EXCEPT for fhirclient and jose".
    "/node_modules/(?!fhirclient|jose)/",
    "\\.pnp\\.[^\\/]+$"
  ],
};
