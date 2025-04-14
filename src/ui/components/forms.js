// import { state } from '../../core/state.js'; // Remove legacy state
import { store } from '../../core/state/index.js' // Import Redux store
import * as actions from '../../core/state/actions.js' // Import actions

// import { ErrorHandler } from '../../core/errors.js'; // Remove old handler
import { errorHandler } from '../../core/errors/index.js' // Use new handler
import { rdfService } from '../../services/rdf/rdf-service.js'
import { extractMetadataFromUrl } from '../../services/rdf/rdf-extractor.js'
import { showNotification } from './notifications.js'

export function setupForms() {
  setupPostForm()
  setupEndpointForm()
}

function setupPostForm() {
  console.log('Setting up post form...')
  const form = document.getElementById('post-form')
  if (!form) {
    console.warn('Post form not found, it may be loaded dynamically')
    return
  }

  // Get references to form elements that might indicate submission state
  const submitButton = form.querySelector('button[type="submit"]')
  const originalSubmitText = submitButton ? submitButton.textContent : 'Submit'

  console.log('Post form found, setting up extract button...')

  // Set up the extract button
  const extractButton = document.getElementById('extract-metadata')
  const urlInput = document.getElementById('url')

  if (extractButton && urlInput) {
    console.log('Extract button found, adding listener')
    extractButton.addEventListener('click', async () => {
      if (urlInput.value) {
        try {
          extractButton.disabled = true
          extractButton.textContent = 'Extracting...'

          showNotification('Extracting metadata, please wait...', 'info')

          const metadata = await extractMetadataFromUrl(urlInput.value)

          // Fill in form fields with extracted metadata
          if (metadata.title) {
            const titleInput = document.getElementById('title')
            if (titleInput && !titleInput.value) {
              titleInput.value = metadata.title
            }
          }

          if (metadata.description) {
            const contentInput = document.getElementById('content')
            if (contentInput && !contentInput.value) {
              contentInput.value = metadata.description
            }
          }

          if (metadata.tags && metadata.tags.length > 0) {
            const tagsInput = document.getElementById('tags')
            if (tagsInput && !tagsInput.value) {
              tagsInput.value = metadata.tags.join(', ')
            }
          }

          // Update preview
          const previewElement = document.getElementById('post-preview')
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
            `
          }

          showNotification('Metadata extracted successfully', 'success')

        } catch (error) {
          console.error('Error extracting metadata:', error)
          errorHandler.handle(error, { context: 'PostForm ExtractMetadata', showToUser: true })
        } finally {
          extractButton.disabled = false
          extractButton.textContent = 'Extract'
        }
      } else {
        showNotification('Please enter a valid URL first', 'warning')
      }
    })
  } else {
    console.warn('Extract button or URL input not found!')
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Indicate submission visually
    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = 'Submitting...'
    }

    try {
      const formData = new FormData(form)

      // Extract form data
      const postData = {
        type: formData.get('post-type'),
        content: formData.get('content'),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
      }

      // If it's a link post, extract the URL
      if (postData.type === 'link' && formData.get('url')) {
        postData.url = formData.get('url')
      }

      // If title is provided, add it
      if (formData.get('title')) {
        postData.title = formData.get('title')
      }

      // Use RDF service to create the post
      const postId = await rdfService.createPost(postData)

      // Optional: Sync with endpoint after creation
      // Note: syncWithEndpoint needs graphUri, decide how to get/provide it
      // For now, let's assume sync is triggered elsewhere or needs more context
      /*
      rdfService.syncWithEndpoint(graphUri) // Example, needs graphUri
        .then(() => {
          showNotification('Post created and synced successfully!', 'success')
        })
        .catch(syncError => {
          console.warn('Post created locally, but sync failed:', syncError)
          showNotification('Post created locally, but sync failed.', 'warning')
        })
      */
      showNotification('Post created successfully (local)', 'success')

      // Update UI state locally if needed (e.g., clear form, show success message)
      // state.update('lastPost', { ... }) // Removed - Manage this specific UI state differently if needed
      // state.update('lastPostStatus', 'success') // Removed

      // Reset form
      form.reset()
      const previewElement = document.getElementById('post-preview')
      if (previewElement) previewElement.innerHTML = '' // Clear preview

      // Optionally trigger an event or callback
      // TODO: Define how onSubmitSuccess should be passed if needed
      /*
      if (typeof options.onSubmitSuccess === 'function') {
        options.onSubmitSuccess(postId, postData)
      }
      */

    } catch (error) {
      console.error('Error creating post:', error)
      // Error is likely handled by rdfService.createPost, which uses errorHandler
      // showNotification(`Error creating post: ${error.message}`, 'error') // May be redundant
      // Optionally trigger an error callback
      // TODO: Define how onSubmitError should be passed if needed
      /*
      if (typeof options.onSubmitError === 'function') {
        options.onSubmitError(error)
      }
      */
    } finally {
      // Reset submission state visually
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = originalSubmitText
      }
      // state.update('postSubmitting', false) // Removed
    }
  })
}

// Listen for post type changes 
const typeSelector = document.getElementById('post-type')
if (typeSelector) {
  typeSelector.addEventListener('change', (e) => {
    console.log('Post type changed to:', e.target.value)
    // Toggle visibility of URL input based on type
    const urlField = document.getElementById('url-field') // Assuming the URL input is wrapped
    if (urlField) {
      urlField.style.display = (e.target.value === 'link') ? 'block' : 'none'
    }
  })
  // Trigger change event on load to set initial state
  typeSelector.dispatchEvent(new Event('change'))
}

function setupEndpointForm() {
  const form = document.getElementById('endpoint-form')
  if (!form) return

  const submitButton = form.querySelector('button[type="submit"]')
  const originalSubmitText = submitButton ? submitButton.textContent : 'Add Endpoint'

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = 'Adding...'
    }

    try {
      const urlInput = document.getElementById('endpoint-url')
      const labelInput = document.getElementById('endpoint-label')
      const typeSelect = document.getElementById('endpoint-type') // Assuming an ID for type select
      const userInput = document.getElementById('endpoint-user')
      const passwordInput = document.getElementById('endpoint-password')

      if (!urlInput || !labelInput || !typeSelect) { // Basic validation
        throw new Error('Missing required endpoint form fields (URL, Label, Type).')
      }

      const url = urlInput.value.trim()
      const label = labelInput.value.trim()
      const type = typeSelect.value
      const credentials = (userInput?.value && passwordInput?.value)
        ? { user: userInput.value, password: passwordInput.value }
        : null

      if (!url || !label) {
        throw new Error('Endpoint URL and Label cannot be empty.')
      }

      // Dispatch addEndpoint action directly
      // The EndpointManager logic for checking duplicates and status is now in the reducer/manager
      store.dispatch(actions.addEndpoint({ url, label, type, credentials, status: 'unknown' }))
      // TODO: Saving to storage should be handled centrally, perhaps by EndpointManager subscribing to store.

      form.reset()
      showNotification('Endpoint added successfully (checking status...)', 'success')

      // Refreshing the endpoint list is handled by its own subscription to the store.
      // if (typeof updateEndpointsList === 'function') {
      //   updateEndpointsList()
      // }
    } catch (error) {
      // Use new error handler
      errorHandler.handle(error, { context: 'EndpointForm Submit', showToUser: true })
      // showNotification('Failed to add endpoint: ' + error.message, 'error') // Redundant
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = originalSubmitText
      }
    }
  })
}

// Removed addFormField function as it wasn't used
// Removed duplicate showNotification function