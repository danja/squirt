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
     * @param {Object} postData - Post data
     * @returns {Object} - Post ID and dataset
     */
    createPostData(postData) {
        try {
            const dataset = rdf.dataset()

            // Generate ID if not provided
            const postId = postData.customId || this.generatePostId(postData)
            const subject = rdf.namedNode(postId)

            // Handle graph if provided
            const graph = postData.graph ?
                rdf.namedNode(postData.graph) :
                null

            // Helper function to add quads
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

            // Add title if available
            if (postData.title) {
                addQuad(
                    subject,
                    this.ns.dc('title'),
                    rdf.literal(postData.title)
                )
            }

            // Add tags if available
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

            // Add last modified date for wiki posts
            if (postData.type === 'wiki') {
                addQuad(
                    subject,
                    this.ns.dc('modified'),
                    rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                )
            }

            // Add profile specific properties
            if (postData.type === 'profile') {
                // Use FOAF namespace
                const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/')

                // Add profile type
                addQuad(
                    subject,
                    this.ns.rdf('type'),
                    foaf('Person')
                )

                // Add profile properties
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

                // Add account information
                if (postData.foafAccounts && Array.isArray(postData.foafAccounts)) {
                    postData.foafAccounts.forEach(account => {
                        if (account) {
                            // Create blank node for account
                            const accountNode = rdf.blankNode()

                            // Link account to person
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
     * Generate a post ID
     * @param {Object} postData - Post data
     * @returns {string} - Generated post ID
     */
    generatePostId(postData) {
        const content = postData.title || postData.content || postData.url || ''
        const date = new Date().toISOString().split('T')[0]
        const hash = this.hashContent(content)

        return `http://purl.org/stuff/squirt/post_${date}_${hash}`
    }

    /**
     * Generate a hash from content
     * @param {string} content - Content to hash
     * @returns {string} - Hash string
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

// Create a singleton instance
export const rdfModel = new RDFModel()