// test/spec/endpoints.spec.js
import { EndpointManager } from '../../src/js/services/sparql/endpoints.js';
import { state } from '../../src/js/core/state.js';
import { testEndpoint } from '../../src/js/services/sparql/sparql.js';

// Mock dependencies
jest.mock('../../src/js/services/sparql/sparql.js', () => ({
  testEndpoint: jest.fn()
}));

jest.mock('../../src/js/core/state.js', () => ({
  state: {
    update: jest.fn(),
    get: jest.fn()
  }
}));

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

describe('EndpointManager', () => {
  let endpointManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    endpointManager = new EndpointManager();
    
    // Mock config.json import
    jest.mock('../../../config.json', () => [
      {
        name: 'Test Endpoint',
        type: 'query',
        url: 'http://test-endpoint:3030/sparql'
      }
    ], { virtual: true });
  });
  
  describe('initialize', () => {
    it('should load endpoints from config and storage', async () => {
      // Setup
      const storedEndpoints = [
        {
          url: 'http://stored-endpoint:3030/sparql',
          label: 'Stored Endpoint',
          type: 'query',
          status: 'unknown'
        }
      ];
      
      localStorage.getItem.mockReturnValue(JSON.stringify(storedEndpoints));
      state.update.mockClear();
      
      // Act
      const result = await endpointManager.initialize();
      
      // Assert
      expect(localStorage.getItem).toHaveBeenCalledWith(endpointManager.STORAGE_KEY);
      expect(state.update).toHaveBeenCalledWith('endpoints', expect.any(Array));
      expect(result.length).toBeGreaterThan(0);
      
      // Should contain the stored endpoint
      const hasStoredEndpoint = result.some(e => e.url === 'http://stored-endpoint:3030/sparql');
      expect(hasStoredEndpoint).toBe(true);
    });
    
    it('should use default endpoints if none are found', async () => {
      // Setup
      localStorage.getItem.mockReturnValue(null);
      jest.spyOn(endpointManager, 'loadFromConfig').mockReturnValue([]);
      
      // Act
      const result = await endpointManager.initialize();
      
      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(state.update).toHaveBeenCalledWith('endpoints', expect.any(Array));
    });
  });
  
  describe('addEndpoint', () => {
    it('should add a new endpoint and check its status', async () => {
      // Setup
      state.get.mockReturnValue([]);
      testEndpoint.mockResolvedValue(true);
      jest.spyOn(endpointManager, 'saveToStorage').mockImplementation(() => {});
      
      // Act
      endpointManager.addEndpoint(
        'http://new-endpoint:3030/sparql',
        'New Endpoint',
        'query'
      );
      
      // Assert
      expect(state.update).toHaveBeenCalledWith('endpoints', [
        expect.objectContaining({
          url: 'http://new-endpoint:3030/sparql',
          label: 'New Endpoint',
          type: 'query'
        })
      ]);
      expect(endpointManager.saveToStorage).toHaveBeenCalled();
      
      // Should trigger endpoint check
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(testEndpoint).toHaveBeenCalledWith(
        'http://new-endpoint:3030/sparql',
        null
      );
    });
    
    it('should throw error if endpoint with same URL already exists', () => {
      // Setup
      state.get.mockReturnValue([
        {
          url: 'http://existing-endpoint:3030/sparql',
          label: 'Existing Endpoint',
          type: 'query'
        }
      ]);
      
      // Act & Assert
      expect(() => {
        endpointManager.addEndpoint(
          'http://existing-endpoint:3030/sparql',
          'New Label',
          'query'
        );
      }).toThrow();
    });
  });
  
  describe('removeEndpoint', () => {
    it('should remove an endpoint by URL', () => {
      // Setup
      const endpoints = [
        {
          url: 'http://endpoint1:3030/sparql',
          label: 'Endpoint 1',
          type: 'query'
        },
        {
          url: 'http://endpoint2:3030/sparql',
          label: 'Endpoint 2',
          type: 'update'
        }
      ];
      
      state.get.mockReturnValue(endpoints);
      jest.spyOn(endpointManager, 'saveToStorage').mockImplementation(() => {});
      
      // Act
      endpointManager.removeEndpoint('http://endpoint1:3030/sparql');
      
      // Assert
      expect(state.update).toHaveBeenCalledWith(
        'endpoints',
        expect.arrayContaining([
          expect.objectContaining({
            url: 'http://endpoint2:3030/sparql'
          })
        ])
      );
      expect(state.update.mock.calls[0][1].length).toBe(1);
      expect(endpointManager.saveToStorage).toHaveBeenCalled();
    });
  });
  
  describe('updateEndpoint', () => {
    it('should update an existing endpoint', () => {
      // Setup
      const endpoints = [
        {
          url: 'http://endpoint1:3030/sparql',
          label: 'Endpoint 1',
          type: 'query',
          status: 'unknown'
        }
      ];
      
      state.get.mockReturnValue(endpoints);
      jest.spyOn(endpointManager, 'saveToStorage').mockImplementation(() => {});
      
      // Act
      endpointManager.updateEndpoint('http://endpoint1:3030/sparql', {
        label: 'Updated Label',
        status: 'active'
      });
      
      // Assert
      expect(state.update).toHaveBeenCalledWith(
        'endpoints',
        [
          expect.objectContaining({
            url: 'http://endpoint1:3030/sparql',
            label: 'Updated Label',
            type: 'query',
            status: 'active'
          })
        ]
      );
      expect(endpointManager.saveToStorage).toHaveBeenCalled();
    });
  });
  
  describe('getActiveEndpoint', () => {
    it('should return active endpoint of specified type', () => {
      // Setup
      const endpoints = [
        {
          url: 'http://query-endpoint:3030/sparql',
          label: 'Query Endpoint',
          type: 'query',
          status: 'active'
        },
        {
          url: 'http://update-endpoint:3030/sparql',
          label: 'Update Endpoint',
          type: 'update',
          status: 'active'
        },
        {
          url: 'http://inactive-endpoint:3030/sparql',
          label: 'Inactive Endpoint',
          type: 'query',
          status: 'inactive'
        }
      ];
      
      state.get.mockReturnValue(endpoints);
      
      // Act
      const result = endpointManager.getActiveEndpoint('update');
      
      // Assert
      expect(result).toEqual(expect.objectContaining({
        url: 'http://update-endpoint:3030/sparql',
        type: 'update',
        status: 'active'
      }));
    });
    
    it('should return undefined if no active endpoint of the specified type exists', () => {
      // Setup
      const endpoints = [
        {
          url: 'http://query-endpoint:3030/sparql',
          label: 'Query Endpoint',
          type: 'query',
          status: 'inactive'
        }
      ];
      
      state.get.mockReturnValue(endpoints);
      
      // Act
      const result = endpointManager.getActiveEndpoint('query');
      
      // Assert
      expect(result).toBeUndefined();
    });
  });
});
