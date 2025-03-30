import rdf from 'rdf-ext';
import { generateNid } from '../../utils/utils.js';
import { namespaces } from '../../utils/utils.js';

export class RDFFormExtractor {
  constructor() {
    this.dataset = rdf.dataset();
  }

  async extract(form) {
    const formData = new FormData(form);
    const subject = rdf.namedNode(generateNid(formData.get('title')));

    for (const element of form.elements) {
      if (!element.name) continue;

      const predicate = rdf.namedNode(element.dataset.namespace + element.dataset.term);
      const object = this.createObject(element);

      if (object) {
        this.dataset.add(rdf.quad(subject, predicate, object));
      }
    }

    // Add type and timestamp
    const type = rdf.namedNode('http://purl.org/stuff/squirt/' + form.dataset.type);
    const now = new Date().toISOString();

    this.dataset.add(rdf.quad(
      subject,
      rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      type
    ));

    this.dataset.add(rdf.quad(
      subject,
      rdf.namedNode('http://purl.org/dc/terms/created'),
      rdf.literal(now, rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
    ));

    return this.dataset;
  }

  createObject(element) {
    const value = element.value.trim();
    if (!value) return null;

    switch (element.type) {
      case 'url':
        return rdf.namedNode(value);
      case 'number':
        return rdf.literal(value, rdf.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
      default:
        return rdf.literal(value);
    }
  }
}

/**
 * Extract metadata from a URL and create an RDF dataset
 * @param {string} url - The URL to extract metadata from
 * @returns {Promise<Object>} - Object containing dataset and metadata
 */
export async function extractFromUrl(url) {
  try {
    const metadata = await extractMetadataFromUrl(url);
    return {
      metadata,
      dataset: createDatasetFromMetadata(metadata)
    };
  } catch (error) {
    console.error('Error extracting from URL:', error);
    throw error;
  }
}

/**
 * Convert metadata to RDF dataset
 * @param {Object} metadata - The metadata object
 * @returns {Dataset} - RDF dataset
 */
export function createDatasetFromMetadata(metadata) {
  const dataset = rdf.dataset();
  const subject = rdf.namedNode(generateNid(metadata.url));
  
  // Add type - default to "link" type
  dataset.add(rdf.quad(
    subject,
    rdf.namedNode(namespaces.rdf + 'type'),
    rdf.namedNode(namespaces.squirt + 'link')
  ));
  
  // Add URL
  if (metadata.url) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.squirt + 'url'),
      rdf.namedNode(metadata.url)
    ));
  }
  
  // Add title
  if (metadata.title) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.dc + 'title'),
      rdf.literal(metadata.title)
    ));
  }
  
  // Add description
  if (metadata.description) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.dc + 'description'),
      rdf.literal(metadata.description)
    ));
  }
  
  // Add image
  if (metadata.image) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.squirt + 'image'),
      rdf.namedNode(metadata.image)
    ));
  }
  
  // Add site name
  if (metadata.siteName) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.squirt + 'siteName'),
      rdf.literal(metadata.siteName)
    ));
  }
  
  // Add author
  if (metadata.author) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.dc + 'creator'),
      rdf.literal(metadata.author)
    ));
  }
  
  // Add date
  if (metadata.date) {
    dataset.add(rdf.quad(
      subject,
      rdf.namedNode(namespaces.dc + 'date'),
      rdf.literal(metadata.date, rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
    ));
  }
  
  // Add tags
  if (metadata.tags && Array.isArray(metadata.tags)) {
    metadata.tags.forEach(tag => {
      dataset.add(rdf.quad(
        subject,
        rdf.namedNode(namespaces.squirt + 'tag'),
        rdf.literal(tag)
      ));
    });
  }
  
  // Add creation timestamp
  const now = new Date().toISOString();
  dataset.add(rdf.quad(
    subject,
    rdf.namedNode(namespaces.dc + 'created'),
    rdf.literal(now, rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
  ));
  
  return dataset;
}

/**
 * Extract metadata from a URL
 * @param {string} url - The URL to extract metadata from
 * @returns {Promise<Object>} - The extracted metadata
 */
export async function extractMetadataFromUrl(url) {
  try {
    // Basic validation
    if (!url) {
      throw new Error('URL is required');
    }
    
    // Use a proxy or CORS-enabled service if needed
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    // Parse the HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract metadata
    const metadata = {
      url: url,
      title: extractTitle(doc),
      description: extractDescription(doc),
      image: extractImage(doc, url),
      siteName: extractSiteName(doc),
      type: extractType(doc),
      date: extractDate(doc),
      author: extractAuthor(doc),
      tags: extractTags(doc)
    };
    
    return metadata;
  } catch (error) {
    console.error('Error extracting metadata:', error);
    // Return basic metadata with the URL only as fallback
    return {
      url: url,
      title: extractBasicTitleFromUrl(url),
      error: error.message
    };
  }
}

/**
 * Extract title from document
 * @param {Document} doc - The HTML document
 * @returns {string} - The extracted title
 */
function extractTitle(doc) {
  // Try Open Graph title first
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    return ogTitle.getAttribute('content');
  }
  
  // Try Twitter title
  const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) {
    return twitterTitle.getAttribute('content');
  }
  
  // Fall back to document title
  const docTitle = doc.querySelector('title');
  if (docTitle && docTitle.textContent) {
    return docTitle.textContent.trim();
  }
  
  // Fall back to first h1
  const h1 = doc.querySelector('h1');
  if (h1 && h1.textContent) {
    return h1.textContent.trim();
  }
  
  return '';
}

/**
 * Extract description from document
 * @param {Document} doc - The HTML document
 * @returns {string} - The extracted description
 */
