/// NOT CURRENTLY USED - LEAVE IN PLACE FOR FUTURE
// src/js/plugins/yasgui-plugin.js
// YASGUI SPARQL query editor plugin

import { PluginBase } from '../core/plugin-base.js'
// import { state } from '../core/state.js' // Old legacy state
import { store } from '../core/state/index.js' // Import Redux store
import { getEndpoints, getActiveEndpoint } from '../core/state/selectors.js' // Import selectors
import { errorHandler, SparqlError } from '../core/errors/index.js'
import { showNotification } from '../ui/components/notifications.js'
import { EVENTS, eventBus } from '../core/events/event-bus.js'

/**
 * Plugin that provides YASGUI SPARQL query editor functionality
 */
export class YasguiPlugin extends PluginBase {
  constructor(id = 'yasgui-plugin', options = {}) {
    super(id, {
      autoInitialize: true,
      defaultQuery: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX squirt: <http://purl.org/stuff/squirt/>

SELECT ?subject ?predicate ?object 
WHERE {
  ?subject ?predicate ?object
} 
LIMIT 10`,
      ...options
    })

    this.yasguiInstance = null
    this.resizeObserver = null
  }

  /**
   * Initialize the YASGUI plugin by loading required resources
   */
  async initialize() {
    if (this.isInitialized) return

    try {
      // Load YASGUI dynamically
      await this.loadYasguiDependencies()

      super.initialize()
      console.log('YASGUI plugin initialized')
    } catch (error) {
      errorHandler.handle(error, {
        showToUser: false,
        context: 'YasguiPlugin Initialization'
      })
      throw new Error(`Failed to initialize YASGUI plugin: ${error.message}`)
    }
  }

  /**
   * Dynamically load the YASGUI library and CSS
   */
  async loadYasguiDependencies() {
    try {
      // First try to use the Yasgui that might already be loaded
      if (window.Yasgui) {
        this.Yasgui = window.Yasgui
        return
      }

      // Otherwise, dynamically import it
      const module = await import('@triply/yasgui')
      this.Yasgui = module.default

      // Import CSS if not already loaded
      if (!document.querySelector('link[href*="yasgui.min.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/@triply/yasgui/build/yasgui.min.css'
        document.head.appendChild(link)
      }
    } catch (error) {
      throw new Error(`Failed to load YASGUI dependencies: ${error.message}`)
    }
  }

  /**
   * Set up the YASGUI component in the container
   */
  async mount(container) {
    await super.mount(container)

    try {
      // Clear container
      container.innerHTML = '<div class="yasgui-wrapper"></div>'
      const wrapper = container.querySelector('.yasgui-wrapper')

      // Get endpoint configuration from Redux store
      const currentState = store.getState()
      const activeEndpoint = getActiveEndpoint(currentState, 'query') // Use selector
      const endpointUrl = activeEndpoint ? activeEndpoint.url : 'http://localhost:4030/semem/query' // Default URL

      // Create minimal configuration
      const config = {
        requestConfig: {
          endpoint: endpointUrl,
          method: 'POST'
        }
      }

      // Add authentication if needed
      if (activeEndpoint && activeEndpoint.credentials) {
        const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password)
        config.requestConfig.headers = {
          'Authorization': 'Basic ' + authString
        }
      }

      // Create the YASGUI instance
      this.yasguiInstance = new this.Yasgui(wrapper, config)

      // Set default query
      const tab = this.yasguiInstance.getTab()
      if (tab && tab.yasqe) {
        tab.yasqe.setValue(this.options.defaultQuery)
      }

      // Set up resize handling
      this.setupResizeObserver()

      // Handle endpoint changes - Subscribe to store instead of document event?
      // this.addEventListener(document, 'endpointsStatusChecked', this.handleEndpointChange.bind(this))
      this.storeUnsubscribe = store.subscribe(() => this.handleEndpointChange()) // Subscribe to store changes

      console.log('YASGUI plugin mounted successfully')
    } catch (error) {
      errorHandler.handle(error, {
        showToUser: false,
        context: 'YasguiPlugin Mount'
      })
      container.innerHTML = `<div class="error-message">Failed to initialize SPARQL editor: ${error.message}</div>`
      throw error
    }
  }

  /**
   * Handle endpoint change events by reacting to store updates
   */
  handleEndpointChange() {
    if (!this.yasguiInstance || !this.yasguiInstance.getTab()) return

    const currentState = store.getState()
    const activeEndpoint = getActiveEndpoint(currentState, 'query') // Get current active endpoint
    const currentYasqeEndpoint = this.yasguiInstance.getTab().yasqe.options.requestConfig.endpoint

    // Check if the active endpoint URL has actually changed
    if (activeEndpoint && activeEndpoint.url !== currentYasqeEndpoint) {
      try {
        // Update YASQE endpoint URL
        this.yasguiInstance.getTab().yasqe.options.requestConfig.endpoint = activeEndpoint.url

        // Update authentication if needed
        if (activeEndpoint.credentials) {
          const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password)
          this.yasguiInstance.getTab().yasqe.options.requestConfig.headers = {
            ...(this.yasguiInstance.getTab().yasqe.options.requestConfig.headers || {}), // Preserve other headers
            'Authorization': 'Basic ' + authString
          }
        } else {
          // Remove auth if not needed
          if (this.yasguiInstance.getTab().yasqe.options.requestConfig.headers) {
            delete this.yasguiInstance.getTab().yasqe.options.requestConfig.headers['Authorization']
          }
        }

        // Maybe YASQE needs a refresh or specific update call here?
        // this.yasguiInstance.getTab().yasqe.refresh(); // Example if needed

        showNotification('SPARQL endpoint updated in YASGUI', 'info') // Use info level?

      } catch (error) {
        errorHandler.handle(error, {
          showToUser: true, // Show this error to the user
          context: 'YasguiPlugin Endpoint Update Error'
        })
      }
    } else if (!activeEndpoint && currentYasqeEndpoint) {
      // Handle case where the active endpoint becomes null/undefined
      // Maybe clear the endpoint in YASQE or show a warning?
      try {
        this.yasguiInstance.getTab().yasqe.options.requestConfig.endpoint = '' // Clear endpoint
        if (this.yasguiInstance.getTab().yasqe.options.requestConfig.headers) {
          delete this.yasguiInstance.getTab().yasqe.options.requestConfig.headers['Authorization']
        }
        showNotification('Active SPARQL query endpoint cleared', 'warning')
      } catch (error) {
        errorHandler.handle(error, {
          showToUser: true,
          context: 'YasguiPlugin Endpoint Clear Error'
        })
      }
    }
  }

  /**
   * Set up resize observer to handle container size changes
   */
  setupResizeObserver() {
    // Clean up existing observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    // Create new observer
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.handleResize()
        }
      }
    })

    // Observe container
    if (this.container) {
      this.resizeObserver.observe(this.container)
    }

    // Initial resize
    this.handleResize()
  }

  /**
   * Handle container resize events
   */
  handleResize() {
    if (!this.yasguiInstance || !this.container) return

    // Get container dimensions
    const { width, height } = this.container.getBoundingClientRect()

    // Apply min-height to ensure the component is visible
    const wrapper = this.container.querySelector('.yasgui-wrapper')
    if (wrapper) {
      wrapper.style.minHeight = '500px'
      wrapper.style.height = `${height}px`
      wrapper.style.width = `${width}px`
    }

    // Force YASGUI to redraw
    if (this.yasguiInstance.store) {
      this.yasguiInstance.store.dispatch({
        type: 'YASGUI_RESIZE'
      })
    }
  }

  /**
   * Clean up the YASGUI component
   */
  async unmount() {
    if (!this.isMounted) return

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Clean up YASGUI instance
    if (this.yasguiInstance) {
      // No explicit destroy method, so we'll just remove references
      this.yasguiInstance = null
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = ''
    }

    await super.unmount()
    console.log('YASGUI plugin unmounted')
  }

  /**
   * Release all resources
   */
  async destroy() {
    await this.unmount()
    await super.destroy()
    console.log('YASGUI plugin destroyed')
  }

  /**
   * Handle SPARQL query execution
   * @param {Yasqe} yasqeInstance
   */
  async handleQuery(yasqeInstance) {
    // const endpoint = state.get('activeEndpointUrl'); // Old way
    const currentState = store.getState()
    const activeEndpoint = getActiveEndpoint(currentState, 'query')

    if (!activeEndpoint || !activeEndpoint.url) {
      errorHandler.handle(new Error('SPARQL endpoint not configured or inactive'), {
        showToUser: true,
        context: 'YasguiPlugin Query No Active Endpoint'
      })
      // Optionally display in YASR
      if (this.yasguiInstance && this.yasguiInstance.getTab() && this.yasguiInstance.getTab().yasr) {
        this.yasguiInstance.getTab().yasr.setResults({ error: { message: 'SPARQL endpoint not configured or inactive' } })
      }
      return
    }

    const endpointUrl = activeEndpoint.url
    // Use yasqeInstance provided, which should be the current tab's YASQE
    const yasr = this.yasguiInstance.getTab().yasr // Get YASR instance for results/errors

    try {
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
          // Include auth headers if needed, directly from YASQE's current config
          ...(yasqeInstance.options.requestConfig.headers || {})
        },
        body: yasqeInstance.getValue()
      }

      // Clear previous results/errors in YASR
      if (yasr) yasr.setResults(null)
      eventBus.emit(EVENTS.SPARQL_QUERY_START, { endpoint: endpointUrl })

      const response = await fetch(endpointUrl, requestOptions)

      if (!response.ok) {
        const errorText = await response.text()
        throw new SparqlError(`SPARQL endpoint error: ${response.status} ${response.statusText}`, {
          endpoint: endpointUrl,
          status: response.status,
          response: errorText
        })
      }

      const results = await response.json()
      if (yasr) yasr.setResults(results)
      eventBus.emit(EVENTS.SPARQL_QUERY_SUCCESS, { endpoint: endpointUrl, results })

    } catch (error) {
      eventBus.emit(EVENTS.SPARQL_QUERY_ERROR, { endpoint: endpointUrl, error })
      const handledError = errorHandler.handle(error, {
        showToUser: true, // Show SPARQL errors to user via notification system
        context: 'YasguiPlugin Query Execution'
      })
      // Display the error details in YASR
      if (yasr) {
        yasr.setResults({
          error: {
            message: handledError.getUserMessage ? handledError.getUserMessage() : handledError.message,
            details: handledError.details || {}
          }
        })
      }
    }
  }
}