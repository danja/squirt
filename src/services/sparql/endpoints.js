// src/js/services/sparql/endpoints.js
// import { state } from '../../core/state.js'; // Remove legacy state
import { store } from '../../core/state/index.js' // Import Redux store
import * as actions from '../../core/state/actions.js' // Import actions
import { getEndpoints, getActiveEndpoint as getActiveEndpointSelector } from '../../core/state/selectors.js' // Import selectors

import { testEndpoint } from './sparql-service.js' // Import testEndpoint from its new location
// import { ErrorHandler } from '../../core/errors.js'; // Remove old error handler
import { errorHandler } from '../../core/errors/index.js' // Import new error handler
import { eventBus, EVENTS } from '../../core/events/event-bus.js' // Import event bus

// Keep error type imports if needed for specific error handling inside the class
import { RDFError } from '../../core/errors/error-types.js'

export class EndpointManager {
  /**
   * Creates an instance of EndpointManager.
   * @param {object} store - The Redux store instance.
   * @param {object} errorHandler - The error handler instance.
   * @param {object} eventBus - The event bus instance.
   * @param {function} testEndpointFn - Function to test endpoint status.
   */
  constructor(store, errorHandler, eventBus, testEndpointFn) {
    if (!store || !errorHandler || !eventBus || !testEndpointFn) {
      throw new Error('EndpointManager requires store, errorHandler, eventBus, and testEndpointFn dependencies.')
    }
    this.store = store
    this.errorHandler = errorHandler
    this.eventBus = eventBus
    this.testEndpointFn = testEndpointFn

    this.STORAGE_KEY = 'squirt_endpoints'
    this.statusCheckInterval = 60000 // 1 minute
    this.intervalId = null

    // Listen for requests to check a specific endpoint
    this.unsubscribeCheckRequested = this.eventBus.on(EVENTS.ENDPOINT_CHECK_REQUESTED,
      (payload) => this.handleCheckRequest(payload)
    )
    console.log('EndpointManager constructed and listening for check requests.')
  }

  async initialize() {
    try {
      console.log('Initializing endpoints manager...')
      const endpointsFromFile = this.loadFromConfig()
      const storedEndpoints = this.loadFromStorage()
      let finalEndpoints = endpointsFromFile
      if (storedEndpoints && storedEndpoints.length > 0) {
        const storedUrls = new Set(storedEndpoints.map(e => e.url))
        const newEndpoints = endpointsFromFile.filter(e => !storedUrls.has(e.url))
        finalEndpoints = [...storedEndpoints, ...newEndpoints]
      }
      if (!finalEndpoints || finalEndpoints.length === 0) {
        console.warn('No endpoints found, using defaults')
        finalEndpoints = this.getDefaultEndpoints()
      }
      console.log(`Loaded ${finalEndpoints.length} endpoints`)

      // Use injected store and actions reference from store?
      // Assuming actions are available or passed if needed, or dispatch raw objects
      this.store.dispatch({ type: 'SET_ENDPOINTS', payload: finalEndpoints }) // Dispatch raw action

      await this.startStatusChecks()
      return finalEndpoints
    } catch (error) {
      console.error('Error initializing endpoints:', error)
      // Use injected error handler
      this.errorHandler.handle(error, { context: 'EndpointManager Initialize', showToUser: true })
      const fallback = this.getDefaultEndpoints()
      this.store.dispatch({ type: 'SET_ENDPOINTS', payload: fallback })
      await this.startStatusChecks()
      return fallback
    }
  }

