// test/spec/endpoints.spec.js
import { store } from '../../src/core/state/index.js' // Store is needed for dispatch/getState checks
import * as actions from '../../src/core/state/actions.js' // Import actions to check dispatch payload type - Corrected path
import { EndpointsService, createEndpointsService } from '../../src/services/endpoints/endpoints-service.js' // Corrected path
import * as notifications from '../../src/ui/notifications/notifications.js' // Corrected path
import { updateEndpoint } from '../../src/core/state/actions.js' // Corrected path for actions
import { createMockStorageService } from '../mocks/storage-service.mock.js' // Mock path may need checking
import { createMockTestEndpointFn } from '../mocks/endpoints.mock.js' // Mock path may need checking

// Mock the config import used by endpoints-service
// Note: This requires Jasmine config or a preprocessor that handles JSON imports.
// If not configured, this mock might not work as expected.
// Alternatively, spy on methods like loadFromConfig within the service test.
// jest.mock('../../src/config.json', () => [
//   { url: 'http://config-endpoint/sparql', name: 'Config Endpoint', type: 'query' }
// ], { virtual: true })

// Mock storage service dependency
// const mockStorageService = { ... } // This mock is defined below

// Mock testEndpoint function dependency
// const mockTestEndpointFn = jasmine.createSpy('testEndpointFn') // This mock is defined below

