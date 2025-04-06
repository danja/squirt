// src/js/services/sparql/sparql.js
import { state } from '../../core/state.js';
import { ErrorHandler } from '../../core/errors.js';

/**
 * Get the active endpoint URL for a specific type (query or update)
 * @param {string} type - The endpoint type: 'query' or 'update'
 * @returns {Object|null} The endpoint object or null if not found
 */
export function getEndpoint(type) {
  const endpoints = state.get('endpoints') || [];
  const endpoint = endpoints.find(e => e.type === type && e.status === 'active');
  
  if (!endpoint) {
    throw new Error(`No active ${type} endpoint available. Please check your SPARQL configuration.`);
  }
  
  return endpoint;
}

/**
 * Post RDF data to the SPARQL update endpoint
 * @param {Dataset} dataset - The RDF dataset to post
 * @returns {Promise<boolean>} Success status
 */
export async function postToSparql(dataset) {
  if (!dataset) {
    throw new Error('Dataset is required');
  }

  const endpoint = getEndpoint('update');
  const insertQuery = `
    INSERT DATA {
      ${dataset.toString()}
    }
  `;

  try {
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

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: insertQuery
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SPARQL update failed for endpoint ${endpoint.url}: ${response.status} ${errorText}`);
    }
    return true;
  } catch (error) {
    ErrorHandler.handle(error);
    throw error;
  }
}

/**
 * Query the SPARQL endpoint
 * @param {string} query - The SPARQL query string
 * @returns {Promise<Object>} Query results
 */
export async function querySparql(query) {
  if (!query) {
    throw new Error('Query is required');
  }

  const endpoint = getEndpoint('query');

  try {
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

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: query
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SPARQL query failed for endpoint ${endpoint.url}: ${response.status} ${errorText}\n${query}`);
    }

    return response.json();
  } catch (error) {
    ErrorHandler.handle(error);
    throw error;
  }
}

/**
 * Test if a SPARQL endpoint is alive and responding
 * @param {string} url - The endpoint URL to test
 * @param {Object} [credentials] - Optional credentials for basic auth
 * @returns {Promise<boolean>} True if endpoint is alive
 */
export async function testEndpoint(url, credentials) {
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
    console.error(`Endpoint test failed for ${url}:`, error);
    return false;
  }
}