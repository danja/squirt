// src/services/endpoints/endpoints-service.js - Updated loading sequence
import { ConfigError } from '../../core/errors/error-types.js'
import { eventBus, EVENTS } from '../../core/events/event-bus.js'
import { store } from '../../core/state/index.js'
import { setEndpoints, addEndpoint, removeEndpoint, updateEndpoint as updateEndpointAction } from '../../core/state/actions.js'
import { getEndpoints } from '../../core/state/selectors.js'
import config from '../../config.json' with { type: 'json' } // Direct import of the config file with type attribute

/**
 * Service for managing SPARQL endpoints
 */
export class EndpointsService {
  /**
   * Create a new EndpointsService
   * @param {Object} storageService - Storage service for persistence
   * @param {Function} testEndpointFn - Function to test endpoint connectivity
   */
  constructor(storageService, testEndpointFn) {
    this.storageService = storageService
    this.testEndpointFn = testEndpointFn
    this.STORAGE_KEY = 'endpoints'
    this.LAST_USED_KEY = 'lastUsedEndpoint'
    this.statusCheckInterval = 60000

    // Status check interval ID
    this.statusCheckIntervalId = null
  }

  /**
   * Initialize the endpoints service
   * @returns {Promise<Array>} Initialized endpoints
   */
  async initialize() {
    try {
      console.log('Initializing endpoints service...')

      // Try loading from the following sources in order:
      // 1. Last used endpoint from storage
      // 2. Config file
      // 3. Default hardcoded values

      // 1. Try to get last used endpoint
      const lastUsedEndpoint = this.loadLastUsedEndpoint()
      if (lastUsedEndpoint) {
        console.log('Using last used endpoint:', lastUsedEndpoint)
      }

      // 2. Load from config file
      const endpointsFromConfig = this.loadFromConfig()
      console.log('Endpoints from config:', endpointsFromConfig)

      // 3. Get stored endpoints (for merging)
      const storedEndpoints = this.loadFromStorage()

      // Merge endpoints, prioritizing last used, then stored, then config
      let endpoints = []

      if (lastUsedEndpoint) {
        // Add last used endpoint first
        endpoints.push(lastUsedEndpoint)
      }

      if (storedEndpoints && storedEndpoints.length > 0) {
        // Add other stored endpoints, avoiding duplicates
        const existingUrls = new Set(endpoints.map(e => e.url))
        storedEndpoints
          .filter(e => !existingUrls.has(e.url))
          .forEach(e => {
            endpoints.push(e)
            existingUrls.add(e.url)
          })
      }

      if (endpointsFromConfig && endpointsFromConfig.length > 0) {
        // Add config endpoints, avoiding duplicates
        const existingUrls = new Set(endpoints.map(e => e.url))
        endpointsFromConfig
          .filter(e => !existingUrls.has(e.url))
          .forEach(e => {
            endpoints.push(e)
            existingUrls.add(e.url)
          })
      }

      // If no endpoints found from any source, use defaults
      if (!endpoints || endpoints.length === 0) {
        console.warn('No endpoints found in any source, using hardcoded defaults')
        endpoints = this.getDefaultEndpoints()
      }

      console.log(`Loaded ${endpoints.length} endpoints`)

      // Update store with endpoints
      store.dispatch(setEndpoints(endpoints))

      // Save to storage
      this.saveToStorage()

      // Start status checks
      this.startStatusChecks()

      // Notify about unavailable endpoints
      const unavailableEndpoints = endpoints.filter(e => e.status === 'inactive')
      if (unavailableEndpoints.length > 0) {
        eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
          type: 'warning',
          message: `${unavailableEndpoints.length} endpoint(s) unavailable`,
          duration: 3000
        })
      }

