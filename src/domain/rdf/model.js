import rdf from 'rdf-ext'
import { RDFError }

// Create a singleton instance
export const rdfModel = new RDFModel(); from '../../core/errors/error-types.js'
import { namespaces } from '../../utils/namespaces.js'

/**
 * RDF Model for handling data in RDF format
 */
export class RDFModel {
    constructor() {
        this.ns = {}

        // Initialize namespaces
        Object.entries(namespaces).forEach(([prefix, uri]) => {
            this.ns[prefix] = rdf.namespace(uri)
        })
    }

    /**
     * Create RDF data structure for a post
     * @param {Object} postData - Post data
     * @returns {Object} Post data with RDF dataset
     */
    createPostData(postData) {
        try {
            const dataset = rdf.dataset()

            // Generate or use custom ID
            const postId = postData.customId || this.generatePostId(postData)
            const subject = rdf.namedNode(postId)

            // Handle named graph if provided
            const graph = postData.graph ?
                rdf.namedNode(postData.graph) :
                null

            // Helper function for adding quads
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

            // Add title if present
            if (postData.title) {
                addQuad(
                    subject,
                    this.ns.dc('title'),
                    rdf.literal(postData.title)
                )
            }

            // Add tags if present
            if (postData.tags && Array.isArray(postData.tags)) {
                postData.tags.forEach(tag => {
                    addQuad(
                        subject,
                        this.ns.squirt('tag'),
                        rdf.literal(tag)
                    )
                })
            }

            // Add URL for link posts
            if (postData.type === 'link' && postData.url) {
                addQuad(
                    subject,
                    this.ns.squirt('url'),
                    rdf.namedNode(postData.url)
                )
            }

            // Add modified date for wiki posts
            if (postData.type === 'wiki') {
                addQuad(
                    subject,
                    this.ns.dc('modified'),
                    rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                )
            }

            // Add FOAF data for profile
            if (postData.type === 'profile') {
                // Initialize FOAF namespace if needed
                const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/')

                // Add FOAF person type
                addQuad(
                    subject,
                    this.ns.rdf('type'),
                    foaf('Person')
                )

                // Add name if present
                if (postData.foafName) {
                    addQuad(
                        subject,
                        foaf('name'),
                        rdf.literal(postData.foafName)
                    )
                }

                // Add nickname if present
                if (postData.foafNick) {
                    addQuad(
                        subject,
                        foaf('nick'),
                        rdf.literal(postData.foafNick)
                    )
                }

                // Add email if present
                if (postData.foafMbox) {
                    addQuad(
                        subject,
                        foaf('mbox'),
                        rdf.namedNode(postData.foafMbox)
                    )
                }

                // Add homepage if present
                if (postData.foafHomepage) {
                    addQuad(
                        subject,
                        foaf('homepage'),
                        rdf.namedNode(postData.foafHomepage)
                    )
                }

                // Add image if present
                if (postData.foafImg) {
                    addQuad(
                        subject,
                        foaf('img'),
                        rdf.namedNode(postData.foafImg)
                    )
                }

                // Add accounts if present
                if (postData.foafAccounts && Array.isArray(postData.foafAccounts)) {
                    postData.foafAccounts.forEach(account => {
                        if (account) {
                            // Create a blank node for each account
                            const accountNode = rdf.blankNode()

                            // Link person to account
                            addQuad(
                                subject,
                                foaf('account'),
                                accountNode
                            )

                            // Link account to service homepage
                            addQuad(
                                accountNode,
                                foaf('accountServiceHomepage'),
                                rdf.namedNode(account)
                            )
                        }
                    })
                }
            }

            // Special handling for chat messages
            if (postData.type === 'chat') {
                // Add timestamp if not already provided
                if (!postData.timestamp) {
                    addQuad(
                        subject,
                        this.ns.dc('date'),
                        rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                    )
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
     * Extract posts from an RDF dataset
     * @param {Object} dataset - RDF dataset
     * @param {Object} options - Options for filtering
     * @returns {Array} Array of post objects
     */
    extractPosts(dataset, options = {}) {
        try {
            if (!dataset) return []

            let posts = new Map()

            // Find all resources with a type
            const postTypePattern = this.ns.rdf('type')

            // Handle graph filtering
            const matchOptions = {}
            if (options.graph) {
                matchOptions.graph = rdf.namedNode(options.graph)
            }

            // Extract all subjects with a type, identify post types
            dataset.match(null, postTypePattern, null, options.graph ? rdf.namedNode(options.graph) : null).forEach(quad => {
                const postType = quad.object.value.split('/').pop()

                // Filter by type if specified
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

            // Extract properties for each post
            posts.forEach((post, id) => {
                const subject = rdf.namedNode(id)
                const graph = post.graph ? rdf.namedNode(post.graph) : null

                // Extract content
                dataset.match(subject, this.ns.squirt('content'), null, graph).forEach(quad => {
                    post.content = quad.object.value
                })

                // Extract title
                dataset.match(subject, this.ns.dc('title'), null, graph).forEach(quad => {
                    post.title = quad.object.value
                })

                // Extract created date
                dataset.match(subject, this.ns.dc('created'), null, graph).forEach(quad => {
                    post.created = quad.object.value
                })

                // Extract modified date
                dataset.match(subject, this.ns.dc('modified'), null, graph).forEach(quad => {
                    post.modified = quad.object.value
                })

                // Extract tags
                dataset.match(subject, this.ns.squirt('tag'), null, graph).forEach(quad => {
                    post.tags.push(quad.object.value)
                })

                // Extract URL for links
                dataset.match(subject, this.ns.squirt('url'), null, graph).forEach(quad => {
                    post.url = quad.object.value
                })

                // Extract FOAF data for profiles
                if (post.type === 'profile') {
                    const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/')

                    dataset.match(subject, foaf('name'), null, graph).forEach(quad => {
                        post.foafName = quad.object.value
                    })

                    dataset.match(subject, foaf('nick'), null, graph).forEach(quad => {
                        post.foafNick = quad.object.value
                    })

                    dataset.match(subject, foaf('mbox'), null, graph).forEach(quad => {
                        post.foafMbox = quad.object.value
                    })

                    dataset.match(subject, foaf('homepage'), null, graph).forEach(quad => {
                        post.foafHomepage = quad.object.value
                    })

                    dataset.match(subject, foaf('img'), null, graph).forEach(quad => {
                        post.foafImg = quad.object.value
                    })

                    // Extract accounts
                    post.foafAccounts = []
                    dataset.match(subject, foaf('account'), null, graph).forEach(accountQuad => {
                        const accountNode = accountQuad.object
                        dataset.match(accountNode, foaf('accountServiceHomepage'), null, graph).forEach(serviceQuad => {
                            post.foafAccounts.push(serviceQuad.object.value)
                        })
                    })
                }
            })

            // Filter by tag if specified
            if (options.tag) {
                posts = new Map(
                    Array.from(posts.entries()).filter(([_, post]) =>
                        post.tags.includes(options.tag)
                    )
                )
            }

            // Convert to array and sort by date
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
        } catch (error) {
            throw new RDFError(`Failed to extract posts: ${error.message}`, {
                originalError: error,
                options
            })
        }
    }

    /**
     * Get a specific post by ID
     * @param {string} postId - Post ID
     * @returns {Object|null} Post object or null if not found
     */
    getPost(postId) {
        try {
            const dataset = this.dataset
            if (!dataset) return null

            const subject = rdf.namedNode(postId)

            // Find all quads with this subject
            const quads = dataset.match(subject)

            if (quads.size === 0) {
                return null
            }

            // Create a temporary dataset with just these quads
            const tempDataset = rdf.dataset(quads)

            // Extract the post from this dataset
            const posts = this.extractPosts(tempDataset)

            return posts.length > 0 ? posts[0] : null
        } catch (error) {
            throw new RDFError(`Failed to get post: ${error.message}`, {
                originalError: error,
                postId
            })
        }
    }

    /**
     * Create a new post and add it to the dataset
     * @param {Object} postData - Post data
     * @returns {string} Post ID
     */
    createPost(postData) {
        try {
            const postInfo = this.createPostData(postData)

            // Add to existing dataset or create new one
            if (this.dataset) {
                postInfo.dataset.forEach(quad => {
                    this.dataset.add(quad)
                })
            } else {
                this.dataset = postInfo.dataset
            }

            return postInfo.id
        } catch (error) {
            throw new RDFError(`Failed to create post: ${error.message}`, {
                originalError: error,
                postData
            })
        }
    }

    /**
     * Delete a post from the dataset
     * @param {string} postId - Post ID
     * @returns {boolean} True if successful
     */
    deletePost(postId) {
        try {
            if (!this.dataset) return false

            const subject = rdf.namedNode(postId)

            // Find all quads with this subject
            const quadsToRemove = this.dataset.match(subject)

            if (quadsToRemove.size === 0) {
                return false
            }

            // Remove each quad
            quadsToRemove.forEach(quad => {
                this.dataset.delete(quad)
            })

            return true
        } catch (error) {
            throw new RDFError(`Failed to delete post: ${error.message}`, {
                originalError: error,
                postId
            })
        }
    }

    /**
     * Get posts with optional filtering
     * @param {Object} options - Filtering options
     * @returns {Array} Array of post objects
     */
    getPosts(options = {}) {
        try {
            return this.extractPosts(this.dataset, options)
        } catch (error) {
            throw new RDFError(`Failed to get posts: ${error.message}`, {
                originalError: error,
                options
            })
        }
    }

    /**
     * Sync dataset with SPARQL endpoint
     * @returns {Promise<boolean>} True if successful
     */
    async syncWithEndpoint() {
        try {
            // This would be implemented to send the dataset to a SPARQL endpoint
            // For now, it's a placeholder
            return true
        } catch (error) {
            throw new RDFError(`Failed to sync with endpoint: ${error.message}`, {
                originalError: error
            })
        }
    }

    /**
     * Generate a unique ID for a post
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
     * Create a hash from content
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
}