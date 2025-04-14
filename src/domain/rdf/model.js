// src/domain/rdf/model.js - Refactored as pure domain model
import rdf from 'rdf-ext'
import { RDFError } from '../../core/errors/error-types.js'
import { namespaces, generateNid } from '../../utils/utils.js' // Assuming generateNid is here

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
            // Use generateNid from utils instead of a local method
            const postId = postData.customId || generateNid(postData.content || '')
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

            // Add type based on postData.type, default to 'entry' if not specified
            const postType = postData.type || 'entry'
            addQuad(
                subject,
                this.ns.rdf('type'),
                this.ns.squirt(postType) // Use determined postType
            )

            // Add content if present
            if (postData.content) {
                addQuad(
                    subject,
                    this.ns.squirt('content'),
                    rdf.literal(postData.content)
                )
            }

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
                    if (tag && typeof tag === 'string' && tag.trim().length > 0) { // Ensure tag is valid
                        addQuad(
                            subject,
                            this.ns.squirt('tag'),
                            rdf.literal(tag.trim()) // Trim whitespace
                        )
                    }
                })
            }

            // Add URL for link type
            if (postType === 'link' && postData.url) {
                try {
                    const urlNode = rdf.namedNode(postData.url) // Validate URL format
                    addQuad(
                        subject,
                        this.ns.squirt('url'),
                        urlNode
                    )
                } catch (urlError) {
                    console.warn(`Invalid URL provided for link post ${postId}: ${postData.url}`)
                    // Optionally throw an error or handle it differently
                    throw new RDFError(`Invalid URL format for link post: ${postData.url}`, { originalError: urlError, postData })
                }
            }

            // Add modified date for wiki type
            if (postType === 'wiki') {
                addQuad(
                    subject,
                    this.ns.dc('modified'),
                    rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                )
            }

            // Add FOAF properties for profile type
            if (postType === 'profile') {
                // Ensure FOAF namespace exists
                const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/')

                // Add profile type explicitly if not already added (though squirt:profile might suffice)
                // addQuad(subject, this.ns.rdf('type'), foaf('Person')); // Decide if this is redundant

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
                    try {
                        const mboxNode = rdf.namedNode(postData.foafMbox) // Often mailto: URI
                        addQuad(subject, foaf('mbox'), mboxNode)
                    } catch (mboxError) {
                        console.warn(`Invalid mbox URI provided for profile ${postId}: ${postData.foafMbox}`)
                        throw new RDFError(`Invalid mbox URI format for profile: ${postData.foafMbox}`, { originalError: mboxError, postData })
                    }
                }

                if (postData.foafHomepage) {
                    try {
                        const homepageNode = rdf.namedNode(postData.foafHomepage)
                        addQuad(subject, foaf('homepage'), homepageNode)
                    } catch (homepageError) {
                        console.warn(`Invalid homepage URL provided for profile ${postId}: ${postData.foafHomepage}`)
                        throw new RDFError(`Invalid homepage URL format for profile: ${postData.foafHomepage}`, { originalError: homepageError, postData })
                    }
                }

                if (postData.foafImg) {
                    try {
                        const imgNode = rdf.namedNode(postData.foafImg)
                        addQuad(subject, foaf('img'), imgNode)
                    } catch (imgError) {
                        console.warn(`Invalid image URL provided for profile ${postId}: ${postData.foafImg}`)
                        throw new RDFError(`Invalid image URL format for profile: ${postData.foafImg}`, { originalError: imgError, postData })
                    }
                }

                // Add accounts if provided
                if (postData.foafAccounts && Array.isArray(postData.foafAccounts)) {
                    postData.foafAccounts.forEach(account => {
                        // Check if account data is usable (e.g., expects an object with serviceHomepage and maybe accountName)
                        if (account && account.serviceHomepage) {
                            try {
                                // Create blank node for account details
                                const accountNode = rdf.blankNode()

                                // Link person to account
                                addQuad(subject, foaf('account'), accountNode)

                                // Add account service homepage (required by FOAF spec)
                                addQuad(
                                    accountNode,
                                    foaf('accountServiceHomepage'),
                                    rdf.namedNode(account.serviceHomepage)
                                )

                                // Add account name (optional)
                                if (account.accountName) {
                                    addQuad(
                                        accountNode,
                                        foaf('accountName'), // Typically the username or profile identifier
                                        rdf.literal(account.accountName)
                                    )
                                }
                            } catch (accountError) {
                                console.warn(`Invalid account data provided for profile ${postId}:`, account)
                                // Decide whether to skip this account or throw
                            }
                        }
                    })
                }
            }

            // Include any other custom properties provided in postData
            for (const key in postData) {
                if (Object.hasOwnProperty.call(postData, key)) {
                    // Avoid reprocessing known properties
                    const knownProps = ['customId', 'graph', 'type', 'content', 'title', 'tags', 'url',
                        'foafName', 'foafNick', 'foafMbox', 'foafHomepage', 'foafImg', 'foafAccounts']
                    if (!knownProps.includes(key) && postData[key] !== undefined && postData[key] !== null) {
                        // Attempt to add as a squirt property, assuming value is literal unless it looks like a URI
                        const value = postData[key]
                        let objectNode
                        // Basic check if value looks like a URI - refine as needed
                        if (typeof value === 'string' && (value.startsWith('http:') || value.startsWith('https:') || value.startsWith('urn:'))) {
                            try {
                                objectNode = rdf.namedNode(value)
                            } catch (uriError) {
                                console.warn(`Could not create named node for custom property ${key} with value ${value}. Treating as literal.`)
                                objectNode = rdf.literal(value.toString()) // Fallback to literal
                            }
                        } else {
                            // Default to literal for numbers, booleans, strings, etc.
                            objectNode = rdf.literal(value.toString()) // Ensure value is stringified if not already
                        }
                        addQuad(subject, this.ns.squirt(key), objectNode)
                    }
                }
            }


            return {
                id: postId,
                dataset, // The generated RDF dataset for this post
                subject: subject, // The main subject node for convenience
                graph: graph, // The named graph used, if any
                originalData: postData // Keep original data for reference if needed
            }
        } catch (error) {
            // Ensure errors are wrapped in RDFError for consistency
            if (error instanceof RDFError) {
                throw error // Re-throw if already specific type
            }
            throw new RDFError(`Failed to create post data: ${error.message}`, {
                originalError: error,
                postData
            })
        }
    }

    // Removed createPost, getPosts, getPost, deletePost, syncWithEndpoint
    // Keep utility methods if they are purely functional and needed by createPostData or externally

    /**
     * Generates a unique post ID. Moved to utils/utils.js as generateNid.
     * Kept here for reference during refactoring, should be removed later.
     */
    // generatePostId(postData) { ... } // Remove this

    /**
     * Hashes content. Potentially useful, but might belong in utils.
     * Keep for now if used by generateNid or similar, otherwise move/remove.
     */
    // hashContent(content) { ... } // Keep or move to utils if needed
}

