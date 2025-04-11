// src/domain/rdf/model.js - Updated with getPosts method
import rdf from 'rdf-ext'
import { RDFError } from '../../core/errors/error-types.js'
import { namespaces } from '../../utils/namespaces.js'

export class RDFModel {
    constructor() {
        this.ns = {}

        // Initialize namespaces
        Object.entries(namespaces).forEach(([prefix, uri]) => {
            this.ns[prefix] = rdf.namespace(uri)
        })
    }

    /**
     * Create RDF data for a post
     * @param {Object} postData - Post data to create
     * @returns {Object} Created post data with dataset and ID
     */
    createPostData(postData) {
        try {
            const dataset = rdf.dataset()

            // Generate or use custom ID
            const postId = postData.customId || this.generatePostId(postData)
            const subject = rdf.namedNode(postId)

            // Get optional graph
            const graph = postData.graph ?
                rdf.namedNode(postData.graph) :
                null

            // Helper to add quads to dataset
            const addQuad = (s, p, o) => {
                if (graph) {
                    dataset.add(rdf.quad(s, p, o, graph))
                } else {
                    dataset.add(rdf.quad(s, p, o))
                }
            }

            // Add type
            addQuad(
                subject,
                this.ns.rdf('type'),
                this.ns.squirt(postData.type)
            )

            // Add content
            addQuad(
                subject,
                this.ns.squirt('content'),
                rdf.literal(postData.content)
            )

            // Add creation date
            addQuad(
                subject,
                this.ns.dc('created'),
                rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
            )

            // Add title if provided
            if (postData.title) {
                addQuad(
                    subject,
                    this.ns.dc('title'),
                    rdf.literal(postData.title)
                )
            }

            // Add tags if provided
            if (postData.tags && Array.isArray(postData.tags)) {
                postData.tags.forEach(tag => {
                    addQuad(
                        subject,
                        this.ns.squirt('tag'),
                        rdf.literal(tag)
                    )
                })
            }

            // Add URL for link type
            if (postData.type === 'link' && postData.url) {
                addQuad(
                    subject,
                    this.ns.squirt('url'),
                    rdf.namedNode(postData.url)
                )
            }

            // Add modified date for wiki type
            if (postData.type === 'wiki') {
                addQuad(
                    subject,
                    this.ns.dc('modified'),
                    rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                )
            }

            // Add FOAF properties for profile type
            if (postData.type === 'profile') {
                // Use FOAF namespace
                const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/')

                // Add profile type
                addQuad(
                    subject,
                    this.ns.rdf('type'),
                    foaf('Person')
                )

                // Add name if provided
                if (postData.foafName) {
                    addQuad(
                        subject,
                        foaf('name'),
                        rdf.literal(postData.foafName)
                    )
                }

                if (postData.foafNick) {
                    addQuad(
                        subject,
                        foaf('nick'),
                        rdf.literal(postData.foafNick)
                    )
                }

                if (postData.foafMbox) {
                    addQuad(
                        subject,
                        foaf('mbox'),
                        rdf.namedNode(postData.foafMbox)
                    )
                }

                if (postData.foafHomepage) {
                    addQuad(
                        subject,
                        foaf('homepage'),
                        rdf.namedNode(postData.foafHomepage)
                    )
                }

                if (postData.foafImg) {
                    addQuad(
                        subject,
                        foaf('img'),
                        rdf.namedNode(postData.foafImg)
                    )
                }

                // Add accounts if provided
                if (postData.foafAccounts && Array.isArray(postData.foafAccounts)) {
                    postData.foafAccounts.forEach(account => {
                        if (account) {
                            // Create blank node for account
                            const accountNode = rdf.blankNode()

                            // Link person to account
                            addQuad(
                                subject,
                                foaf('account'),
                                accountNode
                            )

                            // Add account service
                            addQuad(
                                accountNode,
                                foaf('accountServiceHomepage'),
                                rdf.namedNode(account)
                            )
                        }
                    })
                }
            }

            return {
                id: postId,
                dataset,
                ...postData
            }
        } catch (error) {
            throw new RDFError(`Failed to create post data: ${error.message}`, {
                originalError: error,
                postData
            })
        }
    }

    /**
     * Create a post and add it to the dataset
     * @param {Object} postData - Post data
     * @returns {string} ID of the created post
     */
    createPost(postData) {
        // Get the current dataset
        const dataset = this.dataset || rdf.dataset()

        // Generate post ID
        const postId = postData.customId || this.generatePostId(postData)
        const subject = rdf.namedNode(postId)

        // Get optional graph
        const graph = postData.graph ?
            rdf.namedNode(postData.graph) :
            null

        // Helper to add quads to dataset
        const addQuad = (s, p, o) => {
            if (graph) {
                dataset.add(rdf.quad(s, p, o, graph))
            } else {
                dataset.add(rdf.quad(s, p, o))
            }
        }

        // Add type
        addQuad(
            subject,
            this.ns.rdf('type'),
            this.ns.squirt(postData.type)
        )

        // Add content
        addQuad(
            subject,
            this.ns.squirt('content'),
            rdf.literal(postData.content)
        )

        // Add creation date
        addQuad(
            subject,
            this.ns.dc('created'),
            rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
        )

        // Add title if provided
        if (postData.title) {
            addQuad(
                subject,
                this.ns.dc('title'),
                rdf.literal(postData.title)
            )
        }

        // Add tags if provided
        if (postData.tags && Array.isArray(postData.tags)) {
            postData.tags.forEach(tag => {
                addQuad(
                    subject,
                    this.ns.squirt('tag'),
                    rdf.literal(tag)
                )
            })
        }

        // Add URL for link type
        if (postData.type === 'link' && postData.url) {
            addQuad(
                subject,
                this.ns.squirt('url'),
                rdf.namedNode(postData.url)
            )
        }

        // Add modified date for wiki type
        if (postData.type === 'wiki') {
            addQuad(
                subject,
                this.ns.dc('modified'),
                rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
            )
        }

        // Update the dataset
        this.dataset = dataset

        return postId
    }

