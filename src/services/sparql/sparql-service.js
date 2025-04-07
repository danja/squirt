import { state } from '../../core/state.js'
import { errorHandler } from '../../core/errors/index.js'

/**
 * Get active endpoint of specified type
 * @param {string} type - Endpoint type ('query' or 'update')
 * @returns {Object} Endpoint configuration
 * @throws {Error} If no active endpoint is available
 */
export function getEndpoint(type) {
  const endpoints = state.get('endpoints') || []
  const endpoint = endpoints.find(e => e.type === type && e.status === 'active')

  if (!endpoint) {
    throw new Error(`No active ${type} endpoint available. Please check your SPARQL configuration.`)
  }

  return endpoint
}

/**
 * Post RDF dataset to SPARQL endpoint
 * @param {Object} dataset - RDF dataset
 * @returns {Promise<boolean>} Success status
 * @throws {Error} If posting fails
 */
export async function postToSparql(dataset) {
  if (!dataset) {
    throw new Error('Dataset is required')
  }

  const endpoint = getEndpoint('update')
  const insertQuery = `
    INSERT DATA {
      ${dataset.toString()}
    }
  `

  try {
    const headers = {
      'Content-Type': 'application/sparql-update',
      'Accept': 'application/json, */*'
    }

    // Add authentication if provided
    if (endpoint.credentials) {
      const { user, password } = endpoint.credentials
      const auth = btoa(`${user}:${password}`)
      headers['Authorization'] = `Basic ${auth}`
    }

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: insertQuery
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SPARQL update failed for endpoint ${endpoint.url}: ${response.status} ${errorText}`)
    }
    return true
  } catch (error) {
    errorHandler.handle(error)
    throw error
  }
}

/**
 * Execute SPARQL query
 * @param {string} query - SPARQL query
 * @returns {Promise<Object>} Query results
 * @throws {Error} If query fails
 */
export async function querySparql(query) {
  if (!query) {
    throw new Error('Query is required')
  }

  const endpoint = getEndpoint('query')

  try {
    const headers = {
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json, application/json'
    }

    // Add authentication if provided
    if (endpoint.credentials) {
      const { user, password } = endpoint.credentials
      const auth = btoa(`${user}:${password}`)
      headers['Authorization'] = `Basic ${auth}`
    }

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: query
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SPARQL query failed for endpoint ${endpoint.url}: ${response.status} ${errorText}\n${query}`)
    }

    return response.json()
  } catch (error) {
    errorHandler.handle(error)
    throw error
  }
}

/**
 * Test if an endpoint is available
 * @param {string} url - Endpoint URL
 * @param {Object} credentials - Credentials for authentication
 * @returns {Promise<boolean>} Endpoint status
 */
export async function testEndpoint(url, credentials) {
  try {
    const headers = {
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json, application/json'
    }

    if (credentials) {
      const { user, password } = credentials
      const auth = btoa(`${user}:${password}`)
      headers['Authorization'] = `Basic ${auth}`
    }

    // Simple ASK query to test endpoint
    const query = 'ASK { ?s ?p ?o } LIMIT 1'

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: query
    })

    return response.ok
  } catch (error) {
    console.error(`Endpoint test failed for ${url}:`, error)
    return false
  }
}