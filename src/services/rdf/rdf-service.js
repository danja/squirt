// src/services/rdf/rdf-service.js
import rdf from 'rdf-ext'
import N3Parser from '@rdfjs/parser-n3'

import { RDFModel as DomainRDFModel } from '../../domain/rdf/model.js'
// import { state } from '../../core/state.js'; // REMOVE Legacy state wrapper
import { store } from '../../core/state/index.js' // Import Redux store
import { getActiveEndpoint } from '../../core/state/selectors.js' // Import selectors
import { querySparql, postToSparql } from '../sparql/sparql.js' // Verify path
import { RDFError, SparqlError, NetworkError } from '../../core/errors/error-types.js' // For error handling
import { namespaces } from '../../utils/namespaces.js' // For query building
import { errorHandler } from '../../core/errors/index.js' // Import error handler

// Constants
const RDF_CACHE_KEY = 'squirt_rdf_cache'

/**
 * Service for managing RDF data, including caching, and endpoint interaction.
 * Dependencies (store, errorHandler, SPARQL functions) are injected.
 */
export class RDFService {
    /**
     * Creates an instance of RDFService.
     * @param {object} store - The Redux store instance.
     * @param {object} errorHandler - The error handler instance.
     * @param {function} querySparqlFn - Function to execute SPARQL queries.
     * @param {function} postToSparqlFn - Function to execute SPARQL updates.
     */
    constructor(store, errorHandler, querySparqlFn, postToSparqlFn) {
        if (!store || !errorHandler || !querySparqlFn || !postToSparqlFn) {
            throw new Error('RDFService requires store, errorHandler, querySparqlFn, and postToSparqlFn dependencies.')
        }
        this.store = store
        this.errorHandler = errorHandler
        this.querySparqlFn = querySparqlFn
        this.postToSparqlFn = postToSparqlFn

        this.parser = new N3Parser()
        this.domainModel = new DomainRDFModel() // Use the domain model for data creation
        this.ns = {}
        this.rdfDataset = rdf.dataset() // Initialize internal dataset store

        // Initialize namespaces from utils
        Object.entries(namespaces).forEach(([prefix, uri]) => {
            this.ns[prefix] = rdf.namespace(uri)
        })

        // Load initial data from cache
        this.loadDataFromCache()
    }

    /**
     * Loads the RDF dataset from cache or initializes an empty one.
     * Stores the result in this.rdfDataset.
     */
    async loadDataFromCache() {
        try {
            const cachedData = localStorage.getItem(RDF_CACHE_KEY)
            if (cachedData) {
                console.log('Loading RDF data from cache...')
                this.rdfDataset = await this.parseFromString(cachedData)
            } else {
                console.log('Initializing empty RDF dataset (no cache found).')
                this.rdfDataset = rdf.dataset()
                // TODO: Optionally load initial data from a SPARQL endpoint here?
                // await this.loadFromEndpoint()
            }
            console.log(`RDF dataset loaded: ${this.rdfDataset.size} quads`)
        } catch (error) {
            console.error('Error loading RDF data from cache:', error)
            // Initialize empty dataset in case of error
            this.rdfDataset = rdf.dataset()
            // Use injected error handler
            this.errorHandler.handle(error, { context: 'RDFService LoadCache', showToUser: false })
        }
    }

    /**
     * Saves the current internal RDF dataset to localStorage.
     */
    saveToCache() {
        if (!this.rdfDataset) return // Nothing to save
        try {
            localStorage.setItem(RDF_CACHE_KEY, this.rdfDataset.toString())
            console.log(`RDF dataset saved to cache: ${this.rdfDataset.size} quads`)
        } catch (error) {
            console.error('Error caching RDF data:', error)
            // Use injected error handler
            this.errorHandler.handle(error, { context: 'RDFService SaveCache', showToUser: true })
        }
    }

    /**
     * Parses an RDF string (Turtle format) into an RDF/JS dataset.
     * @param {string} turtleString - The RDF string in Turtle format.
     * @returns {Promise<DatasetExt>} A promise resolving to the RDF dataset.
     */
    async parseFromString(turtleString) {
        if (!turtleString || typeof turtleString !== 'string' || turtleString.trim() === '') {
            return rdf.dataset() // Return empty dataset for empty input
        }
        try {
            const quads = []
            const parser = this.parser

            return new Promise((resolve, reject) => {
                const stream = parser.import(rdf.stringToStream(turtleString))

                stream.on('data', quad => {
                    quads.push(quad)
                })

                stream.on('error', error => {
                    console.error('RDF parsing error:', error)
                    reject(new RDFError('Failed to parse RDF string', { originalError: error }))
                })

                stream.on('end', () => {
                    resolve(rdf.dataset(quads))
                })
            })
        } catch (error) {
            console.error('Error initializing RDF parser stream:', error)
            throw new RDFError('Failed to initialize RDF parser', { originalError: error })
        }
    }

