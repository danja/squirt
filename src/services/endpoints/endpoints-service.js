// src/services/endpoints/endpoints-service.js
import { ConfigError } from '../../core/errors/error-types.js';
import { eventBus, EVENTS } from '../../core/events/event-bus.js';
import { store } from '../../core/state/index.js';
import { setEndpoints, addEndpoint, removeEndpoint, updateEndpoint as updateEndpointAction } from '../../core/state/actions.js';
import { getEndpoints } from '../../core/state/selectors.js';

/**
 * Service for managing SPARQL endpoints
 */
export class EndpointsService {
  /**
   * Create an endpoints service
   * @param {StorageService} storageService - Storage service
   * @param {Object} config - Application config
   * @param {Function} testEndpointFn - Function to test endpoints
   */
  constructor(storageService, config, testEndpointFn) {
    this.storageService = storageService;
    this.config = config;
    this.testEndpointFn = testEndpointFn;
    this.STORAGE_KEY = 'endpoints';
    this.statusCheckInterval = 60000; // 1 minute
    
    // Start status checks when instance is created
    this.statusCheckIntervalId = null;
  }

  /**
   * Initialize endpoints from config and storage
   */
  async initialize() {
    try {
      console.log('Initializing endpoints service...');
      
      // First try to load endpoints from the config
      const endpointsFromConfig = this.loadFromConfig();
      
      // Then try to load from storage (which may have user customizations)
      const storedEndpoints = this.loadFromStorage();
      
      // Merge the endpoints, giving preference to stored ones
      let endpoints = endpointsFromConfig;
      
      if (storedEndpoints && storedEndpoints.length > 0) {
        // Keep existing endpoints from storage and add any new ones from config
        const storedUrls = new Set(storedEndpoints.map(e => e.url));
        const newEndpoints = endpointsFromConfig.filter(e => !storedUrls.has(e.url));
        
        endpoints = [...storedEndpoints, ...newEndpoints];
      }
      
      if (!endpoints || endpoints.length === 0) {
        console.warn('No endpoints found in config or storage, using defaults');
        endpoints = this.getDefaultEndpoints();
      }
      
      console.log(`Loaded ${endpoints.length} endpoints`);
      
      // Update state with endpoints
      store.dispatch(setEndpoints(endpoints));
      
      // Save to storage
      this.saveToStorage();
      
      // Start status checks
      this.startStatusChecks();
      
      return endpoints;
    } catch (error) {
      console.error('Error initializing endpoints:', error);
      const fallback = this.getDefaultEndpoints();
      store.dispatch(setEndpoints(fallback));
      this.startStatusChecks();
      throw new ConfigError('Failed to initialize endpoints', {
        originalError: error
      });
    }
  }

  /**
   * Load endpoints from storage
   * @returns {Array|null} Endpoints or null if not found
   */
  loadFromStorage() {
    try {
      return this.storageService.getItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error loading endpoints from storage:', error);
      return null;
    }
  }

  /**
   * Load endpoints from config
   * @returns {Array} Endpoints from config
   */
  loadFromConfig() {
    try {
      // If config exists and has endpoints property
      if (this.config && Array.isArray(this.config.endpoints)) {
        console.log('Found endpoints in config:', this.config.endpoints);
        return this.config.endpoints.map(endpoint => ({
          url: endpoint.url,
          label: endpoint.name || endpoint.label,
          type: endpoint.type,
          credentials: endpoint.credentials,
          status: 'unknown'
        }));
      }
      
      throw new ConfigError('Invalid or missing endpoints in config');
    } catch (error) {
      console.error('Error loading endpoints from config:', error);
      return [];
    }
  }

  /**
   * Get default endpoints as fallback
   * @returns {Array} Default endpoints
   */
  getDefaultEndpoints() {
    console.warn('Using default endpoints as fallback');
    return [
      { 
        url: 'http://localhost:4030/semem/query',
        label: 'Local Query Endpoint',
        type: 'query',
        status: 'unknown',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      },
      {
        url: 'http://localhost:4030/semem/update',
        label: 'Local Update Endpoint',
        type: 'update',
        status: 'unknown',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      }
    ];
  }

  /**
   * Start checking endpoint status periodically
   */
  startStatusChecks() {
    // Clear existing interval if any
    if (this.statusCheckIntervalId) {
      clearInterval(this.statusCheckIntervalId);
    }
    
    // Run status check immediately
    this.checkEndpointsHealth();
    
    // Then set up interval
    this.statusCheckIntervalId = setInterval(() => {
      this.checkEndpointsHealth();
    }, this.statusCheckInterval);
    
    // Also listen for check requests
    eventBus.on(EVENTS.ENDPOINT_CHECK_REQUESTED, () => {
      this.checkEndpointsHealth();
    });
  }

  /**
   * Save endpoints to storage
   */
  saveToStorage() {
    try {
      const endpoints = getEndpoints(store.getState());
      this.storageService.setItem(this.STORAGE_KEY, endpoints);
    } catch (error) {
      console.error('Error saving endpoints to storage:', error);
      throw error;
    }
  }

