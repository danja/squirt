import rdf from 'rdf-ext';
import N3Parser from '@rdfjs/parser-n3';
import { namespaces, generateNid } from '../../utils/utils.js';
import { state } from '../../core/state.js';
import { querySparql, postToSparql } from '../sparql/sparql.js';

export class RDFModel {
  constructor() {
    this.parser = new N3Parser();
    this.ns = {};
    
    // Initialize namespaces
    Object.entries(namespaces).forEach(([prefix, uri]) => {
      this.ns[prefix] = rdf.namespace(uri);
    });

    // Load any cached data on initialization
    this.loadCachedData();
  }

  async loadCachedData() {
    try {
      const cachedData = localStorage.getItem('squirt_rdf_cache');
      if (cachedData) {
        const dataset = await this.parseFromString(cachedData);
        state.update('rdfDataset', dataset);
      } else {
        state.update('rdfDataset', rdf.dataset());
      }
    } catch (error) {
      console.error('Error loading cached RDF data:', error);
      state.update('rdfDataset', rdf.dataset());
    }
  }

  saveToCache(dataset) {
    try {
      localStorage.setItem('squirt_rdf_cache', dataset.toString());
    } catch (error) {
      console.error('Error caching RDF data:', error);
    }
  }

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
      console.error('Error parsing RDF data:', error);
      throw error;
    }
  }

  /**
   * Create a new post in the RDF dataset
   * @param {Object} postData - The post data
   * @param {string} postData.type - The post type (e.g., 'link', 'entry', 'wiki')
   * @param {string} postData.content - The content of the post
   * @param {string} [postData.title] - Optional title
   * @param {string[]} [postData.tags] - Optional array of tags
   * @param {string} [postData.customId] - Optional custom ID (for updates)
   * @param {string} [postData.graph] - Optional named graph URI
   * @returns {string} The ID of the created post
   */
  createPost(postData) {
    const dataset = state.get('rdfDataset') || rdf.dataset();
    
    // Use custom ID if provided (useful for updates), otherwise generate one
    const postId = postData.customId || generateNid(postData.content);
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
    
    // Update state with new dataset
    state.update('rdfDataset', dataset);
    
    // Save to cache
    this.saveToCache(dataset);
    
    return postId;
  }

  /**
   * Get posts from the dataset
   * @param {Object} [options] - Query options
   * @param {string} [options.type] - Filter by post type
   * @param {string} [options.tag] - Filter by tag
   * @param {number} [options.limit] - Max number of posts to return
   * @param {string} [options.graph] - Filter by named graph
   * @returns {Array} Array of post objects
   */
  getPosts(options = {}) {
    const dataset = state.get('rdfDataset');
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
  }

  /**
   * Synchronize local RDF data with remote SPARQL endpoint
   */
  async syncWithEndpoint() {
    const dataset = state.get('rdfDataset');
    if (!dataset || dataset.size === 0) return;
    
    try {
      await postToSparql(dataset);
      console.log('Data synchronized with SPARQL endpoint');
    } catch (error) {
      console.error('Failed to sync with SPARQL endpoint:', error);
      throw error;
    }
  }

  /**
   * Load posts from the SPARQL endpoint
   */
  async loadFromEndpoint() {
    try {
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
      
      const response = await querySparql(query);
      
      if (response && response.results) {
        const dataset = await this.parseFromString(response.results);
        state.update('rdfDataset', dataset);
        this.saveToCache(dataset);
        console.log('Loaded data from SPARQL endpoint');
      }
    } catch (error) {
      console.error('Failed to load data from SPARQL endpoint:', error);
      throw error;
    }
  }

  /**
   * Delete a post from the dataset
   * @param {string} postId - The ID of the post to delete
   * @returns {boolean} Success status
   */
  deletePost(postId) {
    const dataset = state.get('rdfDataset');
    if (!dataset) return false;
    
    const subject = rdf.namedNode(postId);
    
    // Find all quads with this subject and remove them
    const quadsToRemove = dataset.match(subject);
    
    if (quadsToRemove.size === 0) return false;
    
    quadsToRemove.forEach(quad => {
      dataset.delete(quad);
    });
    
    // Update state
    state.update('rdfDataset', dataset);
    
    // Save to cache
    this.saveToCache(dataset);
    
    return true;
  }
}

// Export a singleton instance
export const rdfModel = new RDFModel();