    // --- Core Data Operations ---

    /**
     * Creates a new post, generates its RDF data using the domain model,
     * adds it to the internal dataset, and saves to cache.
     * @param {Object} postData - The post data (e.g., { type, content, title, tags, ... })
     * @returns {string} The ID of the created post.
     */
    createPost(postData) {
        try {
            // 1. Use Domain Model to create the RDF data for the post
            const { id: postId, dataset: postDataset } = this.domainModel.createPostData(postData)

            // 2. Add the new post's quads to the internal dataset
            // Initialize if dataset somehow becomes null
            if (!this.rdfDataset) this.rdfDataset = rdf.dataset()
            this.rdfDataset.addAll(postDataset)

            // 3. Save the updated dataset to cache
            this.saveToCache()

            console.log(`Post created and added to internal dataset: ${postId}`)
            // NOTE: We are NOT updating the Redux `posts` slice here.
            // If needed, derive the post object and dispatch actions.addPost(postObject) here.

            return postId

        } catch (error) {
            console.error(`Error creating post:`, error)
            const wrappedError = (error instanceof RDFError) ? error :
                new RDFError(`Failed to create post in service: ${error.message}`, {
                    originalError: error,
                    postData
                })
            // Use injected error handler
            this.errorHandler.handle(wrappedError, { context: 'RDFService CreatePost', showToUser: true })
            throw wrappedError // Rethrow after handling
        }
    }

    /**
     * Retrieves posts from the internal RDF dataset based on filter options.
     * @param {Object} options - Filter options (e.g., { type, tag, graph, limit })
     * @returns {Array<Object>} An array of post objects.
     */
    getPosts(options = {}) {
        const dataset = this.rdfDataset // Use internal dataset
        if (!dataset || dataset.size === 0) return []

        const posts = new Map()

        // Define RDF predicates for common properties
        const rdfType = this.ns.rdf('type')
        const squirtContent = this.ns.squirt('content')
        const dcTitle = this.ns.dc('title')
        const dcCreated = this.ns.dc('created')
        const dcModified = this.ns.dc('modified')
        const squirtTag = this.ns.squirt('tag')
        const squirtUrl = this.ns.squirt('url')
        // Add FOAF properties if needed for display
        const foafName = this.ns.foaf ? this.ns.foaf('name') : null
        const foafNick = this.ns.foaf ? this.ns.foaf('nick') : null
        const foafImg = this.ns.foaf ? this.ns.foaf('img') : null

        // Determine target graph for matching (null for default graph)
        const targetGraph = options.graph ? rdf.namedNode(options.graph) : null

        // Initial pass: Find all subjects that are potential posts (have rdf:type)
        dataset.match(null, rdfType, null, targetGraph).forEach(quad => {
            // Extract type from URI, assuming it's the last part
            const typeUri = quad.object.value
            const postType = typeUri.substring(typeUri.lastIndexOf('/') + 1)

            // Apply type filter early if provided
            if (options.type && postType !== options.type) {
                return // Skip this subject if type doesn't match filter
            }

            const postId = quad.subject.value
            const graphId = quad.graph?.value || null // Use null for default graph

            // Initialize post object in map if not already present
            if (!posts.has(postId)) {
                posts.set(postId, {
                    id: postId,
                    type: postType,
                    graph: graphId,
                    tags: [], // Initialize tags array
                    // Initialize other potential fields to null or empty
                    content: null,
                    title: null,
                    created: null,
                    modified: null,
                    url: null,
                    // Initialize FOAF fields
                    foafName: null,
                    foafNick: null,
                    foafImg: null,
                    // Store the subject node for easier subsequent matches
                    _subjectNode: quad.subject
                })
            }
        })

        // Second pass: Populate properties for the identified posts
        posts.forEach((post) => {
            const subjectNode = post._subjectNode // Use stored subject node
            // Match within the correct graph context
            const graphNode = post.graph ? rdf.namedNode(post.graph) : null

            // Helper function to get the first matching object value or null
            const getObjectValue = (predicate) => {
                const match = dataset.match(subjectNode, predicate, null, graphNode).toArray()
                return match.length > 0 ? match[0].object.value : null
            }

            // Populate common properties
            post.content = getObjectValue(squirtContent)
            post.title = getObjectValue(dcTitle)
            post.created = getObjectValue(dcCreated)
            post.modified = getObjectValue(dcModified)
            post.url = getObjectValue(squirtUrl)

            // Populate FOAF properties (check if foaf namespace/predicates exist)
            if (foafName) post.foafName = getObjectValue(foafName)
            if (foafNick) post.foafNick = getObjectValue(foafNick)
            if (foafImg) post.foafImg = getObjectValue(foafImg)

            // Populate tags (can have multiple)
            dataset.match(subjectNode, squirtTag, null, graphNode).forEach(quad => {
                post.tags.push(quad.object.value)
            })

            // Remove the temporary subject node property
            delete post._subjectNode
        })

        // Convert map values to an array
        let postsArray = Array.from(posts.values())

        // Apply tag filter if specified
        if (options.tag && typeof options.tag === 'string') {
            const filterTag = options.tag.trim()
            if (filterTag) {
                postsArray = postsArray.filter(post => post.tags.some(tag => tag === filterTag))
            }
        }

        // Sort by date (modified first, then created)
        postsArray.sort((a, b) => {
            const dateA = a.modified ? new Date(a.modified) : (a.created ? new Date(a.created) : 0)
            const dateB = b.modified ? new Date(b.modified) : (b.created ? new Date(b.created) : 0)
            // Ensure valid dates before comparing; put invalid dates last
            if (isNaN(dateA) && isNaN(dateB)) return 0
            if (isNaN(dateA)) return 1 // a is invalid, put it after b
            if (isNaN(dateB)) return -1 // b is invalid, put it after a
            return dateB - dateA // Sort descending (newest first)
        })

        // Apply limit if specified
        if (options.limit && Number.isInteger(options.limit) && options.limit > 0) {
            postsArray = postsArray.slice(0, options.limit)
        }

        return postsArray
    }

