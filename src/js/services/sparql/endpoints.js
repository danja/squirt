// src/js/services/sparql/endpoints.js
import { state } from '../../core/state.js';
import { testEndpoint } from './sparql.js';
import { ErrorHandler } from '../../core/errors.js';

export class EndpointManager {
    constructor() {
        this.STORAGE_KEY = 'squirt_endpoints';
        this.statusCheckInterval = 60000; // 1 minute
    }

    async initialize() {
        try {
            console.log('Initializing endpoints manager...');
            
            // First try to load endpoints from the config file
            const endpointsFromFile = this.loadFromConfig();
            
            // Then try to load from localStorage (which may have user customizations)
            const storedEndpoints = this.loadFromStorage();
            
            // Merge the endpoints, giving preference to stored ones
            let endpoints = endpointsFromFile;
            
            if (storedEndpoints && storedEndpoints.length > 0) {
                // Keep existing endpoints from storage and add any new ones from file
                const storedUrls = new Set(storedEndpoints.map(e => e.url));
                const newEndpoints = endpointsFromFile.filter(e => !storedUrls.has(e.url));
                
                endpoints = [...storedEndpoints, ...newEndpoints];
            }
            
            if (!endpoints || endpoints.length === 0) {
                console.warn('No endpoints found in config or storage, using defaults');
                endpoints = this.getDefaultEndpoints();
            }
            
            console.log(`Loaded ${endpoints.length} endpoints`);
            
            // Update state with endpoints
            state.update('endpoints', endpoints);
            
            // Start status checks
            this.startStatusChecks();
            
            return endpoints;
        } catch (error) {
            console.error('Error initializing endpoints:', error);
            ErrorHandler.handle(error);
            const fallback = this.getDefaultEndpoints();
            state.update('endpoints', fallback);
            this.startStatusChecks();
            return fallback;
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error loading endpoints from storage:', error);
            return null;
        }
    }

    // Load endpoints from imported config
    loadFromConfig() {
        try {
            // Import config dynamically
            const config = require('../../../config.json');
            
            // If config exists and is an array, return it
            if (config && Array.isArray(config)) {
                console.log('Found endpoints in config.json:', config);
                return config.map(endpoint => ({
                    url: endpoint.url,
                    label: endpoint.name,
                    type: endpoint.type,
                    credentials: endpoint.credentials,
                    status: 'unknown'
                }));
            }
            throw new Error('Invalid config format in config.json');
        } catch (error) {
            console.error('Error loading endpoints from config.json:', error);
            return [];
        }
    }

    getDefaultEndpoints() {
        console.warn('Using default endpoints as fallback');
        return [
            { 
                url: 'http://localhost:3030/semem/query',
                label: 'Local Query Endpoint',
                type: 'query',
                status: 'unknown',
                credentials: {
                    user: 'admin',
                    password: 'admin123'
                }
            },
            {
                url: 'http://localhost:3030/semem/update',
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

    async startStatusChecks() {
        const checkAll = async () => {
            const endpoints = state.get('endpoints');
            
            if (!endpoints || endpoints.length === 0) return;
            
            console.log(`Checking ${endpoints.length} endpoints...`);
            
            for (const endpoint of endpoints) {
                try {
                    const status = await testEndpoint(endpoint.url, endpoint.credentials);
                    endpoint.status = status ? 'active' : 'inactive';
                    endpoint.lastChecked = new Date().toISOString();
                    console.log(`Endpoint ${endpoint.url} status: ${endpoint.status}`);
                } catch (error) {
                    console.error(`Error checking endpoint ${endpoint.url}:`, error);
                    endpoint.status = 'inactive';
                }
            }
            
            state.update('endpoints', [...endpoints]);
            this.saveToStorage();
        };

        // Run immediately and then on interval
        await checkAll();
        setInterval(checkAll, this.statusCheckInterval);
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state.get('endpoints')));
        } catch (error) {
            console.error('Error saving endpoints to storage:', error);
        }
    }

    addEndpoint(url, label, type = 'query', credentials = null) {
        const endpoints = state.get('endpoints') || [];
        
        // Check if endpoint with same URL already exists
        if (endpoints.some(e => e.url === url)) {
            throw new Error(`Endpoint with URL ${url} already exists`);
        }
        
        endpoints.push({ 
            url, 
            label, 
            type, 
            credentials,
            status: 'unknown', 
            lastChecked: null 
        });
        
        state.update('endpoints', endpoints);
        this.saveToStorage();
        
        // Check the status immediately
        this.checkEndpoint(url, credentials).then(status => {
            this.updateEndpoint(url, { 
                status: status ? 'active' : 'inactive',
                lastChecked: new Date().toISOString()
            });
        });
    }

    async checkEndpoint(url, credentials = null) {
        return testEndpoint(url, credentials);
    }

