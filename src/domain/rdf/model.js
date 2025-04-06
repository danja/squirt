// src/domain/rdf/model.js
import rdf from 'rdf-ext';
import { RDFError } from '../../core/errors/error-types.js';
import { namespaces } from '../../utils/namespaces.js';

/**
 * Core RDF Model class that handles RDF data structures
 * but delegates persistence to a storage service
 */
export class RDFModel {
  constructor() {
    this.ns = {};
    
    // Initialize namespaces
    Object.entries(namespaces).forEach(([prefix, uri]) => {
      this.ns[prefix] = rdf.namespace(uri);
    });
  }

  /**
   * Creates RDF data for a post
   * @param {Object} postData - The post data
   * @param {string} postData.type - The post type (e.g., 'link', 'entry', 'wiki')
   * @param {string} postData.content - The content of the post
   * @param {string} [postData.title] - Optional title
   * @param {string[]} [postData.tags] - Optional array of tags
   * @param {string} [postData.customId] - Optional custom ID (for updates)
   * @param {string} [postData.graph] - Optional named graph URI
   * @returns {Object} The created post with dataset
   */
  createPostData(postData) {
    try {
      const dataset = rdf.dataset();
      
      // Use custom ID if provided (useful for updates), otherwise generate one
      const postId = postData.customId || this.generatePostId(postData);
      const subject = rdf.namedNode(postId);
      
      // Create a named graph for this post if specified
      const graph = postData.graph ? 
        rdf.namedNode(postData.graph) : 
        null;
      
      // Helper function to add quad with optional graph
      const addQuad = (s, p, o) => {
        if (graph) {
          dataset.add(rdf.quad(s, p, o, graph));
        } else {
          dataset.add(rdf.quad(s, p, o));
        }
      };
      
      // Add RDF type
      addQuad(
        subject,
        this.ns.rdf('type'),
        this.ns.squirt(postData.type)
      );
      
      // Add content
      addQuad(
        subject,
        this.ns.squirt('content'),
        rdf.literal(postData.content)
      );
      
      // Add creation date
      addQuad(
        subject,
        this.ns.dc('created'),
        rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
      );
      
      // Add title if provided
      if (postData.title) {
        addQuad(
          subject,
          this.ns.dc('title'),
          rdf.literal(postData.title)
        );
      }
      
      // Add tags if provided
      if (postData.tags && Array.isArray(postData.tags)) {
        postData.tags.forEach(tag => {
          addQuad(
            subject,
            this.ns.squirt('tag'),
            rdf.literal(tag)
          );
        });
      }
      
      // Add URL if it's a link post and has a URL
      if (postData.type === 'link' && postData.url) {
        addQuad(
          subject,
          this.ns.squirt('url'),
          rdf.namedNode(postData.url)
        );
      }
      
      // Add wiki-specific fields
      if (postData.type === 'wiki') {
        // Add last modified date
        addQuad(
          subject,
          this.ns.dc('modified'),
          rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
        );
      }
      
      return {
        id: postId,
        dataset,
        ...postData
      };
    } catch (error) {
      throw new RDFError(`Failed to create post data: ${error.message}`, {
        originalError: error,
        postData
      });
    }
  }