    /**
     * Deletes a post from the internal RDF dataset by its ID.
     * @param {string} postId - The URI (ID) of the post to delete.
     * @returns {boolean} True if the post was found and deleted, false otherwise.
     */
    deletePost(postId) {
        if (!postId || !this.rdfDataset) return false

        try {
            const subjectNode = rdf.namedNode(postId)

            // Find all quads associated with this subject (across all graphs)
            const quadsToRemove = this.rdfDataset.match(subjectNode, null, null, null)

            if (quadsToRemove.size === 0) {
                console.warn(`Attempted to delete non-existent post from internal dataset: ${postId}`)
                return false // Post not found
            }

            // Remove the quads from the internal dataset
            quadsToRemove.forEach(quad => {
                this.rdfDataset.delete(quad)
            })

            // Save updated dataset to cache
            this.saveToCache()

            console.log(`Post deleted from internal dataset: ${postId}, remaining quads: ${this.rdfDataset.size}`)
            // NOTE: We are NOT updating the Redux `posts` slice here.
            // If needed, dispatch actions.removePost(postId) here.

            return true

        } catch (error) {
            // Catch errors like invalid postId URI format
            console.error(`Error deleting post ${postId}:`, error)
            const wrappedError = new RDFError(`Failed to delete post: ${error.message}`, {
                originalError: error,
                postId
            })
            // Use injected error handler
            this.errorHandler.handle(wrappedError, { context: 'RDFService DeletePost', showToUser: true })
            throw wrappedError // Rethrow after handling
        }
    }

    // --- SPARQL Endpoint Interaction ---

