import { postToSparql, querySparql } from '../../src/js/services/sparql/sparql.js';
import rdf from 'rdf-ext';

describe('SPARQL Operations', () => {
  const testDataset = rdf.dataset();
  const testSubject = rdf.namedNode('http://example.org/test');
  const testPredicate = rdf.namedNode('http://example.org/name');
  const testObject = rdf.literal('Test Entry');

  beforeEach(() => {
    testDataset.add(rdf.quad(testSubject, testPredicate, testObject));
  });

  it('should successfully post data to SPARQL endpoint', async () => {
    try {
      const result = await postToSparql(testDataset);
      expect(result).toBe(true);
    } catch (error) {
      fail('Should not throw error: ' + error.message);
    }
  });

  it('should verify posted data with query', async () => {
    const query = `
      SELECT ?o 
      WHERE { 
        <http://example.org/test> <http://example.org/name> ?o .
      }
    `;

    try {
      const result = await querySparql(query);
      expect(result.results.bindings.length).toBeGreaterThan(0);
      expect(result.results.bindings[0].o.value).toBe('Test Entry');
    } catch (error) {
      fail('Should not throw error: ' + error.message);
    }
  });

  it('should handle SPARQL syntax errors gracefully', async () => {
    const badQuery = 'SELECT * WHERE { INVALID SYNTAX }';
    
    try {
      await querySparql(badQuery);
      fail('Should throw error for invalid query');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toMatch(/SPARQL query failed: 400 Parse error:/);
      expect(error.message).toContain('SELECT * WHERE { INVALID SYNTAX }');
      expect(error.message).toMatch(/Encountered " "in" "IN "" at line 1, column \d+/);
    }
  });

  it('should handle network errors gracefully', async () => {
    const badEndpoint = 'http://nonexistent-endpoint:3030/sparql';
    
    try {
      await fetch(badEndpoint);
      fail('Should throw error for network failure');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('fetch failed');
    }
  });

  it('should handle empty dataset gracefully', async () => {
    const emptyDataset = rdf.dataset();
    try {
      const result = await postToSparql(emptyDataset);
      expect(result).toBe(true);
    } catch (error) {
      fail('Should not throw error for empty dataset: ' + error.message);
    }
  });
});