  /**
   * Extract post objects from an RDF dataset
   * @param {Dataset} dataset - The RDF dataset
   * @param {Object} [options] - Query options
   * @param {string} [options.type] - Filter by post type
   * @param {string} [options.tag] - Filter by tag
   * @param {number} [options.limit] - Max number of posts to return
   * @param {string} [options.graph] - Filter by named graph
   * @returns {Array} Array of post objects
   */
  extractPosts(dataset, options = {}) {
    try {
      if (!dataset) return [];
      
      let posts = new Map();
      
      // Find all posts
      const postTypePattern = this.ns.rdf('type');
      
      // Create matching options for graph filtering
      const matchOptions = {};
      if (options.graph) {
        matchOptions.graph = rdf.namedNode(options.graph);
      }
      
      // Get all subjects that are posts
      dataset.match(null, postTypePattern, null, options.graph ? rdf.namedNode(options.graph) : null).forEach(quad => {
        const postType = quad.object.value.split('/').pop();
        
        // Skip if filtering by type and this doesn't match
        if (options.type && postType !== options.type) return;
        
        const postId = quad.subject.value;
        const graphId = quad.graph?.value || null;
        
        if (!posts.has(postId)) {
          posts.set(postId, {
            id: postId,
            type: postType,
            graph: graphId,
            tags: []
          });
        }
      });
      
      // Now populate post details for the matched posts
      posts.forEach((post, id) => {
        const subject = rdf.namedNode(id);
        const graph = post.graph ? rdf.namedNode(post.graph) : null;
        
        // Get content
        dataset.match(subject, this.ns.squirt('content'), null, graph).forEach(quad => {
          post.content = quad.object.value;
        });
        
        // Get title
        dataset.match(subject, this.ns.dc('title'), null, graph).forEach(quad => {
          post.title = quad.object.value;
        });
        
        // Get created date
        dataset.match(subject, this.ns.dc('created'), null, graph).forEach(quad => {
          post.created = quad.object.value;
        });
        
        // Get modified date (primarily for wiki entries)
        dataset.match(subject, this.ns.dc('modified'), null, graph).forEach(quad => {
          post.modified = quad.object.value;
        });
        
        // Get tags
        dataset.match(subject, this.ns.squirt('tag'), null, graph).forEach(quad => {
          post.tags.push(quad.object.value);
        });
        
        // Get URL for link posts
        dataset.match(subject, this.ns.squirt('url'), null, graph).forEach(quad => {
          post.url = quad.object.value;
        });
      });
      
      // Filter by tag if needed
      if (options.tag) {
        posts = new Map(
          Array.from(posts.entries()).filter(([_, post]) => 
            post.tags.includes(options.tag)
          )
        );
      }
      
      // Convert to array and sort by date (newest first)
      // Use modified date if available (for wiki entries), otherwise use created date
      let postsArray = Array.from(posts.values())
        .sort((a, b) => {
          const dateA = a.modified ? new Date(a.modified) : new Date(a.created);
          const dateB = b.modified ? new Date(b.modified) : new Date(b.created);
          return dateB - dateA;
        });
      
      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        postsArray = postsArray.slice(0, options.limit);
      }
      
      return postsArray;
    } catch (error) {
      throw new RDFError(`Failed to extract posts: ${error.message}`, {
        originalError: error,
        options
      });
    }
  }

  /**
   * Generate a unique ID for a post
   * @param {Object} postData - The post data
   * @returns {string} A unique ID
   */
  generatePostId(postData) {
    const content = postData.title || postData.content || postData.url || '';
    const date = new Date().toISOString().split('T')[0];
    const hash = this.hashContent(content);
    
    return `http://purl.org/stuff/squirt/post_${date}_${hash}`;
  }

  /**
   * Generate a hash from content
   * @param {string} content - The content to hash
   * @returns {string} A hash
   */
  hashContent(content) {
    return Array.from(content)
      .reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0) | 0;
      }, 0)
      .toString(16)
      .slice(0, 8);
  }
}

// src/services/rdf/rdf-service.js
import { eventBus, EVENTS } from '../../core/events/event-bus.js';
import { errorHandler, RDFError } from '../../core/errors/index.js';
import { RDFModel } from './model.js';
import { store } from '../../core/state/index.js';
import { addPost, updatePost, removePost, setPosts } from '../../core/state/actions.js';
import { N3Parser } from '@rdfjs/parser-n3';

/**
 * Service for RDF data management
 * Handles persistence and state updates
 */
export class RDFService {
  constructor(storageService, sparqlService) {
    this.model = new RDFModel();
    this.storageService = storageService;
    this.sparqlService = sparqlService;
    this.parser = new N3Parser();
    
    // Initialize data
    this.loadCachedData();
  }

