/**
 * Creates a mock testEndpoint function.
 * This is typically used by EndpointsService to check endpoint connectivity.
 * By default, it returns a spy that resolves to true.
 */
export function createMockTestEndpointFn() {
    // Return a Jasmine spy that can be configured per test
    const spy = jasmine.createSpy('testEndpointFn')
    // Default behavior: resolve to true (endpoint is active)
    spy.and.resolveTo(true)
    return spy
} 