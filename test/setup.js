// Setup file for Jest tests
global.fetch = jest.fn();

// Mock the window object for browser-like environment
Object.defineProperty(window, 'location', {
  value: {
    hash: ''
  },
  writable: true
});

// Silence console errors during tests
console.error = jest.fn();
console.warn = jest.fn();