// Example Usage (for testing or illustration - remove in final version)
/*
const model = new RDFModel();
const post = {
    type: 'link',
    content: 'Check out this RDF library',
    title: 'rdf-ext',
    url: 'https://github.com/rdf-ext/rdf-ext',
    tags: ['rdf', 'javascript', ' linked data '], // Test tag trimming
    customProp: 'some value',
    customUriProp: 'http://example.org/custom'
};

try {
    const { id, dataset, subject } = model.createPostData(post);
    console.log('Generated Post ID:', id);
    console.log('Generated Subject:', subject.value);
    console.log('Generated Dataset:\n', dataset.toString());

    const profile = {
        type: 'profile',
        customId: 'urn:uuid:1234-abcd',
        foafName: 'Alice',
        foafNick: 'Ally',
        foafMbox: 'mailto:alice@example.com',
        foafHomepage: 'http://alice.example.com',
        foafImg: 'http://alice.example.com/img.jpg',
        foafAccounts: [
            { serviceHomepage: 'https://github.com', accountName: 'alice_gh' },
            { serviceHomepage: 'https://twitter.com', accountName: 'alice_tw' }, // Corrected structure
            { serviceHomepage: 'invalid-url' } // Test invalid account data
        ]
    }
    const profileData = model.createPostData(profile);
    console.log('\nGenerated Profile Dataset:\n', profileData.dataset.toString());

} catch (error) {
    console.error('Error creating post data:', error.message);
    if (error.details) {
        console.error('Details:', error.details);
    }
}
*/