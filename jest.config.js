/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json'],
  transformIgnorePatterns: ['/node_modules/(?!(@rdfjs|rdf-ext)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: ['**/test/spec/**/*.spec.js'],
  setupFiles: ['./test/setup.js']
};