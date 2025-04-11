import rdf from 'rdf-ext';
import { coreModel } from '../model.js';
import { RDFError } from '../../core/errors/error-types.js';

export class PostProfile {
    constructor() {
        this.ns = coreModel.ns;
    }

    createPostData(postData) {
        try {
            const dataset = rdf.dataset();

            // Generate or use custom ID
            const postId = postData.customId || coreModel.generatePostId(postData);
            const subject = rdf.namedNode(postId);

            // Get optional graph
            const graph = postData.graph ?
                rdf.namedNode(postData.graph) :
                null;

            // Helper to add quads to dataset
            const addQuad = (s, p, o) => {
                if (graph) {
                    dataset.add(rdf.quad(s, p, o, graph));
                } else {
                    dataset.add(rdf.quad(s, p, o));
                }
            };

            // Add type
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

    // Additional post-specific methods can be added here
}

export const postProfile = new PostProfile();