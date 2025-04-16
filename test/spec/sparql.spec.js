import { postToSparql, querySparql } from '../../src/services/sparql/sparql.js'
import rdf from 'rdf-ext'
import { SparqlError, NetworkError } from '../../src/core/errors/error-types.js'

describe('SPARQL Operations', () => {
  let testDataset
  const testSubject = rdf.namedNode('http://example.org/test')
  const testPredicate = rdf.namedNode('http://example.org/name')
  const testObject = rdf.literal('Test Entry')
  const testEndpointUrl = 'http://mock-endpoint:3030/sparql'
  let fetchSpy

  beforeEach(() => {
    testDataset = rdf.dataset()
    fetchSpy = spyOn(global, 'fetch')

    fetchSpy.and.resolveTo(new Response(JSON.stringify({ boolean: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/sparql-results+json' }
    }))
  })

  it('should successfully post data using fetch', async () => {
    testDataset.add(rdf.quad(testSubject, testPredicate, testObject))
    fetchSpy.and.resolveTo(new Response(null, { status: 204 }))

    const result = await postToSparql(testEndpointUrl, testDataset)
    expect(result).toBeUndefined()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const fetchArgs = fetchSpy.calls.mostRecent().args
    expect(fetchArgs[0]).toBe(testEndpointUrl)
    expect(fetchArgs[1].method).toBe('POST')
    expect(fetchArgs[1].headers['Content-Type']).toBe('application/sparql-update')
    const body = await fetchArgs[1].text()
    expect(body).toContain('<http://example.org/test> <http://example.org/name> "Test Entry" .')
  })

  it('should query data using fetch and return parsed JSON', async () => {
    const mockResponse = {
      head: { vars: ['o'] },
      results: {
        bindings: [
          { o: { type: 'literal', value: 'Test Entry' } }
        ]
      }
    }
    fetchSpy.and.resolveTo(new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/sparql-results+json' }
    }))

    const query = `SELECT ?o WHERE { <${testSubject.value}> <${testPredicate.value}> ?o . }`

    const result = await querySparql(testEndpointUrl, query)

    expect(result).toEqual(mockResponse)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const fetchArgs = fetchSpy.calls.mostRecent().args
    expect(fetchArgs[0]).toBe(testEndpointUrl)
    expect(fetchArgs[1].method).toBe('POST')
    expect(fetchArgs[1].headers['Accept']).toBe('application/sparql-results+json')
    expect(fetchArgs[1].headers['Content-Type']).toBe('application/sparql-query')
    const bodyParams = new URLSearchParams(fetchArgs[1].body)
    expect(bodyParams.get('query')).toBe(query)
  })

  it('should throw SparqlError for SPARQL syntax errors (e.g., 400)', async () => {
    const badQuery = 'SELECT * WHERE { INVALID SYNTAX }'
    const mockErrorResponse = 'Parse error: Lexical error'
    fetchSpy.and.resolveTo(new Response(mockErrorResponse, {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'text/plain' }
    }))

    await expectAsync(querySparql(testEndpointUrl, badQuery))
      .toBeRejectedWithError(SparqlError, /SPARQL endpoint error: 400 Bad Request/i)
  })

  it('should throw NetworkError for network issues (fetch rejects)', async () => {
    const networkError = new TypeError('Failed to fetch')
    fetchSpy.and.rejectWith(networkError)

    const query = 'ASK { ?s ?p ?o }'

    await expectAsync(querySparql(testEndpointUrl, query))
      .toBeRejectedWithError(NetworkError, /Network error.*Failed to fetch/i)
  })

  it('should throw SparqlError for non-2xx server responses', async () => {
    fetchSpy.and.resolveTo(new Response('Internal Server Error', { status: 500, statusText: 'Internal Error' }))

    const query = 'ASK { ?s ?p ?o }'

    await expectAsync(querySparql(testEndpointUrl, query))
      .toBeRejectedWithError(SparqlError, /SPARQL endpoint error: 500 Internal Error/i)
  })

  it('postToSparql should handle empty dataset gracefully', async () => {
    fetchSpy.and.resolveTo(new Response(null, { status: 204 }))
    const emptyDataset = rdf.dataset()

    const result = await postToSparql(testEndpointUrl, emptyDataset)
    expect(result).toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const fetchArgs = fetchSpy.calls.mostRecent().args
    expect(fetchArgs[0]).toBe(testEndpointUrl)
    expect(fetchArgs[1].method).toBe('POST')
    expect(fetchArgs[1].body).toBe('')
  })
})
