// src/services/sparql/sparql-service.js
import { SparqlError, NetworkError } from '../../core/errors/error-types.js';
import { eventBus, EVENTS } from '../../core/events/event-bus.js';

/**
 * Service for SPARQL interactions
 */
export class SparqlService {
  /**
   * Create a SPARQL service
   * @param {Function} getEndpointFn - Function that returns the current endpoint
   */
  constructor(getEndpointFn) {
    this.getEndpointFn = getEndpointFn;
  }

  /**
   * Query the SPARQL endpoint
   * @param {string} query - The SPARQL query string
   * @returns {Promise<Object>} Query results
   */
  async querySparql(query) {
    if (!query) {
      throw new SparqlError('Query is required');
    }

    try {
      const endpoint = this.getEndpointFn('query');
      
      if (!endpoint) {
        throw new SparqlError('No active query endpoint available');
      }

      const headers = {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json, application/json'
      };
      
      // Add basic auth if credentials exist
      if (endpoint.credentials) {
        const { user, password } = endpoint.credentials;
        const auth = btoa(`${user}:${password}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      eventBus.emit(EVENTS.SPARQL_QUERY_STARTED, { query, endpoint: endpoint.url });

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: query
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new SparqlError(`SPARQL query failed: ${response.status} ${errorText}`, {
            query,
            endpoint: endpoint.url,
            status: response.status,
            response: errorText
          });
        }

        const result = await response.json();
        
        eventBus.emit(EVENTS.SPARQL_QUERY_COMPLETED, { 
          query, 
          endpoint: endpoint.url,
          resultCount: result.results?.bindings?.length || 0
        });
        
        return result;
      } catch (error) {
        if (error instanceof SparqlError) {
          throw error;
        }
        
        if (error.message.includes('fetch')) {
          throw new NetworkError(`Network error when querying endpoint ${endpoint.url}`, {
            query,
            endpoint: endpoint.url,
            originalError: error
          });
        }
        
        throw new SparqlError(`Error querying endpoint ${endpoint.url}`, {
          query,
          endpoint: endpoint.url,
          originalError: error
        });
      }
    } catch (error) {
      eventBus.emit(EVENTS.SPARQL_QUERY_FAILED, {
        query,
        error
      });
      throw error;
    }
  }

  /**
   * Post RDF data to the SPARQL update endpoint
   * @param {Dataset} dataset - The RDF dataset to post
   * @returns {Promise<boolean>} Success status
   */
  async postToSparql(dataset) {
    if (!dataset) {
      throw new SparqlError('Dataset is required');
    }

    try {
      const endpoint = this.getEndpointFn('update');
      
      if (!endpoint) {
        throw new SparqlError('No active update endpoint available');
      }

      const insertQuery = `
        INSERT DATA {
          ${dataset.toString()}
        }
      `;

      const headers = {
        'Content-Type': 'application/sparql-update',
        'Accept': 'application/json, */*'
      };
      
      // Add basic auth if credentials exist
      if (endpoint.credentials) {
        const { user, password } = endpoint.credentials;
        const auth = btoa(`${user}:${password}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      eventBus.emit(EVENTS.SPARQL_UPDATE_STARTED, { 
        endpoint: endpoint.url,
        datasetSize: dataset.size
      });

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: insertQuery
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new SparqlError(`SPARQL update failed: ${response.status} ${errorText}`, {
            endpoint: endpoint.url,
            status: response.status,
            response: errorText
          });
        }

        eventBus.emit(EVENTS.SPARQL_UPDATE_COMPLETED, { 
          endpoint: endpoint.url,
          datasetSize: dataset.size
        });
        
        return true;
      } catch (error) {
        if (error instanceof SparqlError) {
          throw error;
        }
        
        if (error.message.includes('fetch')) {
          throw new NetworkError(`Network error when updating endpoint ${endpoint.url}`, {
            endpoint: endpoint.url,
            originalError: error
          });
        }
        
        throw new SparqlError(`Error updating endpoint ${endpoint.url}`, {
          endpoint: endpoint.url,
          originalError: error
        });
      }
    } catch (error) {
      eventBus.emit(EVENTS.SPARQL_UPDATE_FAILED, {
        error
      });
      throw error;
    }
  }

  /**
   * Test if a SPARQL endpoint is alive and responding
   * @param {string} url - The endpoint URL to test
   * @param {Object} [credentials] - Optional credentials for basic auth
   * @returns {Promise<boolean>} True if endpoint is alive
   */
  async testEndpoint(url, credentials) {
    try {
      const headers = {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json, application/json'
      };
      
      if (credentials) {
        const { user, password } = credentials;
        const auth = btoa(`${user}:${password}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      // Use a minimal ASK query to test if the endpoint is alive
      const query = 'ASK { ?s ?p ?o } LIMIT 1';
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: query
      });

      return response.ok;
    } catch (error) {
      console.warn(`Endpoint test failed for ${url}:`, error);
      return false;
    }
  }
}

// Export a factory function to create the service with dependencies
export function createSparqlService(getEndpointFn) {
  return new SparqlService(getEndpointFn);
}