  /**
   * Add a new endpoint
   * @param {string} url - Endpoint URL
   * @param {string} label - Endpoint label
   * @param {string} type - Endpoint type ('query' or 'update')
   * @param {Object} credentials - Optional credentials
   */
  addEndpoint(url, label, type = 'query', credentials = null) {
    const endpoints = getEndpoints(store.getState());
    
    // Check if endpoint with same URL already exists
    if (endpoints.some(e => e.url === url)) {
      throw new ConfigError(`Endpoint with URL ${url} already exists`);
    }
    
    const newEndpoint = { 
      url, 
      label, 
      type, 
      credentials,
      status: 'unknown', 
      lastChecked: null 
    };
    
    // Add to state
    store.dispatch(addEndpoint(newEndpoint));
    
    // Save to storage
    this.saveToStorage();
    
    // Emit event
    eventBus.emit(EVENTS.ENDPOINT_ADDED, newEndpoint);
    
    // Check the status immediately
    this.checkEndpoint(url, credentials);
    
    return newEndpoint;
  }

  /**
   * Remove an endpoint
   * @param {string} url - Endpoint URL
   */
  removeEndpoint(url) {
    // Update state
    store.dispatch(removeEndpoint(url));
    
    // Save to storage
    this.saveToStorage();
    
    // Emit event
    eventBus.emit(EVENTS.ENDPOINT_REMOVED, { url });
  }

  /**
   * Update an endpoint
   * @param {string} url - Endpoint URL
   * @param {Object} updates - Updates to apply
   */
  updateEndpoint(url, updates) {
    // Update state
    store.dispatch(updateEndpointAction({
      url,
      updates
    }));
    
    // Save to storage
    this.saveToStorage();
    
    // Emit event
    eventBus.emit(EVENTS.ENDPOINT_UPDATED, { url, updates });
  }

  /**
   * Check a specific endpoint's status
   * @param {string} url - Endpoint URL
   * @param {Object} credentials - Optional credentials
   * @returns {Promise<boolean>} Endpoint status
   */
  async checkEndpoint(url, credentials = null) {
    const endpoints = getEndpoints(store.getState());
    const endpoint = endpoints.find(e => e.url === url);
    
    if (!endpoint) {
      throw new ConfigError(`Endpoint with URL ${url} not found`);
    }
    
    // Update status to checking
    this.updateEndpoint(url, { status: 'checking' });
    
    try {
      const status = await this.testEndpointFn(url, credentials || endpoint.credentials);
      
      // Update endpoint status
      this.updateEndpoint(url, {
        status: status ? 'active' : 'inactive',
        lastChecked: new Date().toISOString()
      });
      
      // Emit status change event
      eventBus.emit(EVENTS.ENDPOINT_STATUS_CHANGED, {
        url,
        status: status ? 'active' : 'inactive'
      });
      
      return status;
    } catch (error) {
      console.error(`Error checking endpoint ${url}:`, error);
      
      this.updateEndpoint(url, {
        status: 'inactive',
        lastChecked: new Date().toISOString(),
        lastError: error.message
      });
      
      // Emit status change event
      eventBus.emit(EVENTS.ENDPOINT_STATUS_CHANGED, {
        url,
        status: 'inactive',
        error: error.message
      });
      
      return false;
    }
  }

  /**
   * Check all endpoints health
   * @returns {Promise<Object>} Check results
   */
  async checkEndpointsHealth() {
    const endpoints = getEndpoints(store.getState());
    
    if (endpoints.length === 0) {
      console.log('No endpoints to check');
      return { 
        success: false, 
        message: 'No endpoints configured' 
      };
    }
    
    console.log(`Checking health of ${endpoints.length} endpoints...`);
    
    // Set endpoints to checking state
    endpoints.forEach(endpoint => {
      this.updateEndpoint(endpoint.url, { status: 'checking' });
    });
    
    // Use Promise.all to run all checks in parallel
    try {
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const isActive = await this.testEndpointFn(endpoint.url, endpoint.credentials);
            
            this.updateEndpoint(endpoint.url, {
              status: isActive ? 'active' : 'inactive',
              lastChecked: new Date().toISOString()
            });
            
            return {
              url: endpoint.url,
              label: endpoint.label,
              type: endpoint.type,
              isActive,
              error: null
            };
          } catch (error) {
            console.error(`Error checking endpoint ${endpoint.url}:`, error);
            
            this.updateEndpoint(endpoint.url, {
              status: 'inactive',
              lastChecked: new Date().toISOString(),
              lastError: error.message
            });
            
            return {
              url: endpoint.url,
              label: endpoint.label,
              type: endpoint.type,
              isActive: false,
              error: error.message
            };
          }
        })
      );
      
      // Dispatch an event with the results
      try {
        const anyActive = results.some(r => r.isActive);
        const queryActive = results.some(r => r.isActive && r.type === 'query');
        const updateActive = results.some(r => r.isActive && r.type === 'update');
        
        eventBus.emit(EVENTS.ENDPOINTS_STATUS_CHECKED, {
          results,
          anyActive,
          queryActive,
          updateActive
        });
      } catch (error) {
        console.error('Error dispatching endpoints status event:', error);
      }
      
      // Return summary of results
      return {
        success: true,
        anyActive: results.some(r => r.isActive),
        queryActive: results.some(r => r.isActive && r.type === 'query'),
        updateActive: results.some(r => r.isActive && r.type === 'update'),
        results
      };
    } catch (error) {
      console.error('Error checking endpoints health:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get active endpoint for a specific type
   * @param {string} type - Endpoint type
   * @returns {Object|null} Active endpoint or null if none found
   */
  getActiveEndpoint(type) {
    const endpoints = getEndpoints(store.getState());
    return endpoints.find(e => e.type === type && e.status === 'active');
  }
}

// Export a factory function to create the service with dependencies
export function createEndpointsService(storageService, config, testEndpointFn) {
  return new EndpointsService(storageService, config, testEndpointFn);
}