describe('EndpointsService', () => {
  let endpointsService
  let dispatchSpy
  let getStateSpy
  let checkEndpointSpy
  let mockStorageService // Declare here
  let mockTestEndpointFn // Declare here

  beforeEach(() => {
    // Create mocks FRESH for each test
    mockStorageService = createMockStorageService()
    mockTestEndpointFn = createMockTestEndpointFn()

    // Reset mocks and spies for each test
    // mockStorageService._reset() // Use the helper if instance is reused
    // mockTestEndpointFn.calls.reset() // Resetting spy is handled by creating new one
    // mockTestEndpointFn.and.resolveTo(true) // Default set in factory

    // Create a fresh service instance for each test, passing mocks
    endpointsService = new EndpointsService(mockStorageService, mockTestEndpointFn)
    dispatchSpy = spyOn(store, 'dispatch')
    // No need to spy on getState multiple times if it's the same mock
    getStateSpy = spyOn(store, 'getState').and.returnValue({
      settings: { endpoints: { active: 'http://example.com/sparql' } },
      endpoints: {
        items: [{ url: 'http://example.com/sparql', status: 'active', lastChecked: 0 }],
      },
    })
    // Spy on the instance's method *after* instantiation
    checkEndpointSpy = spyOn(endpointsService, 'checkEndpoint').and.callThrough() // Use callThrough if we want the original method to run too

    // Default mock for localStorage getItem (used by loadFromStorage etc.)
    mockStorageService.getItem.withArgs(endpointsService.STORAGE_KEY).and.returnValue(null)
    mockStorageService.getItem.withArgs(endpointsService.LAST_USED_KEY).and.returnValue(null)

    // Mock loadFromConfig directly on the instance if JSON mock isn't reliable
    spyOn(endpointsService, 'loadFromConfig').and.returnValue([
      { url: 'http://config-endpoint/sparql', label: 'Config Endpoint', type: 'query', status: 'unknown' }
    ])
    spyOn(endpointsService, 'getDefaultEndpoints').and.returnValue([
      { url: 'http://default-query/sparql', label: 'Default Query', type: 'query', status: 'unknown' },
      { url: 'http://default-update/sparql', label: 'Default Update', type: 'update', status: 'unknown' }
    ])

    // Stop any intervals from previous tests
    if (endpointsService.statusCheckIntervalId) {
      clearInterval(endpointsService.statusCheckIntervalId)
      endpointsService.statusCheckIntervalId = null
    }
    // Prevent automatic interval start during tests unless specifically testing it
    spyOn(endpointsService, 'startStatusChecks').and.stub()
  })

  describe('initialize', () => {
    it('should load from config if storage is empty', async () => {
      await endpointsService.initialize()

      expect(endpointsService.loadFromConfig).toHaveBeenCalled()
      expect(mockStorageService.getItem).toHaveBeenCalledWith(endpointsService.STORAGE_KEY)
      expect(mockStorageService.getItem).toHaveBeenCalledWith(endpointsService.LAST_USED_KEY)

      expect(dispatchSpy).toHaveBeenCalledWith(actions.setEndpoints(jasmine.arrayContaining([ // Check the action creator was used
        jasmine.objectContaining({ url: 'http://config-endpoint/sparql' })
      ])))
      expect(endpointsService.startStatusChecks).toHaveBeenCalled()
    })

    it('should load from storage if available', async () => {
      const storedEndpoints = [
        { url: 'http://stored/sparql', label: 'Stored', type: 'query', status: 'active' }
      ]
      mockStorageService.getItem.withArgs(endpointsService.STORAGE_KEY).and.returnValue(storedEndpoints)

      await endpointsService.initialize()

      expect(endpointsService.loadFromConfig).toHaveBeenCalled()
      expect(mockStorageService.getItem).toHaveBeenCalledWith(endpointsService.STORAGE_KEY)

      // Should prioritize stored endpoints
      expect(dispatchSpy).toHaveBeenCalledWith(actions.setEndpoints(jasmine.arrayContaining([
        jasmine.objectContaining({ url: 'http://stored/sparql' }),
        jasmine.objectContaining({ url: 'http://config-endpoint/sparql' }) // Config merged if not duplicate
      ])))
    })

    it('should load last used endpoint first', async () => {
      const lastUsed = { url: 'http://last-used/sparql', label: 'Last Used', type: 'query', status: 'active' }
      const stored = [{ url: 'http://stored/sparql', label: 'Stored', type: 'query', status: 'inactive' }]
      mockStorageService.getItem.withArgs(endpointsService.LAST_USED_KEY).and.returnValue(lastUsed)
      mockStorageService.getItem.withArgs(endpointsService.STORAGE_KEY).and.returnValue(stored)

      await endpointsService.initialize()

      expect(dispatchSpy).toHaveBeenCalledWith(actions.setEndpoints(jasmine.arrayContaining([
        jasmine.objectContaining({ url: 'http://last-used/sparql' }),
        jasmine.objectContaining({ url: 'http://stored/sparql' }),
        jasmine.objectContaining({ url: 'http://config-endpoint/sparql' })
      ])))
    })

    it('should use default endpoints if no others found', async () => {
      endpointsService.loadFromConfig.and.returnValue([]) // Mock config returning empty
      // Storage mocks already return null by default

      await endpointsService.initialize()

      expect(endpointsService.getDefaultEndpoints).toHaveBeenCalled()
      expect(dispatchSpy).toHaveBeenCalledWith(actions.setEndpoints(jasmine.arrayContaining([
        jasmine.objectContaining({ url: 'http://default-query/sparql' })
      ])))
    })
  })

  describe('addEndpoint', () => {
    it('should dispatch addEndpoint action and save', () => {
      getStateSpy.and.returnValue({ endpoints: [] }) // Configure spy for test
      spyOn(endpointsService, 'saveToStorage').and.stub()
      spyOn(endpointsService, 'checkEndpoint').and.resolveTo({ status: 'active' })
      endpointsService.addEndpoint('http://new/sparql', 'New', 'query')
      expect(dispatchSpy).toHaveBeenCalledWith(actions.addEndpoint(jasmine.objectContaining({
        url: 'http://new/sparql'
      })))
      expect(endpointsService.saveToStorage).toHaveBeenCalled()
    })

    it('should not add if URL already exists', () => {
      getStateSpy.and.returnValue({
        endpoints: [{ url: 'http://new/sparql', label: 'Existing', type: 'query' }]
      })
      spyOn(endpointsService, 'saveToStorage')

      expect(() => {
        endpointsService.addEndpoint('http://new/sparql', 'New', 'query')
      }).toThrowError(/already exists/)
      expect(dispatchSpy).not.toHaveBeenCalledWith(jasmine.objectContaining({ type: actions.addEndpoint({}).type }))
      expect(endpointsService.saveToStorage).not.toHaveBeenCalled()
    })
  })

  describe('removeEndpoint', () => {
    beforeEach(() => {
      getStateSpy.and.returnValue({
        endpoints: [{ url: 'http://toremove/sparql' }, { url: 'http://tokeep/sparql' }]
      })
      spyOn(endpointsService, 'saveToStorage').and.stub()
    })

    it('should dispatch removeEndpoint action and save', () => {
      endpointsService.removeEndpoint('http://toremove/sparql')

      expect(dispatchSpy).toHaveBeenCalledWith(actions.removeEndpoint('http://toremove/sparql'))
      expect(endpointsService.saveToStorage).toHaveBeenCalled()
    })
  })

  describe('updateEndpoint', () => {
    const endpointUrl = 'http://example.com/sparql'
    const endpointData = { status: 'active', lastChecked: Date.now() }

    it('should dispatch updateEndpoint action', () => {
      endpointsService.updateEndpoint(endpointUrl, endpointData)
      expect(dispatchSpy).toHaveBeenCalledWith(updateEndpoint({ url: endpointUrl, ...endpointData }))
    })

    it('should call checkEndpoint if status is changed to "active"', async () => { // Make test async
      endpointsService.updateEndpoint(endpointUrl, { ...endpointData, status: 'active' })
      // Ensure potential microtasks resolve before checking spy
      await Promise.resolve()
      expect(checkEndpointSpy).toHaveBeenCalledWith(endpointUrl)
    })

    it('should not call checkEndpoint if status is not changed to "active"', async () => { // Make test async
      endpointsService.updateEndpoint(endpointUrl, { ...endpointData, status: 'inactive' })
      // Ensure potential microtasks resolve before checking spy
      await Promise.resolve()
      expect(checkEndpointSpy).not.toHaveBeenCalled()
    })
  })

  describe('checkEndpoint', () => {
    const testEndpointUrl = 'http://test-url/sparql'

    it('should dispatch checking and active status on successful test', async () => {
      mockTestEndpointFn.and.resolveTo(true) // Mock dependency to return success

      await endpointsService.checkEndpoint(testEndpointUrl)

      // Expect first call to be updateEndpoint with 'checking' status
      expect(dispatchSpy.calls.argsFor(0)[0]).toEqual(updateEndpoint({
        url: testEndpointUrl,
        updates: { status: 'checking' }
      }))

      // Expect second call to be updateEndpoint with 'active' status
      expect(dispatchSpy.calls.argsFor(1)[0]).toEqual(updateEndpoint({
        url: testEndpointUrl,
        updates: { status: 'active', lastChecked: jasmine.any(String) }
      }))
      expect(mockTestEndpointFn).toHaveBeenCalledWith(testEndpointUrl, undefined) // Check call to dependency
    })

    it('should dispatch checking and inactive status on failed test', async () => {
      mockTestEndpointFn.and.resolveTo(false) // Mock dependency to return failure

      await endpointsService.checkEndpoint(testEndpointUrl)

      // Expect first call to be updateEndpoint with 'checking' status
      expect(dispatchSpy.calls.argsFor(0)[0]).toEqual(updateEndpoint({
        url: testEndpointUrl,
        updates: { status: 'checking' }
      }))

      // Expect second call to be updateEndpoint with 'inactive' status
      expect(dispatchSpy.calls.argsFor(1)[0]).toEqual(updateEndpoint({
        url: testEndpointUrl,
        updates: { status: 'inactive', lastChecked: jasmine.any(String) }
      }))
      expect(mockTestEndpointFn).toHaveBeenCalledWith(testEndpointUrl, undefined)
    })

    it('should handle errors during endpoint test', async () => {
      const testError = new Error('Test failed')
      mockTestEndpointFn.and.rejectWith(testError) // Mock dependency to throw error

      await endpointsService.checkEndpoint(testEndpointUrl)

      // Expect first call to be updateEndpoint with 'checking' status
      expect(dispatchSpy.calls.argsFor(0)[0]).toEqual(updateEndpoint({
        url: testEndpointUrl,
        updates: { status: 'checking' }
      }))

      // Expect second call to be updateEndpoint with 'inactive' status and error
      expect(dispatchSpy.calls.argsFor(1)[0]).toEqual(updateEndpoint({
        url: testEndpointUrl,
        updates: {
          status: 'inactive',
          lastChecked: jasmine.any(String),
          lastError: testError.message // Check for the error message
        }
      }))
    })

    it('should dispatch checking and inactive status on fetch error', async () => {
      const testError = new Error('Fetch error: Failed to fetch')
      mockTestEndpointFn.and.rejectWith(testError) // Mock dependency to throw error

      await endpointsService.checkEndpoint('http://error.com/sparql')

      expect(dispatchSpy).toHaveBeenCalledTimes(2)
      // Expect first call to be updateEndpoint with 'checking' status
      expect(dispatchSpy.calls.argsFor(0)[0]).toEqual(updateEndpoint({
        url: 'http://error.com/sparql',
        updates: { status: 'checking' }
      }))
      // Expect second call to be updateEndpoint with 'inactive' status and error
      expect(dispatchSpy.calls.argsFor(1)[0]).toEqual(updateEndpoint({
        url: 'http://error.com/sparql',
        status: 'inactive', // Keep original structure if service uses this flat format here
        lastChecked: jasmine.any(String), // Use String like other tests or Number?
        lastError: 'Fetch error: Failed to fetch',
      }))
    })
  })

  // TODO: Add tests for checkEndpointsHealth, startStatusChecks, getActiveEndpoint, etc.
})
