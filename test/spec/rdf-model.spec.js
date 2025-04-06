// test/spec/rdf-model.spec.js
import { RDFModel } from '../../src/js/services/rdf/rdf-model.js';
import rdf from 'rdf-ext';

// Mock localStorage
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock state
jest.mock('../../src/js/core/state.js', () => ({
    state: {
        update: jest.fn(),
        get: jest.fn()
    }
}));

// Mock SPARQL services
jest.mock('../../src/js/services/sparql/sparql.js', () => ({
    querySparql: jest.fn().mockResolvedValue({}),
    postToSparql: jest.fn().mockResolvedValue(true)
}));

describe('RDFModel', () => {
    let rdfModel;

    beforeEach(() => {
        jest.clearAllMocks();
        rdfModel = new RDFModel();
    });

    it('should create a post and add it to the dataset', () => {
        // Setup
        const mockDataset = rdf.dataset();
        const mockUpdate = jest.fn();
        rdfModel.saveToCache = jest.fn();

        // Mock state to return empty dataset
        require('../../src/js/core/state.js').state.get.mockReturnValue(mockDataset);
        require('../../src/js/core/state.js').state.update = mockUpdate;

        // Create test post data
        const postData = {
            type: 'link',
            title: 'Test Title',
            content: 'Test Content',
            url: 'https://example.com',
            tags: ['test', 'example']
        };

        // Act
        const postId = rdfModel.createPost(postData);

        // Assert
        expect(postId).toBeDefined();
        expect(mockUpdate).toHaveBeenCalled();
        expect(rdfModel.saveToCache).toHaveBeenCalled();

        // Verify the post was added to the dataset
        const updatedDataset = mockUpdate.mock.calls[0][1];
        expect(updatedDataset.size).toBeGreaterThan(0);

        // Verify post properties were added correctly
        let titleFound = false;
        let typeFound = false;

        updatedDataset.forEach(quad => {
            if (quad.predicate.value.includes('title')) {
                expect(quad.object.value).toBe('Test Title');
                titleFound = true;
            }
            if (quad.predicate.value.includes('type')) {
                expect(quad.object.value.includes('link')).toBe(true);
                typeFound = true;
            }
        });

        expect(titleFound).toBe(true);
        expect(typeFound).toBe(true);
    });

    it('should get posts filtered by type', () => {
        // Setup
        const mockDataset = rdf.dataset();
        const ns = {
            rdf: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
            squirt: rdf.namespace('http://purl.org/stuff/squirt/'),
            dc: rdf.namespace('http://purl.org/dc/terms/')
        };

        // Create a test post in the dataset
        const postId = 'http://example.org/post1';
        mockDataset.add(rdf.quad(
            rdf.namedNode(postId),
            ns.rdf('type'),
            ns.squirt('link')
        ));
        mockDataset.add(rdf.quad(
            rdf.namedNode(postId),
            ns.dc('title'),
            rdf.literal('Test Post')
        ));
        mockDataset.add(rdf.quad(
            rdf.namedNode(postId),
            ns.squirt('content'),
            rdf.literal('Test Content')
        ));
        mockDataset.add(rdf.quad(
            rdf.namedNode(postId),
            ns.squirt('tag'),
            rdf.literal('test')
        ));

        // Mock state to return our dataset
        require('../../src/js/core/state.js').state.get.mockReturnValue(mockDataset);

        // Act
        const posts = rdfModel.getPosts({ type: 'link' });

        // Assert
        expect(posts.length).toBe(1);
        expect(posts[0].id).toBe(postId);
        expect(posts[0].title).toBe('Test Post');
        expect(posts[0].content).toBe('Test Content');
        expect(posts[0].tags).toContain('test');
        expect(posts[0].type).toBe('link');
    });

    it('should delete a post from the dataset', () => {
        // Setup
        const mockDataset = rdf.dataset();
        const postId = 'http://example.org/post1';
        const ns = {
            rdf: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
            squirt: rdf.namespace('http://purl.org/stuff/squirt/'),
        };

        mockDataset.add(rdf.quad(
            rdf.namedNode(postId),
            ns.rdf('type'),
            ns.squirt('link')
        ));

        // Mock state and update
        const mockUpdate = jest.fn();
        require('../../src/js/core/state.js').state.get.mockReturnValue(mockDataset);
        require('../../src/js/core/state.js').state.update = mockUpdate;
        rdfModel.saveToCache = jest.fn();

        // Act
        const result = rdfModel.deletePost(postId);

        // Assert
        expect(result).toBe(true);
        expect(mockUpdate).toHaveBeenCalled();
        expect(rdfModel.saveToCache).toHaveBeenCalled();

        // Verify post was removed
        const updatedDataset = mockUpdate.mock.calls[0][1];
        expect(updatedDataset.size).toBe(0);
    });
});