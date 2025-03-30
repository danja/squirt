import { postToSparql, querySparql, getEndpoint } from '../../src/js/services/sparql/sparql.js';
import { state } from '../../src/js/core/state.js';
import rdf from 'rdf-ext';

// Mock the fetch function
global.fetch = jest.fn();

describe('SPARQL Operations', () => {
  const testDataset = rdf.dataset();
  const testSubject = rdf.namedNode('http://example.org/test');
  const testPredicate = rdf.namedNode('http://example.org/name');
  const testObject = rdf.literal('Test Entry');

  // Setup mock endpoints in state
  beforeEach(() => {
    testDataset.add(rdf.quad(testSubject, testPredicate, testObject));
    
    // Set up mock endpoints in state
    state.update('endpoints', [
      {
        url: 'http://test-query-endpoint:3030/sparql',
        label: 'Test Query Endpoint',
        type: 'query',
        status: 'active'
      },
      {
        url: 'http://test-update-endpoint:3030/sparql',
        label: 'Test Update Endpoint',
        type: 'update',
        status: 'active'
      }
    ]);
    
    // Reset mock fetch
    global.fetch.mockReset();
  });

  it('should successfully post data to SPARQL endpoint', async () => {
    // Mock successful POST response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'Success'
    });

    const result = await postToSparql(testDataset);
    expect(result).toBe(true);
    
    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('http://test-update-endpoint:3030/sparql');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/sparql-update');
  });

  it('should verify posted data with query', async () => {
    const query = `
      SELECT ?o
      WHERE {
        <http://example.org/test> <http://example.org/name> ?o .
      }
    `;

    // Mock successful query response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: {
          bindings: [
            {
              o: { 
                type: 'literal',
                value: 'Test Entry' 
              }
            }
          ]
        }
      })
    });

    const result = await querySparql(query);
    expect(result.results.bindings.length).toBeGreaterThan(0);
    expect(result.results.bindings[0].o.value).toBe('Test Entry');
    
    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('http://test-query-endpoint:3030/sparql');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/sparql-query');
  });

  it('should handle SPARQL syntax errors gracefully', async () => {
    const badQuery = 'SELECT * WHERE { INVALID SYNTAX }';

    // Mock error response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Parse error: Invalid syntax at line 1'
    });

    try {
      await querySparql(badQuery);
      fail('Should throw error for invalid query');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('SPARQL query failed: 400');
      expect(error.message).toContain('Parse error:');
    }
  });

  it('should handle network errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    try {
      await querySparql('SELECT * WHERE { ?s ?p ?o }');
      fail('Should throw error for network failure');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle empty dataset gracefully', async () => {
    const emptyDataset = rdf.dataset();
    
    // Mock successful POST response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'Success'
    });
    
    const result = await postToSparql(emptyDataset);
    expect(result).toBe(true);
    
    // Verify fetch was called with empty dataset
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