    /**
     * Fetches RDF data from the configured SPARQL query endpoint and merges it into the internal dataset.
     * @param {string} [graphUri] - Optional graph URI to fetch.
     * @returns {Promise<void>}
     */
    async loadFromEndpoint(graphUri) {
        // Use injected store
        const currentState = this.store.getState()
        const endpoint = getActiveEndpoint(currentState, 'query') // Use selector

        if (!endpoint || !endpoint.url) {
            const errorMsg = 'SPARQL query endpoint not configured or inactive for loading.'
            console.warn(errorMsg)
            // Use injected error handler
            this.errorHandler.handle(new RDFError(errorMsg), { context: 'RDF LoadFromEndpoint No Endpoint', showToUser: true })
            return // Or throw error?
        }
        const endpointUrl = endpoint.url
        const credentials = endpoint.credentials // Get credentials if they exist

        console.log(`Loading data from SPARQL endpoint: ${endpointUrl} (Graph: ${graphUri || 'Default'})...`)

        try {
            const query = graphUri ? `CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <${graphUri}> { ?s ?p ?o } }` : 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'

            // Use injected query function
            const rdfText = await this.querySparqlFn(endpointUrl, query, 'construct', credentials)

            // Parse the returned RDF text
            const fetchedDataset = await this.parseFromString(rdfText)

            if (fetchedDataset && fetchedDataset.size > 0) {
                if (!this.rdfDataset) this.rdfDataset = rdf.dataset()
                this.rdfDataset.addAll(fetchedDataset) // Merge into internal dataset
                this.saveToCache()
                console.log(`Loaded ${fetchedDataset.size} quads from endpoint into internal dataset.`)
                // NOTE: If Redux `posts` slice needs updating, do it here.
                // const newPostsArray = this.getPosts() // Re-derive posts
                // store.dispatch(actions.setPosts(newPostsArray))
            } else {
                console.log('No data returned from endpoint or failed to parse.')
            }
        } catch (error) {
            console.error('Error loading data from SPARQL endpoint:', error)
            // Error might already be RDFError/SparqlError/NetworkError from querySparql
            const wrappedError = (error instanceof RDFError || error instanceof SparqlError || error instanceof NetworkError) ? error :
                new RDFError('Failed to load data from endpoint', { originalError: error, graphUri, endpointUrl })
            // Use injected error handler
            this.errorHandler.handle(wrappedError, { context: 'RDF LoadFromEndpoint Query/Parse', showToUser: true })
            throw wrappedError
        }
    }

    /**
     * Sends the internal dataset (or specific parts) to the SPARQL update endpoint.
     * Uses a simple CLEAR/INSERT strategy for the specified graph.
     * @param {string} graphUri - Target graph URI for the sync operation. Required.
     * @param {DatasetExt} [datasetToSync] - Optional dataset to sync (defaults to the internal dataset).
     * @returns {Promise<void>}
     */
    async syncWithEndpoint(graphUri, datasetToSync) {
        if (!graphUri) {
            const errorMsg = 'Graph URI must be specified for sync operation.'
            console.error(errorMsg)
            // Use injected error handler
            this.errorHandler.handle(new RDFError(errorMsg), { context: 'RDF Sync No Graph', showToUser: true })
            throw new RDFError(errorMsg)
        }

        // Use injected store
        const currentState = this.store.getState()
        const endpoint = getActiveEndpoint(currentState, 'update') // Use selector for UPDATE endpoint

        if (!endpoint || !endpoint.url) {
            const errorMsg = 'SPARQL update endpoint not configured or inactive for syncing.'
            console.warn(errorMsg)
            // Use injected error handler
            this.errorHandler.handle(new RDFError(errorMsg), { context: 'RDF Sync No Endpoint', showToUser: true })
            // Decide whether to throw or just return, depending on desired behavior
            return // Don't throw, allow local saves to proceed?
        }
        const endpointUrl = endpoint.url
        const credentials = endpoint.credentials // Get credentials

        const dataset = datasetToSync || this.rdfDataset
        if (!dataset || dataset.size === 0) {
            console.log('No data to sync.')
            return
        }

        console.log(`Syncing data with SPARQL endpoint: ${endpointUrl} (Graph: ${graphUri})...`)

        try {
            // Simple CLEAR GRAPH / INSERT DATA strategy
            const turtleData = dataset.toString() // Serialize to Turtle
            // Ensure turtleData doesn't contain characters that break SPARQL syntax
            // A more robust solution would use a proper SPARQL update builder or serializer
            const updateQuery = `CLEAR SILENT GRAPH <${graphUri}>; INSERT DATA { GRAPH <${graphUri}> { ${turtleData} } }`

            // Use injected update function
            await this.postToSparqlFn(endpointUrl, updateQuery, credentials)
            console.log(`Successfully synced ${dataset.size} quads to endpoint (Graph: ${graphUri})`)

        } catch (error) {
            console.error('Error syncing data with SPARQL endpoint:', error)
            // Error might already be SparqlError/NetworkError from postToSparql
            const wrappedError = (error instanceof SparqlError || error instanceof NetworkError) ? error :
                new RDFError('Failed to sync data with endpoint', { originalError: error, graphUri, endpointUrl })
            // Use injected error handler
            this.errorHandler.handle(wrappedError, { context: 'RDF Sync Query', showToUser: true })
            throw wrappedError
        }
    }
}

// Export a singleton instance (common pattern for services)
export const rdfService = new RDFService(store, errorHandler, querySparql, postToSparql) 