    /**
     * Get posts from the dataset with optional filtering
     * @param {Object} options - Filter options
     * @param {string} options.type - Filter by post type
     * @param {string} options.tag - Filter by tag
     * @param {string} options.graph - Filter by graph
     * @param {number} options.limit - Maximum number of posts to return
     * @returns {Array} Filtered posts
     */
    getPosts(options = {}) {
        const dataset = this.dataset || rdf.dataset()
        if (!dataset) return []

        const posts = new Map()

        // Find post type triples
        const postTypePattern = this.ns.rdf('type')

        // Set up match options for graph filtering
        const matchOptions = {}
        if (options.graph) {
            matchOptions.graph = rdf.namedNode(options.graph)
        }

        // Get all subjects with an rdf:type
        dataset.match(null, postTypePattern, null, options.graph ? rdf.namedNode(options.graph) : null).forEach(quad => {
            const postType = quad.object.value.split('/').pop()

            // Skip if filtering by type and not matching
            if (options.type && postType !== options.type) return

            const postId = quad.subject.value
            const graphId = quad.graph?.value || null

            if (!posts.has(postId)) {
                posts.set(postId, {
                    id: postId,
                    type: postType,
                    graph: graphId,
                    tags: []
                })
            }
        })

        // Populate post properties
        posts.forEach((post, id) => {
            const subject = rdf.namedNode(id)
            const graph = post.graph ? rdf.namedNode(post.graph) : null

            // Get content
            dataset.match(subject, this.ns.squirt('content'), null, graph).forEach(quad => {
                post.content = quad.object.value
            })

            // Get title
            dataset.match(subject, this.ns.dc('title'), null, graph).forEach(quad => {
                post.title = quad.object.value
            })

            // Get created date
            dataset.match(subject, this.ns.dc('created'), null, graph).forEach(quad => {
                post.created = quad.object.value
            })

            // Get modified date
            dataset.match(subject, this.ns.dc('modified'), null, graph).forEach(quad => {
                post.modified = quad.object.value
            })

            // Get tags
            dataset.match(subject, this.ns.squirt('tag'), null, graph).forEach(quad => {
                post.tags.push(quad.object.value)
            })

            // Get URL for link type
            dataset.match(subject, this.ns.squirt('url'), null, graph).forEach(quad => {
                post.url = quad.object.value
            })
        })

        // Filter by tag if specified
        if (options.tag) {
            posts = new Map(
                Array.from(posts.entries()).filter(([_, post]) =>
                    post.tags.includes(options.tag)
                )
            )
        }


        // Convert to array and sort by date (most recent first)
        let postsArray = Array.from(posts.values())
            .sort((a, b) => {
                const dateA = a.modified ? new Date(a.modified) : new Date(a.created)
                const dateB = b.modified ? new Date(b.modified) : new Date(b.created)
                return dateB - dateA
            })

        // Apply limit if specified
        if (options.limit && options.limit > 0) {
            postsArray = postsArray.slice(0, options.limit)
        }

        return postsArray
    }

    /**
     * Get a single post by ID
     * @param {string} id - Post ID
     * @returns {Object|null} Post or null if not found
     */
    getPost(id) {
        const posts = this.getPosts()
        return posts.find(post => post.id === id) || null
    }

    /**
     * Delete a post from the dataset
     * @param {string} postId - ID of post to delete
     * @returns {boolean} Success
     */
    deletePost(postId) {
        const dataset = this.dataset || rdf.dataset()
        if (!dataset) return false

        const subject = rdf.namedNode(postId)

        // Find all quads for this subject
        const quadsToRemove = dataset.match(subject)

        if (quadsToRemove.size === 0) return false

        // Remove all quads
        quadsToRemove.forEach(quad => {
            dataset.delete(quad)
        })

        // Update dataset
        this.dataset = dataset

        return true
    }

    /**
     * Generate a post ID from content
     * @param {Object} postData - Post data
     * @returns {string} Generated ID
     */
    generatePostId(postData) {
        const content = postData.title || postData.content || postData.url || ''
        const date = new Date().toISOString().split('T')[0]
        const hash = this.hashContent(content)

        return `http://purl.org/stuff/squirt/post_${date}_${hash}`
    }

    /**
     * Generate a hash for the content
     * @param {string} content - Content to hash
     * @returns {string} Hash string
     */
    hashContent(content) {
        return Array.from(content)
            .reduce((hash, char) => {
                return ((hash << 5) - hash) + char.charCodeAt(0) | 0
            }, 0)
            .toString(16)
            .slice(0, 8)
    }

    /**
     * Sync dataset with SPARQL endpoint
     * @returns {Promise} Promise resolving when sync is complete
     */
    async syncWithEndpoint() {
        // This method would be implemented to send data to a SPARQL endpoint
        console.log('Syncing with endpoint - implementation pending')
        // For now, just return a resolved promise
        return Promise.resolve()
    }
}

// Create and export instance
export const rdfModel = new RDFModel()