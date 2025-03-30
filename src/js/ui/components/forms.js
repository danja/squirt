import { state } from '../../core/state.js';
import { ErrorHandler } from '../../core/errors.js';
import { rdfModel } from '../../services/rdf/rdf-model.js';
import { extractMetadataFromUrl, createDatasetFromMetadata } from '../../services/rdf/rdf-extractor.js';
import { showNotification } from './notifications.js';

export function setupForms() {
  setupPostForm();
  setupEndpointForm();
}

function setupPostForm() {
  console.log('Setting up post form...');
  const form = document.getElementById('post-form');
  if (!form) {
    console.warn('Post form not found, it may be loaded dynamically');
    return;
  }
  
  console.log('Post form found, setting up extract button...');
  
  // Set up the extract button
  const extractButton = document.getElementById('extract-metadata');
  const urlInput = document.getElementById('url');
  
  if (extractButton && urlInput) {
    console.log('Extract button found, adding listener');
    extractButton.addEventListener('click', async () => {
      if (urlInput.value) {
        try {
          extractButton.disabled = true;
          extractButton.textContent = 'Extracting...';
          
          showNotification('Extracting metadata, please wait...', 'info');
          
          const metadata = await extractMetadataFromUrl(urlInput.value);
          
          // Fill in form fields with extracted metadata
          if (metadata.title) {
            const titleInput = document.getElementById('title');
            if (titleInput && !titleInput.value) {
              titleInput.value = metadata.title;
            }
          }
          
          if (metadata.description) {
            const contentInput = document.getElementById('content');
            if (contentInput && !contentInput.value) {
              contentInput.value = metadata.description;
            }
          }
          
          if (metadata.tags && metadata.tags.length > 0) {
            const tagsInput = document.getElementById('tags');
            if (tagsInput && !tagsInput.value) {
              tagsInput.value = metadata.tags.join(', ');
            }
          }
          
          // Update preview
          const previewElement = document.getElementById('post-preview');
          if (previewElement) {
            previewElement.innerHTML = `
              <h3>Link Preview</h3>
              <div class="link-preview">
                <div class="preview-card">
                  ${metadata.image ? `<div class="preview-image"><img src="${metadata.image}" alt="${metadata.title || 'Preview'}"></div>` : ''}
                  <div class="preview-content">
                    <h3 class="preview-title">${metadata.title || 'No title'}</h3>
                    <p class="preview-description">${metadata.description || ''}</p>
                    ${metadata.siteName ? `<span class="preview-site">${metadata.siteName}</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }
          
          showNotification('Metadata extracted successfully', 'success');
          
        } catch (error) {
          console.error('Error extracting metadata:', error);
          showNotification(`Failed to extract metadata: ${error.message}`, 'error');
        } finally {
          extractButton.disabled = false;
          extractButton.textContent = 'Extract';
        }
      } else {
        showNotification('Please enter a valid URL first', 'warning');
      }
    });
  } else {
    console.warn('Extract button or URL input not found!');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      state.update('postSubmitting', true);
      const formData = new FormData(form);
      
      // Extract form data
      const postData = {
        type: formData.get('post-type'),
        content: formData.get('content'),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
      };
      
      // If it's a link post, extract the URL
      if (postData.type === 'link' && formData.get('url')) {
        postData.url = formData.get('url');
      }
      
      // If title is provided, add it
      if (formData.get('title')) {
        postData.title = formData.get('title');
      }
      
      // Create post in the RDF model
      const postId = rdfModel.createPost(postData);
      
      // Try to sync with endpoint, but continue even if it fails
      try {
        await rdfModel.syncWithEndpoint();
      } catch (syncError) {
        console.warn('Post created locally but failed to sync with endpoint', syncError);
      }
      
      // Update UI state
      state.update('lastPost', {
        id: postId,
        ...postData,
        timestamp: new Date().toISOString()
      });
      
      state.update('lastPostStatus', 'success');
      
      // Reset form
      form.reset();
      
      // Show success notification
      showNotification('Post created successfully', 'success');
      
    } catch (error) {
      ErrorHandler.handle(error);
      state.update('lastPostStatus', 'error');
      showNotification('Failed to create post: ' + error.message, 'error');
    } finally {
      state.update('postSubmitting', false);
    }
  });
}

// Listen for post type changes 
const typeSelector = document.getElementById('post-type');
if (typeSelector) {
  typeSelector.addEventListener('change', (e) => {
    console.log('Post type changed to:', e.target.value);
    // In a real implementation, we would toggle between different form types
    alert('Changing post type is not implemented in this demo. Please refresh the page.');
  });
}

function setupEndpointForm() {
  const form = document.getElementById('endpoint-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const url = document.getElementById('endpoint-url').value;
      const label = document.getElementById('endpoint-label').value;
      const type = 'query'; // Default to query, can be extended with dropdown
      
      // Import required here to avoid circular dependencies
      const { EndpointManager } = await import('../../services/sparql/endpoints.js');
      const endpointManager = new EndpointManager();
      
      endpointManager.addEndpoint(url, label, type);
      form.reset();
      
      showNotification('Endpoint added successfully', 'success');
      
      // Refresh the endpoint list if the component exists
      if (typeof updateEndpointsList === 'function') {
        updateEndpointsList();
      }
    } catch (error) {
      ErrorHandler.handle(error);
      showNotification('Failed to add endpoint: ' + error.message, 'error');
    }
  });
}

function addFormField(container, field) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';
  
  // Create label
  const label = document.createElement('label');
  label.setAttribute('for', field.name);
  label.textContent = field.label;
  wrapper.appendChild(label);
  
  // Create input
  let input;
  if (field.type === 'textarea') {
    input = document.createElement('textarea');
  } else {
    input = document.createElement('input');
    input.type = field.type;
  }
  
  input.name = field.name;
  input.id = field.name;
  
  if (field.placeholder) {
    input.placeholder = field.placeholder;
  }
  
  if (field.required) {
    input.required = true;
  }
  
  wrapper.appendChild(input);
  container.appendChild(wrapper);
}

// REMOVED: Duplicate showNotification function was here
// Using the imported showNotification from notifications.js instead