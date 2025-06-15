import { eventBus, EVENTS } from 'evb'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { showNotification } from '../notifications/notifications.js'
import { RDFModel } from '../../domain/rdf/model.js'

/**
 * Initialize the post view
 * @returns {Object} View controller with update and cleanup methods
 */
export function initView() {
    let unsubscribeShareReceived = null // Keep track of the unsubscribe function
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

        // Check for shared data immediately when post view loads
        const checkForSharedData = () => {
            const sharedData = sessionStorage.getItem('sharedData')
            if (sharedData) {
                try {
                    const data = JSON.parse(sharedData)
                    console.log('Post view found stored shared data:', data)
                    sessionStorage.removeItem('sharedData')
                    // Process shared data directly
                    processSharedData(data)
                } catch (error) {
                    console.error('Error parsing shared data in post view:', error)
                }
            }
        }

        // Function to process shared data and populate form
        const processSharedData = (data) => {
            console.log('Processing shared data in Post View:', data)
            const urlInput = document.getElementById('url')
            const titleInput = document.getElementById('title')
            const contentInput = document.getElementById('content')
            const postTypeSelect = document.getElementById('post-type')

            if (data.url && urlInput) {
                urlInput.value = data.url
                if (postTypeSelect && postTypeSelect.value !== 'link') {
                    postTypeSelect.value = 'link'
                    postTypeSelect.dispatchEvent(new Event('change'))
                }
            }
            if (data.title && titleInput) {
                titleInput.value = data.title
            }
            if (data.text && contentInput && !data.url) {
                contentInput.value = data.text
                if (postTypeSelect && postTypeSelect.value !== 'entry') {
                    postTypeSelect.value = 'entry'
                    postTypeSelect.dispatchEvent(new Event('change'))
                }
            }
        }

        // Check immediately
        setTimeout(checkForSharedData, 100)

        // Listen for shared content
        console.log('Post view: Setting up share event listener')
        unsubscribeShareReceived = eventBus.on(EVENTS.SHARE_RECEIVED, (data) => {
            processSharedData(data)
        })

        return {
            update() {
                console.log('Updating Post view')
                loadPosts()
            },

            cleanup() {
                console.log('Cleaning up Post view')
                // Unsubscribe from the share event when view is cleaned up
                if (unsubscribeShareReceived) {
                    unsubscribeShareReceived()
                }
            }
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing Post view'
        })

        // Ensure cleanup if initialization fails partially
        if (unsubscribeShareReceived) {
            unsubscribeShareReceived()
        }
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
            const postId = RDFModel.createPost(postData)

            // Try to sync with endpoint
            try {
                await RDFModel.syncWithEndpoint()
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