  // Uses this.errorHandler
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : null
      if (Array.isArray(parsed) && parsed.every(e => e.url && e.label && e.type)) {
        return parsed
      }
      console.warn('Invalid endpoint data found in localStorage, ignoring.')
      localStorage.removeItem(this.STORAGE_KEY)
      return null
    } catch (error) {
      console.error('Error loading endpoints from storage:', error)
      // Use injected error handler
      this.errorHandler.handle(error, { context: 'EndpointManager LoadStorage', showToUser: false })
      return null
    }
  }

  // Uses this.errorHandler
  loadFromConfig() {
    try {
      let config = []
      try {
        console.warn('Dynamic require("../../config.json") used in loadFromConfig.')
        // config = require('../../config.json'); // Still potentially problematic
      } catch (importError) {
        console.log('No config.json found or failed to load.')
      }
      // ... (rest of config processing) ...
      if (Array.isArray(config) && config.length > 0) {
        console.log('Found endpoints in config.json:', config)
        return config.map(endpoint => ({
          url: endpoint.url, label: endpoint.name || endpoint.label, type: endpoint.type,
          credentials: endpoint.credentials, status: 'unknown'
        }))
      } else {
        return []
      }
    } catch (error) {
      console.error('Error processing endpoint config:', error)
      // Use injected error handler
      this.errorHandler.handle(error, { context: 'EndpointManager LoadConfig', showToUser: false })
      return []
    }
  }

  // No dependencies
  getDefaultEndpoints() {
    console.warn('Using default endpoints as fallback')
    return [
      {
        url: 'http://localhost:3030/semem/query',
        label: 'Local Query Endpoint',
        type: 'query',
        status: 'unknown',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      },
      {
        url: 'http://localhost:3030/semem/update',
        label: 'Local Update Endpoint',
        type: 'update',
        status: 'unknown',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      }
    ]
  }

  // Uses this.store, this.handleCheckRequest, this.saveToStorage, this.eventBus
  async startStatusChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    const checkAll = async () => {
      // Use injected store and assume getEndpoints selector is available via store or passed in
      // For simplicity, access state directly: 
      const currentEndpoints = this.store.getState().endpoints || []
      if (!currentEndpoints || currentEndpoints.length === 0) return
      console.log(`Checking status of ${currentEndpoints.length} endpoints...`)

      const checkPromises = currentEndpoints.map(endpoint =>
        this.handleCheckRequest({ url: endpoint.url, credentials: endpoint.credentials }, false)
      )
      await Promise.allSettled(checkPromises)
      this.saveToStorage()

      // Use injected eventBus and assume EVENTS const is available
      this.eventBus.emit('ENDPOINTS_STATUS_CHECKED', { // Use raw event name string
        endpoints: this.store.getState().endpoints || [],
      })
    }
    await checkAll()
    this.intervalId = setInterval(checkAll, this.statusCheckInterval)
    console.log(`Endpoint status checks started (Interval ID: ${this.intervalId})`)
  }

  // Uses this.intervalId, this.unsubscribeCheckRequested
  stopStatusChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Endpoint status checks stopped.')
    }
    if (this.unsubscribeCheckRequested) {
      this.unsubscribeCheckRequested()
      this.unsubscribeCheckRequested = null
      console.log('Unsubscribed from ENDPOINT_CHECK_REQUESTED event.')
    }
  }

  // Uses this.store, this.errorHandler
  saveToStorage() {
    try {
      const currentEndpoints = this.store.getState().endpoints || []
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentEndpoints))
    } catch (error) {
      console.error('Error saving endpoints to storage:', error)
      // Use injected error handler
      this.errorHandler.handle(error, { context: 'EndpointManager SaveStorage', showToUser: true })
    }
  }

  // Uses this.store, this.testEndpointFn, this.saveToStorage
  async handleCheckRequest(payload, save = true) {
    if (!payload || !payload.url) {
      console.warn('handleCheckRequest received invalid payload')
      return
    }
    const { url, credentials } = payload
    console.log(`Handling check request for: ${url}`)

    // Dispatch raw action
    this.store.dispatch({ type: 'UPDATE_ENDPOINT', payload: { url, updates: { status: 'checking' } } })

    let isActive = false
    try {
      // Use injected test function
      isActive = await this.testEndpointFn(url, credentials)
      console.log(`Check result for ${url}: ${isActive}`)
    } catch (error) {
      console.error(`Error testing endpoint ${url} during check request:`, error)
      isActive = false
      // Note: testEndpointFn or querySparql should ideally call errorHandler internally
    }

    // Dispatch final status update (raw action)
    this.store.dispatch({
      type: 'UPDATE_ENDPOINT', payload: {
        url: url,
        updates: {
          status: isActive ? 'active' : 'inactive',
          lastChecked: new Date().toISOString()
        }
      }
    })

    if (save) {
      this.saveToStorage()
    }
  }

  // Uses this.store, this.errorHandler, this.eventBus, this.saveToStorage
  addEndpoint(url, label, type = 'query', credentials = null) {
    const currentEndpoints = this.store.getState().endpoints || []
    if (currentEndpoints.some(e => e.url === url)) {
      const errorMsg = `Endpoint with URL ${url} already exists`
      // Use injected error handler
      this.errorHandler.handle(new Error(errorMsg), { context: 'EndpointManager AddEndpoint Duplicate', showToUser: true })
      throw new Error(errorMsg)
    }
    const newEndpoint = {
      url, label, type, credentials, status: 'unknown', lastChecked: null
    }
    // Dispatch raw action
    this.store.dispatch({ type: 'ADD_ENDPOINT', payload: newEndpoint })
    this.saveToStorage()

    console.log(`Requesting immediate check for newly added endpoint: ${url}`)
    // Use injected eventBus
    this.eventBus.emit('ENDPOINT_CHECK_REQUESTED', { url, credentials }) // Use raw event name
  }

  // Uses this.store, this.saveToStorage
  removeEndpoint(url) {
    // Dispatch raw action
    this.store.dispatch({ type: 'REMOVE_ENDPOINT', payload: url })
    this.saveToStorage()
  }

  // Uses this.store, this.saveToStorage
  updateEndpoint(url, updates) {
    // Dispatch raw action
    this.store.dispatch({ type: 'UPDATE_ENDPOINT', payload: { url, updates } })
    this.saveToStorage()
  }

  // Uses this.store (assumes getActiveEndpoint selector is available via store or passed in)
  getActiveEndpoint(type) {
    // Simplest access: read directly from state via store
    const endpoints = this.store.getState().endpoints || []
    return endpoints.find(e => e.type === type && e.status === 'active')
    // Or: if selectors are attached to store: return this.store.selectors.getActiveEndpoint(type);
  }

  // Uses this.store, this.testEndpointFn, this.errorHandler, this.eventBus, this.saveToStorage
  async checkEndpointsHealth() {
    const currentEndpoints = this.store.getState().endpoints || []
    if (currentEndpoints.length === 0) {
      return { success: true, message: 'No endpoints configured', results: [] }
    }
    // Dispatch checking status (raw actions)
    const checkingUpdates = currentEndpoints.map(endpoint => ({ type: 'UPDATE_ENDPOINT', payload: { url: endpoint.url, updates: { status: 'checking' } } }))
    checkingUpdates.forEach(action => this.store.dispatch(action))

    const results = await Promise.allSettled(
      currentEndpoints.map(endpoint =>
        // Use injected test function
        this.testEndpointFn(endpoint.url, endpoint.credentials).then(isActive => ({
          url: endpoint.url, label: endpoint.label, type: endpoint.type, isActive
        }))
      )
    )

    const finalUpdates = []
    const reportResults = []
    let overallSuccess = true
    results.forEach((result, index) => {
      const endpoint = currentEndpoints[index]
      let finalStatus = 'inactive'
      let checkError = null
      let isActive = false
      if (result.status === 'fulfilled') {
        isActive = result.value.isActive
        finalStatus = isActive ? 'active' : 'inactive'
        reportResults.push({ ...result.value, error: null })
      } else {
        // Use injected error handler
        this.errorHandler.handle(result.reason, { showToUser: false, context: `Health Check Failed: ${endpoint.url}` })
        finalStatus = 'inactive'
        checkError = result.reason?.message || 'Check failed'
        reportResults.push({ url: endpoint.url, label: endpoint.label, type: endpoint.type, isActive: false, error: checkError })
        overallSuccess = false
      }
      finalUpdates.push({ type: 'UPDATE_ENDPOINT', payload: { url: endpoint.url, updates: { status: finalStatus, lastChecked: new Date().toISOString() } } })
    })
    if (finalUpdates.length > 0) {
      finalUpdates.forEach(action => this.store.dispatch(action))
      this.saveToStorage()
    }
    // Use injected eventBus
    this.eventBus.emit('ENDPOINTS_HEALTH_CHECKED', { success: overallSuccess, results: reportResults }) // Use raw event name
    return { success: overallSuccess, message: overallSuccess ? 'All checks completed' : 'Some endpoint checks failed', results: reportResults }
  }

  // Uses this.errorHandler
  clearStorage() {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('Endpoints cleared from local storage.')
    } catch (error) {
      console.error('Error clearing endpoint storage:', error)
      // Use injected error handler
      this.errorHandler.handle(error, { context: 'EndpointManager ClearStorage', showToUser: true })
    }
  }
}

// Removed handleCheckRequest as logic is in the event listener setup
// Removed explicit checkEndpoint method, use testEndpointFn directly or via handleCheckRequest

// Optional: Export a singleton instance if needed elsewhere, otherwise instantiate where needed.
// export const endpointManager = new EndpointManager();