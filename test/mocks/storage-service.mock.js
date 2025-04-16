/**
 * Creates a mock storage service with an in-memory store.
 * Mimics the interface of StorageService (getItem, setItem, removeItem, clear).
 */
export function createMockStorageService() {
    const store = new Map()

    return {
        getItem: jasmine.createSpy('storageService.getItem').and.callFake((key) => {
            const value = store.get(key)
            // Simulate JSON parsing/stringifying if the real service does
            return value ? JSON.parse(value) : null
        }),
        setItem: jasmine.createSpy('storageService.setItem').and.callFake((key, value) => {
            // Simulate JSON parsing/stringifying
            store.set(key, JSON.stringify(value))
        }),
        removeItem: jasmine.createSpy('storageService.removeItem').and.callFake((key) => {
            store.delete(key)
        }),
        clear: jasmine.createSpy('storageService.clear').and.callFake(() => {
            store.clear()
        }),
        // Helper to reset spies and clear the store for test isolation
        _reset: () => {
            store.clear()
            // Reset spies associated with this instance if needed
            // Note: The spies are created fresh each time createMockStorageService is called,
            // so resetting them might be redundant depending on test setup.
            // If the instance is reused across tests, uncommenting might be useful.
            // this.getItem.calls.reset();
            // this.setItem.calls.reset();
            // this.removeItem.calls.reset();
            // this.clear.calls.reset();
        },
        _getStore: () => store // Helper for inspecting the store in tests
    }
} 