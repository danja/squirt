import { eventBus, EVENTS } from 'evb'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { getActiveEndpoint } from '../../core/state/selectors.js'
import { showNotification } from '../notifications/notifications.js'

let yasguiInstance = null
let resizeObserver = null

/**
 * Initialize the YASGUI view
 * @returns {Object} View controller with update and cleanup methods
 */
export function initView() {
    try {
        console.log('Initializing YASGUI view')

        const view = document.getElementById('yasgui-view')
        if (!view) {
            throw new Error('YASGUI view element not found')
        }

        // Initialize YASGUI if not already done
        if (!yasguiInstance) {
            initializeYasgui()
        }

        return {
            update() {
                console.log('Updating YASGUI view')
                updateYasguiEndpoint()
            },

            cleanup() {
                console.log('Cleaning up YASGUI view')

                // Clean up resize observer
                if (resizeObserver) {
                    resizeObserver.disconnect()
                    resizeObserver = null
                }
            }
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing YASGUI view'
        })

        // Show error in container
        const container = document.getElementById('yasgui-container')
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Failed to initialize SPARQL editor: ${error.message}</p>
                    <button onclick="window.location.reload()">Reload Page</button>
                </div>
            `
        }

        return {}
    }
}

/**
 * Initialize YASGUI SPARQL editor
 */
async function initializeYasgui() {
    const container = document.getElementById('yasgui-container')
    if (!container) {
        throw new Error('YASGUI container not found')
    }

    // Show loading indicator
    container.innerHTML = '<div class="yasgui-container-loading"></div>'

    try {
        // Load YASGUI dependencies
        const Yasgui = await loadYasguiDependencies()

        // Get active endpoint from state
        const activeEndpoint = getActiveEndpoint(store.getState(), 'query')

        // Configure YASGUI
        const config = {
            requestConfig: {
                endpoint: activeEndpoint ? activeEndpoint.url : 'http://localhost:4030/sparql/query',
                method: 'POST'
            }
        }

        // Add authentication if provided
        if (activeEndpoint && activeEndpoint.credentials) {
            const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password)
            config.requestConfig.headers = {
                'Authorization': 'Basic ' + authString
            }
        }

        // Clear container and create YASGUI instance
        container.innerHTML = ''
        yasguiInstance = new Yasgui(container, config)

        // Set default query if no query exists
        const tab = yasguiInstance.getTab()
        if (tab && tab.yasqe) {
            if (!tab.yasqe.getValue().trim()) {
                tab.yasqe.setValue(`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX squirt: <http://purl.org/stuff/squirt/>

SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object
}
LIMIT 10`)
            }
        }

        // Setup resize observer to handle container size changes
        setupResizeObserver(container)

        // Listen for endpoint changes
        eventBus.on(EVENTS.ENDPOINTS_STATUS_CHECKED, handleEndpointChange)
        eventBus.on(EVENTS.ENDPOINT_STATUS_CHANGED, handleEndpointChange)

        showNotification('SPARQL editor initialized', 'success')
    } catch (error) {
        console.error('Error initializing YASGUI:', error)
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to initialize SPARQL editor: ${error.message}</p>
                <button onclick="window.location.reload()">Reload Page</button>
            </div>
        `
        throw error
    }
}

/**
 * Load YASGUI dependencies
 * @returns {Promise<Object>} Yasgui constructor
 */
async function loadYasguiDependencies() {
    try {
        // Use global Yasgui if already loaded
        if (window.Yasgui) {
            return window.Yasgui
        }

        // Dynamically load Yasgui script
        const yasguiScript = document.createElement('script')
        yasguiScript.src = 'https://cdn.jsdelivr.net/npm/@triply/yasgui/build/yasgui.min.js'
        document.head.appendChild(yasguiScript)

        // Load CSS if not already loaded
        if (!document.querySelector('link[href*="yasgui.min.css"]')) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = 'https://cdn.jsdelivr.net/npm/@triply/yasgui/build/yasgui.min.css'
            document.head.appendChild(link)
        }

        // Wait for script to load
        return new Promise((resolve, reject) => {
            yasguiScript.onload = () => {
                if (window.Yasgui) {
                    resolve(window.Yasgui)
                } else {
                    reject(new Error('YASGUI failed to load'))
                }
            }
            yasguiScript.onerror = () => reject(new Error('Failed to load YASGUI script'))
        })
    } catch (error) {
        console.error('Error loading YASGUI dependencies:', error)
        throw new Error(`Failed to load YASGUI: ${error.message}`)
    }
}

/**
 * Setup resize observer for container
 * @param {HTMLElement} container - Container element
 */
function setupResizeObserver(container) {
    // Clean up existing observer
    if (resizeObserver) {
        resizeObserver.disconnect()
    }

    // Create new observer
    resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === container) {
                handleResize()
            }
        }
    })

    // Observe container
    resizeObserver.observe(container)

    // Initial size adjustment
    handleResize()
}

/**
 * Handle container resize
 */
function handleResize() {
    if (!yasguiInstance || !document.getElementById('yasgui-container')) return

    // Get container dimensions
    const container = document.getElementById('yasgui-container')
    const { width, height } = container.getBoundingClientRect()

    // Trigger YASGUI resize if store exists
    if (yasguiInstance.store) {
        yasguiInstance.store.dispatch({
            type: 'YASGUI_RESIZE'
        })
    }

    // Adjust YASQE and YASR heights
    const yasqeElement = container.querySelector('.yasqe')
    const yasrElement = container.querySelector('.yasr')

    if (yasqeElement && yasrElement) {
        // Set heights proportionally
        yasqeElement.style.height = `${Math.floor(height * 0.4)}px`

        // Result area gets remaining height
        yasrElement.style.height = `${Math.floor(height * 0.6)}px`

        // Refresh CodeMirror if available
        const cmElement = yasqeElement.querySelector('.CodeMirror')
        if (cmElement && cmElement.CodeMirror) {
            cmElement.CodeMirror.refresh()
        }
    }
}

/**
 * Handle endpoint change event
 */
function handleEndpointChange() {
    updateYasguiEndpoint()
}

/**
 * Update YASGUI endpoint based on current state
 */
function updateYasguiEndpoint() {
    if (!yasguiInstance) return

    try {
        const activeEndpoint = getActiveEndpoint(store.getState(), 'query')

        if (activeEndpoint) {
            // Get current tab
            const tab = yasguiInstance.getTab()
            if (!tab || !tab.yasqe) return

            // Update endpoint URL
            tab.yasqe.options.requestConfig.endpoint = activeEndpoint.url

            // Update authentication
            if (activeEndpoint.credentials) {
                const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password)
                tab.yasqe.options.requestConfig.headers = {
                    'Authorization': 'Basic ' + authString
                }
            } else {
                delete tab.yasqe.options.requestConfig.headers
            }

            showNotification(`SPARQL endpoint updated: ${activeEndpoint.url}`, 'info')
        }
    } catch (error) {
        console.error('Error updating YASGUI endpoint:', error)
    }
}