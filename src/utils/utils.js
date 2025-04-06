export const namespaces = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  dc: 'http://purl.org/dc/terms/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  squirt: 'http://purl.org/stuff/squirt/'
};

export function generateNid(content) {
  const date = new Date().toISOString().split('T')[0];
  const hash = hashContent(content);
  return `http://purl.org/stuff/squirt/nid_${date}_${hash}`;
}

function hashContent(content) {
  return Array.from(content)
    .reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0) | 0;
    }, 0)
    .toString(16)
    .slice(0, 4);
}