  /**
   * Load data from cache on initialization
   */
  async loadCachedData() {
    try {
      const cachedData = this.storageService.getItem('squirt_rdf_cache');
      if (cachedData) {
        const dataset = await this.parseFromString(cachedData);
        this.dataset = dataset;
        
        // Extract posts and update state
        const posts = this.model.extractPosts(dataset);
        store.dispatch(setPosts(posts));
      } else {
        this.dataset = rdf.dataset();
      }
    } catch (error) {
      errorHandler.handle(error);
      this.dataset = rdf.dataset();
    }
  }

  /**
   * Save dataset to cache
   */
  saveToCache() {
    try {
      this.storageService.setItem('squirt_rdf_cache', this.dataset.toString());
    } catch (error) {
      errorHandler.handle(error);
    }
  }

  /**
   * Parse RDF data from string
   * @param {string} turtleString - RDF in Turtle format
   * @returns {Promise<Dataset>} The parsed dataset
   */
  async parseFromString(turtleString) {
    try {
      const quads = [];
      const parser = this.parser;
      
      return new Promise((resolve, reject) => {
        const stream = parser.import(rdf.stringToStream(turtleString));
        
        stream.on('data', quad => {
          quads.push(quad);
        });
        
        stream.on('error', error => {
          reject(error);
        });
        
        stream.on('end', () => {
          resolve(rdf.dataset(quads));
        });
      });
    } catch (error) {
      throw new RDFError('Error parsing RDF data', { originalError: error });
    }
  }

  /**
   * Create a new post
   * @param {Object} postData - The post data
   * @returns {string} The ID of the created post
   */
  createPost(postData) {
    try {
      // Create post data using the model
      const post = this.model.createPostData(postData);
      
      // Add to dataset
      post.dataset.forEach(quad => {
        this.dataset.add(quad);
      });
      
      // Save to cache
      this.saveToCache();
      
      // Update state
      store.dispatch(addPost({
        id: post.id,
        type: postData.type,
        title: postData.title,
        content: postData.content,
        url: postData.url,
        tags: postData.tags || [],
        created: new Date().toISOString()
      }));
      
      // Emit event
      eventBus.emit(EVENTS.POST_CREATED, post);
      
      // Try to sync with endpoint
      this.syncWithEndpoint().catch(error => {
        errorHandler.handle(error, { 
          showToUser: true, 
          context: 'Syncing with endpoint after post creation' 
        });
      });
      
      return post.id;
    } catch (error) {
      throw errorHandler.handle(
        new RDFError('Failed to create post', { 
          originalError: error,
          postData
        }),
        { rethrow: true }
      );
    }
  }

  /**
   * Update an existing post
   * @param {string} postId - The ID of the post to update
   * @param {Object} postData - The updated post data
   * @returns {string} The ID of the updated post
   */
  updatePost(postId, postData) {
    try {
      // First delete the old post data
      this.deletePost(postId, { skipStateUpdate: true, skipSync: true });
      
      // Then create new post data with the same ID
      const updatedData = {
        ...postData,
        customId: postId
      };
      
      // Create post data using the model
      const post = this.model.createPostData(updatedData);
      
      // Add to dataset
      post.dataset.forEach(quad => {
        this.dataset.add(quad);
      });
      
      // Save to cache
      this.saveToCache();
      
      // Update state
      store.dispatch(updatePost({ 
        id: postId, 
        updates: {
          ...updatedData,
          modified: new Date().toISOString()
        }
      }));
      
      // Emit event
      eventBus.emit(EVENTS.POST_UPDATED, post);
      
      // Try to sync with endpoint
      this.syncWithEndpoint().catch(error => {
        errorHandler.handle(error, { 
          showToUser: true,
          context: 'Syncing with endpoint after post update'
        });
      });
      
      return postId;
    } catch (error) {
      throw errorHandler.handle(
        new RDFError('Failed to update post', { 
          originalError: error,
          postId,
          postData
        }),
        { rethrow: true }
      );
    }
  }

