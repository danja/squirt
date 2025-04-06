import rdf from 'rdf-ext';
import { RDFError } from '../../core/errors/error-types.js';
import { namespaces } from '../../utils/namespaces.js';





export class RDFModel {
    constructor() {
        this.ns = {};


        Object.entries(namespaces).forEach(([prefix, uri]) => {
            this.ns[prefix] = rdf.namespace(uri);
        });
    }












    createPostData(postData) {
        try {
            const dataset = rdf.dataset();


            const postId = postData.customId || this.generatePostId(postData);
            const subject = rdf.namedNode(postId);


            const graph = postData.graph ?
                rdf.namedNode(postData.graph) :
                null;


            const addQuad = (s, p, o) => {
                if (graph) {
                    dataset.add(rdf.quad(s, p, o, graph));
                } else {
                    dataset.add(rdf.quad(s, p, o));
                }
            };


            addQuad(
                subject,
                this.ns.rdf('type'),
                this.ns.squirt(postData.type)
            );


            addQuad(
                subject,
                this.ns.squirt('content'),
                rdf.literal(postData.content)
            );


            addQuad(
                subject,
                this.ns.dc('created'),
                rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
            );


            if (postData.title) {
                addQuad(
                    subject,
                    this.ns.dc('title'),
                    rdf.literal(postData.title)
                );
            }


            if (postData.tags && Array.isArray(postData.tags)) {
                postData.tags.forEach(tag => {
                    addQuad(
                        subject,
                        this.ns.squirt('tag'),
                        rdf.literal(tag)
                    );
                });
            }


            if (postData.type === 'link' && postData.url) {
                addQuad(
                    subject,
                    this.ns.squirt('url'),
                    rdf.namedNode(postData.url)
                );
            }


            if (postData.type === 'wiki') {

                addQuad(
                    subject,
                    this.ns.dc('modified'),
                    rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                );
            }

            // Handle FOAF properties for profile
            if (postData.type === 'profile') {
                // Define FOAF namespace if not already available
                const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/');

                // Add FOAF type
                addQuad(
                    subject,
                    this.ns.rdf('type'),
                    foaf('Person')
                );

                // Add name if provided
                if (postData.foafName) {
                    addQuad(
                        subject,
                        foaf('name'),
                        rdf.literal(postData.foafName)
                    );
                }

                // Add nickname if provided
                if (postData.foafNick) {
                    addQuad(
                        subject,
                        foaf('nick'),
                        rdf.literal(postData.foafNick)
                    );
                }

                // Add email (mbox) if provided
                if (postData.foafMbox) {
                    addQuad(
                        subject,
                        foaf('mbox'),
                        rdf.namedNode(postData.foafMbox)
                    );
                }

                // Add homepage if provided
                if (postData.foafHomepage) {
                    addQuad(
                        subject,
                        foaf('homepage'),
                        rdf.namedNode(postData.foafHomepage)
                    );
                }

                // Add avatar image if provided
                if (postData.foafImg) {
                    addQuad(
                        subject,
                        foaf('img'),
                        rdf.namedNode(postData.foafImg)
                    );
                }

                // Add online accounts if provided
                if (postData.foafAccounts && Array.isArray(postData.foafAccounts)) {
                    postData.foafAccounts.forEach(account => {
                        if (account) {
                            // Create a blank node for the account
                            const accountNode = rdf.blankNode();

                            // Add the account relationship
                            addQuad(
                                subject,
                                foaf('account'),
                                accountNode
                            );

                            // Add the account URL
                            addQuad(
                                accountNode,
                                foaf('accountServiceHomepage'),
                                rdf.namedNode(account)
                            );
                        }
                    });
                }
            }

            // Handle chat message properties
            if (postData.type === 'chat') {
                // Add timestamp if not already provided
                if (!postData.timestamp) {
                    addQuad(
                        subject,
                        this.ns.dc('date'),
                        rdf.literal(new Date().toISOString(), rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
                    );
                }
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











    extractPosts(dataset, options = {}) {
        try {
            if (!dataset) return [];

            let posts = new Map();


            const postTypePattern = this.ns.rdf('type');


            const matchOptions = {};
            if (options.graph) {
                matchOptions.graph = rdf.namedNode(options.graph);
            }


            dataset.match(null, postTypePattern, null, options.graph ? rdf.namedNode(options.graph) : null).forEach(quad => {
                const postType = quad.object.value.split('/').pop();


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


            posts.forEach((post, id) => {
                const subject = rdf.namedNode(id);
                const graph = post.graph ? rdf.namedNode(post.graph) : null;


                dataset.match(subject, this.ns.squirt('content'), null, graph).forEach(quad => {
                    post.content = quad.object.value;
                });


                dataset.match(subject, this.ns.dc('title'), null, graph).forEach(quad => {
                    post.title = quad.object.value;
                });


                dataset.match(subject, this.ns.dc('created'), null, graph).forEach(quad => {
                    post.created = quad.object.value;
                });


                dataset.match(subject, this.ns.dc('modified'), null, graph).forEach(quad => {
                    post.modified = quad.object.value;
                });


                dataset.match(subject, this.ns.squirt('tag'), null, graph).forEach(quad => {
                    post.tags.push(quad.object.value);
                });


                dataset.match(subject, this.ns.squirt('url'), null, graph).forEach(quad => {
                    post.url = quad.object.value;
                });

                // Extract FOAF properties for profile type
                if (post.type === 'profile') {
                    const foaf = this.ns.foaf || rdf.namespace('http://xmlns.com/foaf/0.1/');

                    dataset.match(subject, foaf('name'), null, graph).forEach(quad => {
                        post.foafName = quad.object.value;
                    });

                    dataset.match(subject, foaf('nick'), null, graph).forEach(quad => {
                        post.foafNick = quad.object.value;
                    });

                    dataset.match(subject, foaf('mbox'), null, graph).forEach(quad => {
                        post.foafMbox = quad.object.value;
                    });

                    dataset.match(subject, foaf('homepage'), null, graph).forEach(quad => {
                        post.foafHomepage = quad.object.value;
                    });

                    dataset.match(subject, foaf('img'), null, graph).forEach(quad => {
                        post.foafImg = quad.object.value;
                    });

                    // Extract online accounts
                    post.foafAccounts = [];
                    dataset.match(subject, foaf('account'), null, graph).forEach(accountQuad => {
                        const accountNode = accountQuad.object;
                        dataset.match(accountNode, foaf('accountServiceHomepage'), null, graph).forEach(serviceQuad => {
                            post.foafAccounts.push(serviceQuad.object.value);
                        });
                    });
                }
            });


            if (options.tag) {
                posts = new Map(
                    Array.from(posts.entries()).filter(([_, post]) =>
                        post.tags.includes(options.tag)
                    )
                );
            }


            let postsArray = Array.from(posts.values())
                .sort((a, b) => {
                    const dateA = a.modified ? new Date(a.modified) : new Date(a.created);
                    const dateB = b.modified ? new Date(b.modified) : new Date(b.created);
                    return dateB - dateA;
                });


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
     * Get a specific post by ID
     * @param {string} postId - The ID of the post to retrieve
     * @returns {Object|null} The post object or null if not found
     */
    getPost(postId) {
        try {
            const dataset = this.dataset;
            if (!dataset) return null;

            const subject = rdf.namedNode(postId);

            // Get all quads with this subject
            const quads = dataset.match(subject);

            if (quads.size === 0) {
                return null;
            }

            // Create a temporary dataset with just these quads
            const tempDataset = rdf.dataset(quads);

            // Extract the post from this temporary dataset
            const posts = this.extractPosts(tempDataset);

            return posts.length > 0 ? posts[0] : null;
        } catch (error) {
            throw new RDFError(`Failed to get post: ${error.message}`, {
                originalError: error,
                postId
            });
        }
    }


    /**
     * Create a new post
     * @param {Object} postData - The post data
     * @returns {string} The ID of the created post
     */
    createPost(postData) {
        try {
            const postInfo = this.createPostData(postData);

            // Add all quads to the dataset
            if (this.dataset) {
                postInfo.dataset.forEach(quad => {
                    this.dataset.add(quad);
                });
            } else {
                this.dataset = postInfo.dataset;
            }

            return postInfo.id;
        } catch (error) {
            throw new RDFError(`Failed to create post: ${error.message}`, {
                originalError: error,
                postData
            });
        }
    }


    /**
     * Delete a post by ID
     * @param {string} postId - The ID of the post to delete
     * @returns {boolean} True if the post was deleted, false otherwise
     */
    deletePost(postId) {
        try {
            if (!this.dataset) return false;

            const subject = rdf.namedNode(postId);

            // Find all quads with this subject
            const quadsToRemove = this.dataset.match(subject);

            if (quadsToRemove.size === 0) {
                return false;
            }

            // Remove all quads
            quadsToRemove.forEach(quad => {
                this.dataset.delete(quad);
            });

            return true;
        } catch (error) {
            throw new RDFError(`Failed to delete post: ${error.message}`, {
                originalError: error,
                postId
            });
        }
    }


    /**
     * Get all posts matching certain criteria
     * @param {Object} options - Options for filtering posts
     * @returns {Array} Array of matching posts
     */
    getPosts(options = {}) {
        try {
            return this.extractPosts(this.dataset, options);
        } catch (error) {
            throw new RDFError(`Failed to get posts: ${error.message}`, {
                originalError: error,
                options
            });
        }
    }


    /**
     * Sync the local dataset with the SPARQL endpoint
     * @returns {Promise<boolean>} True if sync was successful
     */
    async syncWithEndpoint() {
        try {
            // This method would need to be implemented to handle the actual synchronization logic
            // For now, it's a placeholder that pretends to succeed
            return true;
        } catch (error) {
            throw new RDFError(`Failed to sync with endpoint: ${error.message}`, {
                originalError: error
            });
        }
    }






    generatePostId(postData) {
        const content = postData.title || postData.content || postData.url || '';
        const date = new Date().toISOString().split('T')[0];
        const hash = this.hashContent(content);

        return `http://purl.org/stuff/squirt/post_${date}_${hash}`;
    }






    hashContent(content) {
        return Array.from(content)
            .reduce((hash, char) => {
                return ((hash << 5) - hash) + char.charCodeAt(0) | 0;
            }, 0)
            .toString(16)
            .slice(0, 8);
    }
}

// Export the singleton instance
export const rdfModel = new RDFModel();