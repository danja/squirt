import { errorHandler } from '../../core/errors/index.js'
import { querySparql } from './sparql.js'
import { NetworkError, SparqlError } from '../../core/errors/error-types.js'

/**
 * Test if a SPARQL endpoint is available and accepts queries.
 * @param {string} url - Endpoint URL.
 * @param {Object} [credentials] - Optional credentials { user, password } for authentication.
 * @returns {Promise<boolean>} True if the endpoint responds successfully to a simple ASK query, false otherwise.
 */
export async function testEndpoint(url, credentials = null) {
  if (!url) {
    console.warn('testEndpoint called with no URL.')
    return false
  }
  // Simple ASK query to test endpoint connectivity and query execution
  const testQuery = 'ASK { ?s ?p ?o . } LIMIT 1'

  try {
    // Use the refactored querySparql function
    // It throws specific errors (SparqlError, NetworkError) on failure
    const result = await querySparql(url, testQuery, 'ask', credentials)
    // For ASK queries, querySparql should return true or false
    console.log(`Endpoint test successful for ${url}: ASK query returned ${result}`)
    return typeof result === 'boolean' && result // Ensure it's the boolean true
  } catch (error) {
    // Log the specific error type
    if (error instanceof SparqlError) {
      console.error(`Endpoint test failed for ${url} (SPARQL Error): ${error.message}`, error.details)
    } else if (error instanceof NetworkError) {
      console.error(`Endpoint test failed for ${url} (Network Error): ${error.message}`)
    } else {
      console.error(`Endpoint test failed for ${url} (Unknown Error):`, error)
    }
    // Pass the error details to the handler, but don't show generic failure to user by default
    errorHandler.handle(error, { showToUser: false, context: `Endpoint Test Failed: ${url}` })
    return false
  }
}