  /**
   * Delete a post
   * @param {string} postId - The ID of the post to delete
   * @param {Object} options - Options
   * @param {boolean} options.skipStateUpdate - Skip state update
   * @param {boolean} options.skipSync - Skip syncing with endpoint
   * @returns {boolean} Success status
   */
  deletePost(postId, options = {}) {
    try {
      const { skipStateUpdate = false, skipSync = false } = options;
      const subject = rdf.namedNode(postId);
      
      // Find all quads with this subject
      const quadsToRemove = this.dataset.match(subject);
      
      if (quadsToRemove.size === 0) {
        return false;
      }
      
      // Remove from dataset
      quadsToRemove.forEach(quad => {
        this.dataset.delete(quad);
      });
      
      // Save to cache
      this.saveToCache();
      
      // Update state if not skipped
      if (!skipStateUpdate) {
        store.dispatch(removePost(postId));
        
        // Emit event
        eventBus.emit(EVENTS.POST_DELETED, { id: postId });
      }
      
      // Try to sync with endpoint if not skipped
      if (!skipSync) {
        this.syncWithEndpoint().catch(error => {
          errorHandler.handle(error, { 
            showToUser: true,
            context: 'Syncing with endpoint after post deletion'
          });
        });
      }
      
      return true;
    } catch (error) {
      throw errorHandler.handle(
        new RDFError('Failed to delete post', { 
          originalError: error,
          postId
        }),
        { rethrow: true }
      );
    }
  }

  /**
   * Get all posts with optional filtering
   * @param {Object} options - Query options
   * @returns {Array} Array of post objects
   */
  getPosts(options = {}) {
    try {
      return this.model.extractPosts(this.dataset, options);
    } catch (error) {
      throw errorHandler.handle(
        new RDFError('Failed to get posts', { 
          originalError: error,
          options
        }),
        { rethrow: true }
      );
    }
  }

  /**
   * Get a post by ID
   * @param {string} postId - The post ID
   * @returns {Object|null} The post or null if not found
   */
  getPost(postId) {
    try {
      const options = { limit: 1 };
      const subject = rdf.namedNode(postId);
      
      // Create a filtered dataset with just this post
      const filteredDataset = this.dataset.match(subject);
      
      if (filteredDataset.size === 0) {
        return null;
      }
      
      const posts = this.model.extractPosts(filteredDataset, options);
      
      return posts.length > 0 ? posts[0] : null;
    } catch (error) {
      throw errorHandler.handle(
        new RDFError('Failed to get post', { 
          originalError: error,
          postId
        }),
        { rethrow: true }
      );
    }
  }

  /**
   * Synchronize local RDF data with remote SPARQL endpoint
   */
  async syncWithEndpoint() {
    try {
      if (!this.sparqlService || !this.dataset || this.dataset.size === 0) {
        return false;
      }
      
      const result = await this.sparqlService.postToSparql(this.dataset);
      
      if (result) {
        eventBus.emit(EVENTS.MODEL_SYNCED, { timestamp: new Date() });
      }
      
      return result;
    } catch (error) {
      throw new RDFError('Failed to sync with SPARQL endpoint', { 
        originalError: error 
      });
    }
  }

  /**
   * Load posts from the SPARQL endpoint
   */
  async loadFromEndpoint() {
    try {
      if (!this.sparqlService) {
        return false;
      }
      
      const query = `
        PREFIX rdf: <${namespaces.rdf}>
        PREFIX squirt: <${namespaces.squirt}>
        PREFIX dc: <${namespaces.dc}>
        
        CONSTRUCT {
          ?s ?p ?o .
        }
        WHERE {
          ?s rdf:type ?type .
          FILTER(STRSTARTS(STR(?type), "${namespaces.squirt}"))
          ?s ?p ?o .
        }
      `;
      
      const response = await this.sparqlService.querySparql(query);
      
      if (response && response.results) {
        const dataset = await this.parseFromString(response.results);
        this.dataset = dataset;
        
        // Save to cache
        this.saveToCache();
        
        // Extract posts and update state
        const posts = this.model.extractPosts(dataset);
        store.dispatch(setPosts(posts));
        
        return true;
      }
      
      return false;
    } catch (error) {
      throw new RDFError('Failed to load from SPARQL endpoint', { 
        originalError: error 
      });
    }
  }
}

// Export a factory function to create the service with dependencies
export function createRDFService(storageService, sparqlService) {
  return new RDFService(storageService, sparqlService);
}
