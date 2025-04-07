import { eventBus, EVENTS } from '../../core/events/event-bus.js'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { showNotification } from '../notifications/notifications.js'
import { rdfModel } from '../../domain/rdf/model.js'

/**
 * Initialize the post view
 * @returns {Object} View controller with update and cleanup methods
 */
export function initView() {
    try {
        console.log('Initializing Post view')

        const view = document.getElementById('post-view')
        if (!view) {
            throw new Error('Post view element not found')
        }

        // Set up form submission
        setupPostForm()

        // Load existing posts if needed
        loadPosts()

        return {
            update() {
                console.log('Updating Post view')
                loadPosts()
            },

            cleanup() {
                console.log('Cleaning up Post view')
                // Remove event listeners if needed
            }
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing Post view'
        })

        return {}
    }
}

/**
 * Set up post form submission
 */
function setupPostForm() {
    const form = document.getElementById('post-form')
    if (!form) return

    form.addEventListener('submit', async (e) => {
        e.preventDefault()

        try {
            const formData = new FormData(form)

            // Build post data object
            const postData = {
                type: formData.get('post-type') || 'entry',
                content: formData.get('content'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
            }

            // Add URL for link posts
            if (postData.type === 'link' && formData.get('url')) {
                postData.url = formData.get('url')
            }

            // Add title if available
            if (formData.get('title')) {
                postData.title = formData.get('title')
            }

            // Create post in RDF model
            const postId = rdfModel.createPost(postData)

            // Try to sync with endpoint
            try {
                await rdfModel.syncWithEndpoint()
            } catch (syncError) {
                console.warn('Post created locally but failed to sync with endpoint', syncError)
            }

            // Reset form
            form.reset()

            showNotification('Post created successfully', 'success')

        } catch (error) {
            errorHandler.handle(error)
            showNotification('Failed to create post: ' + error.message, 'error')
        }
    })

    // Set up extract metadata button if present
    const extractButton = document.getElementById('extract-metadata')
    const urlInput = document.getElementById('url')

    if (extractButton && urlInput) {
        extractButton.addEventListener('click', async () => {
            if (!urlInput.value) {
                showNotification('Please enter a URL first', 'warning')
                return
            }

            try {
                extractButton.disabled = true
                extractButton.textContent = 'Extracting...'

                // Extract metadata logic would go here
                // For now, just simulate it
                setTimeout(() => {
                    const titleInput = document.getElementById('title')
                    if (titleInput) {
                        titleInput.value = 'Title from ' + urlInput.value
                    }

                    const contentInput = document.getElementById('content')
                    if (contentInput) {
                        contentInput.value = 'Description extracted from ' + urlInput.value
                    }

                    showNotification('Metadata extracted', 'success')
                    extractButton.disabled = false
                    extractButton.textContent = 'Extract'
                }, 1000)
            } catch (error) {
                errorHandler.handle(error)
                showNotification('Failed to extract metadata: ' + error.message, 'error')
                extractButton.disabled = false
                extractButton.textContent = 'Extract'
            }
        })
    }
}

/**
 * Load existing posts
 */
function loadPosts() {
    // This would load posts from the RDF model
    // For now, it's just a placeholder
    console.log('Loading posts...')
}