import rdf from 'rdf-ext';
import { namespaces } from '../utils/namespaces.js';

export class CoreModel {
    constructor() {
        this.ns = {};

        // Initialize namespaces
        Object.entries(namespaces).forEach(([prefix, uri]) => {
            this.ns[prefix] = rdf.namespace(uri);
        });
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

    // Additional shared methods can be added here
}

export const coreModel = new CoreModel();