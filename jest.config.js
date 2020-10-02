module.exports = {
  "setupFiles": ["<rootDir>/tests/setupTests.js"],
  "setupFilesAfterEnv": ['./node_modules/jest-enzyme/lib/index.js'],
  "modulePathIgnorePatterns": ["legacy"],
};