function extractDescription(doc) {
  // Try Open Graph description
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    return ogDesc.getAttribute('content');
  }
  
  // Try Twitter description
  const twitterDesc = doc.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) {
    return twitterDesc.getAttribute('content');
  }
  
  // Try meta description
  const metaDesc = doc.querySelector('meta[name="description"]');
  if (metaDesc) {
    return metaDesc.getAttribute('content');
  }
  
  return '';
}

/**
 * Extract image from document
 * @param {Document} doc - The HTML document
 * @param {string} baseUrl - The base URL for resolving relative URLs
 * @returns {string} - The extracted image URL
 */
function extractImage(doc, baseUrl) {
  // Try Open Graph image
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const imageSrc = ogImage.getAttribute('content');
    return resolveUrl(imageSrc, baseUrl);
  }
  
  // Try Twitter image
  const twitterImage = doc.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    const imageSrc = twitterImage.getAttribute('content');
    return resolveUrl(imageSrc, baseUrl);
  }
  
  // Try to find a prominent image
  const articleImage = doc.querySelector('article img, .content img, .post img');
  if (articleImage) {
    const imageSrc = articleImage.getAttribute('src');
    return resolveUrl(imageSrc, baseUrl);
  }
  
  return '';
}

/**
 * Extract site name from document
 * @param {Document} doc - The HTML document
 * @returns {string} - The extracted site name
 */
function extractSiteName(doc) {
  // Try Open Graph site name
  const ogSite = doc.querySelector('meta[property="og:site_name"]');
  if (ogSite) {
    return ogSite.getAttribute('content');
  }
  
  // Try schema.org WebSite name
  const schemaWebsite = doc.querySelector('[itemtype="http://schema.org/WebSite"] [itemprop="name"]');
  if (schemaWebsite) {
    return schemaWebsite.textContent.trim();
  }
  
  return '';
}

/**
 * Extract content type from document
 * @param {Document} doc - The HTML document
 * @returns {string} - The extracted type
 */
function extractType(doc) {
  // Try Open Graph type
  const ogType = doc.querySelector('meta[property="og:type"]');
  if (ogType) {
    return ogType.getAttribute('content');
  }
  
  // Try schema.org type
  const schemaType = doc.querySelector('[itemtype]');
  if (schemaType) {
    const type = schemaType.getAttribute('itemtype');
    return type.replace('http://schema.org/', '');
  }
  
  return 'website';
}

/**
 * Extract published date from document
 * @param {Document} doc - The HTML document
 * @returns {string} - The extracted date
 */
function extractDate(doc) {
  // Try published date meta
  const metaDate = doc.querySelector('meta[property="article:published_time"]');
  if (metaDate) {
    return metaDate.getAttribute('content');
  }
  
  // Try schema.org date published
  const schemaDate = doc.querySelector('[itemprop="datePublished"]');
  if (schemaDate) {
    return schemaDate.getAttribute('content') || schemaDate.textContent.trim();
  }
  
  // Try looking for a time element
  const timeElement = doc.querySelector('time');
  if (timeElement) {
    return timeElement.getAttribute('datetime') || timeElement.textContent.trim();
  }
  
  return '';
}

/**
 * Extract author from document
 * @param {Document} doc - The HTML document
 * @returns {string} - The extracted author
 */
function extractAuthor(doc) {
  // Try meta author
  const metaAuthor = doc.querySelector('meta[name="author"]');
  if (metaAuthor) {
    return metaAuthor.getAttribute('content');
  }
  
  // Try Open Graph article author
  const ogAuthor = doc.querySelector('meta[property="article:author"]');
  if (ogAuthor) {
    return ogAuthor.getAttribute('content');
  }
  
  // Try schema.org author
  const schemaAuthor = doc.querySelector('[itemprop="author"] [itemprop="name"]');
  if (schemaAuthor) {
    return schemaAuthor.textContent.trim();
  }
  
  // Try basic byline patterns
  const byline = doc.querySelector('.byline, .author');
  if (byline) {
    return byline.textContent.trim().replace(/^By\s+/i, '');
  }
  
  return '';
}

/**
 * Extract tags/keywords from document
 * @param {Document} doc - The HTML document
 * @returns {string[]} - The extracted tags
 */
function extractTags(doc) {
  const tags = [];
  
  // Try meta keywords
  const metaKeywords = doc.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const keywordsStr = metaKeywords.getAttribute('content');
    if (keywordsStr) {
      tags.push(...keywordsStr.split(',').map(tag => tag.trim()));
    }
  }
  
  // Try article:tag
  const articleTags = doc.querySelectorAll('meta[property="article:tag"]');
  articleTags.forEach(tag => {
    tags.push(tag.getAttribute('content'));
  });
  
  // Try looking for tag links
  const tagLinks = doc.querySelectorAll('.tags a, .categories a, .topics a');
  tagLinks.forEach(link => {
    tags.push(link.textContent.trim());
  });
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Helper function to resolve relative URLs
 * @param {string} url - The URL to resolve
 * @param {string} base - The base URL
 * @returns {string} - The resolved URL
 */
function resolveUrl(url, base) {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch (e) {
    return url;
  }
}

/**
 * Extract a basic title from the URL if nothing else is available
 * @param {string} url - The URL
 * @returns {string} - A title derived from the URL
 */
function extractBasicTitleFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Get the last part of the path
    const parts = path.split('/').filter(Boolean);
    
    if (parts.length > 0) {
      // Get the last part and clean it up
      const lastPart = parts[parts.length - 1]
        .replace(/\.html$|\.php$|\.aspx$/, '')
        .replace(/-|_/g, ' ');
      
      // Capitalize first letter of each word
      return lastPart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Fall back to domain if no path
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    // If all fails, return a portion of the URL
    return url.substring(0, 50) + (url.length > 50 ? '...' : '');
  }
}