      // Notify about successful connection
      const activeEndpoints = endpoints.filter(e => e.status === 'active')
      if (activeEndpoints.length > 0) {
        eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
          type: 'success',
          message: `Connected to ${activeEndpoints.length} endpoint(s)`
        })
      }

      return endpoints
    } catch (error) {
      console.error('Error initializing endpoints:', error)
      const fallback = this.getDefaultEndpoints()
      store.dispatch(setEndpoints(fallback))
      this.startStatusChecks()
      throw new ConfigError('Failed to initialize endpoints', {
        originalError: error
      })
    }
  }

  /**
   * Load last used endpoint from storage
   * @returns {Object|null} Last used endpoint or null
   */
  loadLastUsedEndpoint() {
    try {
      return this.storageService.getItem(this.LAST_USED_KEY)
    } catch (error) {
      console.error('Error loading last used endpoint from storage:', error)
      return null
    }
  }

  /**
   * Save the last used endpoint to storage
   * @param {Object} endpoint - The endpoint to save
   */
  saveLastUsedEndpoint(endpoint) {
    try {
      this.storageService.setItem(this.LAST_USED_KEY, endpoint)
    } catch (error) {
      console.error('Error saving last used endpoint to storage:', error)
    }
  }

  /**
   * Load endpoints from storage
   * @returns {Array|null} Endpoints from storage or null
   */
  loadFromStorage() {
    try {
      return this.storageService.getItem(this.STORAGE_KEY)
    } catch (error) {
      console.error('Error loading endpoints from storage:', error)
      return null
    }
  }

  /**
   * Load endpoints from configuration
   * @returns {Array} Endpoints from configuration
   */
  loadFromConfig() {
    try {
      // Use the directly imported config
      if (config) {
        // Handle both array format and object format with endpoints property
        const endpointsData = Array.isArray(config) ? config : config.endpoints

        if (Array.isArray(endpointsData)) {
          console.log('Found endpoints in config:', endpointsData)
          return endpointsData.map(endpoint => ({
            url: endpoint.url,
            label: endpoint.name || endpoint.label || 'Unnamed Endpoint',
            type: endpoint.type || 'query',
            credentials: endpoint.credentials,
            status: 'unknown'
          }))
        }
      }

      console.warn('Invalid or missing endpoints in config')
      return []
    } catch (error) {
      console.error('Error loading endpoints from config:', error)
      return []
    }
  }

  /**
   * Get default endpoints as fallback
   * @returns {Array} Default endpoints
   */
  getDefaultEndpoints() {
    console.warn('Using default endpoints as fallback')
    const fallbackQueryURL = 'http://hyperdata.it:3331/squirt/'
    const fallbackQueryLabel = `Query endpoint : ${fallbackQueryURL}`
    const fallbackUpdateURL = 'http://hyperdata.it:3331/squirt/'
    const fallbackUpdateLabel = `Update endpoint : ${fallbackUpdateURL}`
    return [
      {
        url: fallbackQueryURL,
        label: fallbackQueryLabel,
        type: 'query',
        status: 'unknown',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      },
      {
        url: fallbackUpdateURL,
        label: fallbackUpdateLabel,
        type: 'update',
        status: 'unknown',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      }
    ]
  }

  /**
   * Start periodic status checks
   */
  startStatusChecks() {
    // Clear existing interval if any
    if (this.statusCheckIntervalId) {
      clearInterval(this.statusCheckIntervalId)
    }

    // Perform initial check
    this.checkEndpointsHealth()

    // Setup interval for periodic checks
    this.statusCheckIntervalId = setInterval(() => {
      this.checkEndpointsHealth()
    }, this.statusCheckInterval)

    // Listen for check requests
    eventBus.on(EVENTS.ENDPOINT_CHECK_REQUESTED, () => {
      this.checkEndpointsHealth()
    })
  }

  /**
   * Save endpoints to storage
   */
  saveToStorage() {
    try {
      const endpoints = getEndpoints(store.getState())
      this.storageService.setItem(this.STORAGE_KEY, endpoints)
    } catch (error) {
      console.error('Error saving endpoints to storage:', error)
      throw error
    }
  }

  /**
   * Add a new endpoint
   * @param {string} url - Endpoint URL
   * @param {string} label - Endpoint label
   * @param {string} type - Endpoint type (query/update)
   * @param {Object} credentials - Endpoint credentials
   * @returns {Object} The new endpoint
   */
  addEndpoint(url, label, type = 'query', credentials = null) {
    const endpoints = getEndpoints(store.getState())

    // Check if endpoint already exists
    if (endpoints.some(e => e.url === url)) {
      throw new ConfigError(`Endpoint with URL ${url} already exists`)
    }

    const newEndpoint = {
      url,
      label,
      type,
      credentials,
      status: 'unknown',
      lastChecked: null
    }

    // Add to store
    store.dispatch(addEndpoint(newEndpoint))

    // Persist to storage
    this.saveToStorage()

    // Emit event
    eventBus.emit(EVENTS.ENDPOINT_ADDED, newEndpoint)

    // Show notification
    eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
      type: 'info',
      message: `Endpoint "${label}" added`,
      duration: 3000
    })

    // Check endpoint health
    this.checkEndpoint(url, credentials)

    return newEndpoint
  }

  /**
   * Remove an endpoint
   * @param {string} url - URL of endpoint to remove
   */
  removeEndpoint(url) {
    // Get endpoint before removal
    const endpoints = getEndpoints(store.getState())
    const endpoint = endpoints.find(e => e.url === url)

    // Remove from store
    store.dispatch(removeEndpoint(url))

    // Persist to storage
    this.saveToStorage()

    // Emit event
    eventBus.emit(EVENTS.ENDPOINT_REMOVED, { url })

    // Show notification if endpoint was found
    if (endpoint) {
      eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
        type: 'info',
        message: `Endpoint "${endpoint.label}" removed`,
        duration: 3000
      })
    }
  }

  /**
   * Update an endpoint
   * @param {string} url - URL of endpoint to update
   * @param {Object} updates - Properties to update
   */
  updateEndpoint(url, updates) {
    const endpoints = getEndpoints(store.getState())
    const oldEndpoint = endpoints.find(e => e.url === url)

    // Status change for notification
    const statusChanged = oldEndpoint &&
      updates.status &&
      oldEndpoint.status !== updates.status &&
      !['checking', 'unknown'].includes(updates.status)

    // Update in store
    store.dispatch(updateEndpointAction({
      url,
      updates
    }))

    // Get the updated endpoint
    const newEndpoints = getEndpoints(store.getState())
    const updatedEndpoint = newEndpoints.find(e => e.url === url)

    // If this is an active endpoint of a particular type, save it as last used
    if (updatedEndpoint && updatedEndpoint.status === 'active') {
      this.saveLastUsedEndpoint(updatedEndpoint)
    }

    // Persist to storage
    this.saveToStorage()

    // Emit event
    eventBus.emit(EVENTS.ENDPOINT_UPDATED, { url, updates })

    // Show notification for status changes
    if (statusChanged && updatedEndpoint) {
      const statusMsg = updates.status === 'active' ? 'is now active' : 'is unavailable'
      eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
        type: updates.status === 'active' ? 'success' : 'warning',
        message: `Endpoint "${updatedEndpoint.label}" ${statusMsg}`,
        duration: 3000
      })
    }
  }

  /**
   * Check an endpoint's status
   * @param {string} url - Endpoint URL
   * @param {Object} credentials - Optional credentials
   * @returns {Promise<boolean>} True if endpoint is active
   */
  async checkEndpoint(url, credentials = null) {
    const endpoints = getEndpoints(store.getState())
    const endpoint = endpoints.find(e => e.url === url)

    if (!endpoint) {
      throw new ConfigError(`Endpoint with URL ${url} not found`)
    }

    // Update status to checking
    this.updateEndpoint(url, { status: 'checking' })

    try {
      const status = await this.testEndpointFn(url, credentials || endpoint.credentials)

      // Update status based on test result
      this.updateEndpoint(url, {
        status: status ? 'active' : 'inactive',
        lastChecked: new Date().toISOString()
      })

      // Emit status change event
      eventBus.emit(EVENTS.ENDPOINT_STATUS_CHANGED, {
        url,
        status: status ? 'active' : 'inactive'
      })

      return status
    } catch (error) {
      console.error(`Error checking endpoint ${url}:`, error)

      // Update status to inactive with error
      this.updateEndpoint(url, {
        status: 'inactive',
        lastChecked: new Date().toISOString(),
        lastError: error.message
      })

      // Emit status change event with error
      eventBus.emit(EVENTS.ENDPOINT_STATUS_CHANGED, {
        url,
        status: 'inactive',
        error: error.message
      })

      return false
    }
  }

  /**
   * Check health of all endpoints
   * @returns {Promise<Object>} Health check results
   */
  async checkEndpointsHealth() {
    const endpoints = getEndpoints(store.getState())

    if (endpoints.length === 0) {
      console.log('No endpoints to check')
      return {
        success: false,
        message: 'No endpoints configured'
      }
    }

    console.log(`Checking health of ${endpoints.length} endpoints...`)

    // Set all endpoints to checking status
    endpoints.forEach(endpoint => {
      this.updateEndpoint(endpoint.url, { status: 'checking' })
    })

    // Check all endpoints
    try {
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const isActive = await this.testEndpointFn(endpoint.url, endpoint.credentials)

            this.updateEndpoint(endpoint.url, {
              status: isActive ? 'active' : 'inactive',
              lastChecked: new Date().toISOString()
            })

            return {
              url: endpoint.url,
              label: endpoint.label,
              type: endpoint.type,
              isActive,
              error: null
            }
          } catch (error) {
            console.error(`Error checking endpoint ${endpoint.url}:`, error)

            this.updateEndpoint(endpoint.url, {
              status: 'inactive',
              lastChecked: new Date().toISOString(),
              lastError: error.message
            })

            return {
              url: endpoint.url,
              label: endpoint.label,
              type: endpoint.type,
              isActive: false,
              error: error.message
            }
          }
        })
      )

      // Emit status checked event
      try {
        const anyActive = results.some(r => r.isActive)
        const queryActive = results.some(r => r.isActive && r.type === 'query')
        const updateActive = results.some(r => r.isActive && r.type === 'update')

        eventBus.emit(EVENTS.ENDPOINTS_STATUS_CHECKED, {
          results,
          anyActive,
          queryActive,
          updateActive
        })
      } catch (error) {
        console.error('Error dispatching endpoints status event:', error)
      }

      // Return results
      return {
        success: true,
        anyActive: results.some(r => r.isActive),
        queryActive: results.some(r => r.isActive && r.type === 'query'),
        updateActive: results.some(r => r.isActive && r.type === 'update'),
        results
      }
    } catch (error) {
      console.error('Error checking endpoints health:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Get active endpoint of specified type
   * @param {string} type - Endpoint type (query/update)
   * @returns {Object} Active endpoint or undefined
   */
  getActiveEndpoint(type) {
    const endpoints = getEndpoints(store.getState())
    return endpoints.find(e => e.type === type && e.status === 'active')
  }
}

/**
 * Create an endpoints service
 * @param {Object} storageService - Storage service
 * @param {Function} testEndpointFn - Function to test endpoint connectivity
 * @returns {EndpointsService} Endpoints service instance
 */
export function createEndpointsService(storageService, testEndpointFn) {
  return new EndpointsService(storageService, testEndpointFn)
}