    removeEndpoint(url) {
        const endpoints = state.get('endpoints').filter(e => e.url !== url);
        state.update('endpoints', endpoints);
        this.saveToStorage();
    }

    updateEndpoint(url, updates) {
        const endpoints = state.get('endpoints').map(e => 
            e.url === url ? { ...e, ...updates } : e
        );
        state.update('endpoints', endpoints);
        this.saveToStorage();
    }

    getActiveEndpoint(type) {
        const endpoints = state.get('endpoints') || [];
        return endpoints.find(e => e.type === type && e.status === 'active');
    }

    // Add to src/js/services/sparql/endpoints.js in the EndpointManager class

/**
 * Perform a non-blocking check of all endpoints
 * @returns {Promise<Object>} Object with check results and status
 */
async checkEndpointsHealth() {
    // Create a copy of the current endpoints to avoid mutation issues
    const endpoints = [...(state.get('endpoints') || [])];
    
    if (endpoints.length === 0) {
      console.log('No endpoints to check');
      return { success: false, message: 'No endpoints configured' };
    }
    
    console.log(`Checking health of ${endpoints.length} endpoints...`);
    
    // Set endpoints to checking state
    endpoints.forEach(endpoint => {
      endpoint.status = 'checking';
    });
    
    // Update state to show checking status in UI
    state.update('endpoints', endpoints);
    
    // Use Promise.all to run all checks in parallel
    try {
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            // Use existing testEndpoint function
            const isActive = await this.checkEndpoint(endpoint.url, endpoint.credentials);
            return {
              url: endpoint.url,
              label: endpoint.label,
              type: endpoint.type,
              isActive,
              error: null
            };
          } catch (error) {
            console.error(`Error checking endpoint ${endpoint.url}:`, error);
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
      
      // Update endpoints with results
      const updatedEndpoints = endpoints.map(endpoint => {
        const result = results.find(r => r.url === endpoint.url);
        return {
          ...endpoint,
          status: result?.isActive ? 'active' : 'inactive',
          lastChecked: new Date().toISOString(),
          lastError: result?.error || null
        };
      });
      
      // Update state with final results
      state.update('endpoints', updatedEndpoints);
      
      // Dispatch an event with the results for any listeners
      try {
        const anyActive = results.some(r => r.isActive);
        const queryActive = results.some(r => r.isActive && r.type === 'query');
        const updateActive = results.some(r => r.isActive && r.type === 'update');
        
        const event = new CustomEvent('endpointsStatusChecked', {
          detail: {
            results,
            anyActive,
            queryActive,
            updateActive
          }
        });
        
        document.dispatchEvent(event);
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

  // Add to src/js/services/sparql/endpoints.js in the EndpointManager class

/**
 * Perform a non-blocking check of all endpoints
 * @returns {Promise<Object>} Object with check results and status
 */
async checkEndpointsHealth() {
    // Create a copy of the current endpoints to avoid mutation issues
    const endpoints = [...(state.get('endpoints') || [])];
    
    if (endpoints.length === 0) {
      console.log('No endpoints to check');
      return { success: false, message: 'No endpoints configured' };
    }
    
    console.log(`Checking health of ${endpoints.length} endpoints...`);
    
    // Set endpoints to checking state
    endpoints.forEach(endpoint => {
      endpoint.status = 'checking';
    });
    
    // Update state to show checking status in UI
    state.update('endpoints', endpoints);
    
    // Use Promise.all to run all checks in parallel
    try {
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            // Use existing testEndpoint function
            const isActive = await this.checkEndpoint(endpoint.url, endpoint.credentials);
            return {
              url: endpoint.url,
              label: endpoint.label,
              type: endpoint.type,
              isActive,
              error: null
            };
          } catch (error) {
            console.error(`Error checking endpoint ${endpoint.url}:`, error);
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
      
      // Update endpoints with results
      const updatedEndpoints = endpoints.map(endpoint => {
        const result = results.find(r => r.url === endpoint.url);
        return {
          ...endpoint,
          status: result?.isActive ? 'active' : 'inactive',
          lastChecked: new Date().toISOString(),
          lastError: result?.error || null
        };
      });
      
      // Update state with final results
      state.update('endpoints', updatedEndpoints);
      
      // Dispatch an event with the results for any listeners
      try {
        const anyActive = results.some(r => r.isActive);
        const queryActive = results.some(r => r.isActive && r.type === 'query');
        const updateActive = results.some(r => r.isActive && r.type === 'update');
        
        const event = new CustomEvent('endpointsStatusChecked', {
          detail: {
            results,
            anyActive,
            queryActive,
            updateActive
          }
        });
        
        document.dispatchEvent(event);
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
}

// Create and export a singleton instance
export const endpointManager = new EndpointManager();