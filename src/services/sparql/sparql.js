import { SparqlError, NetworkError } from '../../core/errors/error-types.js'

/**
 * Executes a SPARQL query against a specified endpoint.
 * @param {string} endpointUrl - The URL of the SPARQL query endpoint.
 * @param {string} query - The SPARQL query string.
 * @param {string} [queryType='select'] - The type of query ('select', 'construct', 'ask'). Determines Accept header.
 * @param {Object} [credentials] - Optional credentials { user, password }.
 * @returns {Promise<Object|DatasetExt|boolean>} The query result (JSON for select/ask, Dataset for construct).
 * @throws {SparqlError} If the endpoint returns an error.
 * @throws {NetworkError} If there's a network issue.
 */
export async function querySparql(endpointUrl, query, queryType = 'select', credentials = null) {
  if (!endpointUrl) {
    throw new SparqlError('SPARQL query endpoint URL is required.', { query })
  }

  let acceptHeader
  switch (queryType.toLowerCase()) {
    case 'construct':
    case 'describe':
      acceptHeader = 'application/n-triples' // Or application/ld+json, text/turtle etc.
      break
    case 'ask':
      acceptHeader = 'application/sparql-results+json' // Or application/sparql-results+xml
      break
    case 'select':
    default:
      acceptHeader = 'application/sparql-results+json'
      break
  }

  const headers = {
    'Accept': acceptHeader,
    'Content-Type': 'application/sparql-query'
  }

  // Add Basic Authentication if credentials are provided
  if (credentials && credentials.user && credentials.password) {
    const authString = btoa(`${credentials.user}:${credentials.password}`)
    headers['Authorization'] = `Basic ${authString}`
  }

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: headers,
      body: query
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new SparqlError(`SPARQL endpoint error: ${response.status} ${response.statusText}`, {
        endpointUrl,
        status: response.status,
        response: errorText,
        query
      })
    }

    // Process response based on query type
    if (queryType.toLowerCase() === 'construct' || queryType.toLowerCase() === 'describe') {
      // Requires an RDF parser (e.g., from rdf-ext or @rdfjs/formats-common)
      // This function currently doesn't have a parser dependency.
      // Caller needs to handle parsing. Returning text for now.
      // TODO: Consider adding a parser or returning the Response object.
      return await response.text() // Or return response and let caller parse
    } else if (queryType.toLowerCase() === 'ask') {
      const resultJson = await response.json()
      return resultJson.boolean
    } else { // select
      return await response.json()
    }

  } catch (error) {
    if (error instanceof SparqlError) {
      throw error // Re-throw SparqlErrors
    }
    // Wrap other errors (like network errors) appropriately
    console.error('Network or fetch error during SPARQL query:', error)
    throw new NetworkError(`Network error querying SPARQL endpoint: ${error.message}`, {
      originalError: error,
      endpointUrl,
      query
    })
  }
}

/**
 * Sends a SPARQL update query to a specified endpoint.
 * @param {string} endpointUrl - The URL of the SPARQL update endpoint.
 * @param {string} updateQuery - The SPARQL UPDATE query string.
 * @param {Object} [credentials] - Optional credentials { user, password }.
 * @returns {Promise<void>}
 * @throws {SparqlError} If the endpoint returns an error.
 * @throws {NetworkError} If there's a network issue.
 */
export async function postToSparql(endpointUrl, updateQuery, credentials = null) {
  if (!endpointUrl) {
    throw new SparqlError('SPARQL update endpoint URL is required.', { updateQuery })
  }

  const headers = {
    'Content-Type': 'application/sparql-update'
    // Update requests usually don't need an Accept header, or it's ignored.
  }

  // Add Basic Authentication if credentials are provided
  if (credentials && credentials.user && credentials.password) {
    const authString = btoa(`${credentials.user}:${credentials.password}`)
    headers['Authorization'] = `Basic ${authString}`
  }

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: headers,
      body: updateQuery
    })

    if (!response.ok) {
      // Attempt to get more detailed error message from response body
      const errorText = await response.text()
      throw new SparqlError(`SPARQL update error: ${response.status} ${response.statusText}`, {
        endpointUrl,
        status: response.status,
        response: errorText,
        updateQuery
      })
    }

    // Successful update usually returns 2xx with no body or minimal body
    console.log(`SPARQL update successful for endpoint: ${endpointUrl}`)
    // We don't need to return anything on success

  } catch (error) {
    if (error instanceof SparqlError) {
      throw error // Re-throw SparqlErrors
    }
    // Wrap other errors (like network errors) appropriately
    console.error('Network or fetch error during SPARQL update:', error)
    throw new NetworkError(`Network error posting SPARQL update: ${error.message}`, {
      originalError: error,
      endpointUrl,
      updateQuery
    })
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