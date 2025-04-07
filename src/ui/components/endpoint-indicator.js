import { eventBus, EVENTS } from '../../core/events/event-bus.js'
import { store } from '../../core/state/index.js'
import { getEndpoints } from '../../core/state/selectors.js'

/**
 * Component for displaying endpoint status in the UI
 */
export class EndpointStatusIndicator {
  constructor() {
    // Bind methods
    this.handleEndpointChange = this.handleEndpointChange.bind(this)
    this.handleStatusChangeEvent = this.handleStatusChangeEvent.bind(this)
    this.handleStatusCheckedEvent = this.handleStatusCheckedEvent.bind(this)
    this.checkEndpoints = this.checkEndpoints.bind(this)

    this.indicator = document.getElementById('endpoint-status-indicator')

    if (!this.indicator) {
      console.error('Endpoint status indicator element not found')
      return
    }

    // Get status light element
    this.statusLight = this.indicator.querySelector('.status-light')

    // Initialize with checking status
    this.updateStatus('checking', 'Checking endpoint status...')

    // Subscribe to endpoint changes in the store
    store.subscribe(this.handleEndpointChange)

    // Subscribe to endpoint status events
    eventBus.on(EVENTS.ENDPOINT_STATUS_CHANGED, this.handleStatusChangeEvent)
    eventBus.on(EVENTS.ENDPOINTS_STATUS_CHECKED, this.handleStatusCheckedEvent)

    // Make the indicator clickable to trigger endpoint checks
    this.indicator.addEventListener('click', this.checkEndpoints)

    // Initial check
    setTimeout(this.checkEndpoints, 1000)
  }

  /**
   * Handle changes to endpoints in the store
   * @param {Object} state - Current state
   */
  handleEndpointChange(state) {
    try {
      const endpoints = getEndpoints(state)

      if (!endpoints || endpoints.length === 0) {
        this.updateStatus('inactive', 'No endpoints configured')
        return
      }

      const activeEndpoint = endpoints.find(e => e.status === 'active')
      if (activeEndpoint) {
        this.updateStatus('active', `SPARQL endpoint available: ${activeEndpoint.url}`)
      } else if (endpoints.some(e => e.status === 'checking')) {
        this.updateStatus('checking', 'Checking endpoints...')
      } else {
        this.updateStatus('inactive', 'No available endpoints')
      }
    } catch (error) {
      console.error('Error handling endpoint change:', error)
    }
  }

  /**
   * Handle endpoint status change events
   * @param {Object} event - Event data
   */
  handleStatusChangeEvent(data) {
    try {
      if (data) {
        const { status, url } = data

        if (status === 'active') {
          this.updateStatus('active', `SPARQL endpoint available: ${url}`)
        } else if (status === 'checking') {
          this.updateStatus('checking', 'Checking endpoint...')
        } else {
          this.updateStatus('inactive', `Endpoint unavailable: ${url}`)
        }
      }
    } catch (error) {
      console.error('Error handling status change event:', error)
    }
  }

  /**
   * Handle endpoint status checked events
   * @param {Object} data - Event data
   */
  handleStatusCheckedEvent(data) {
    try {
      if (data && data.anyActive) {
        // At least one endpoint is active
        const endpoints = getEndpoints(store.getState())
        const activeEndpoint = endpoints.find(e => e.status === 'active')

        if (activeEndpoint) {
          this.updateStatus('active', `SPARQL endpoint available: ${activeEndpoint.url}`)
        } else {
          this.updateStatus('active', 'SPARQL endpoint is available')
        }
      } else {
        this.updateStatus('inactive', 'No available endpoints')
      }
    } catch (error) {
      console.error('Error handling status checked event:', error)
    }
  }

  /**
   * Request endpoint check
   */
  checkEndpoints() {
    try {
      this.updateStatus('checking', 'Checking endpoints...')

      // Emit event to request endpoint check
      eventBus.emit(EVENTS.ENDPOINT_CHECK_REQUESTED)
    } catch (error) {
      console.error('Error requesting endpoint check:', error)
    }
  }

  /**
   * Update the status indicator
   * @param {string} status - Status value ('active', 'inactive', 'checking')
   * @param {string} message - Status message or tooltip
   */
  updateStatus(status, message = '') {
    try {
      if (!this.statusLight) return

      // Remove all status classes
      this.statusLight.classList.remove('active', 'inactive', 'checking')

      // Add the new status class
      this.statusLight.classList.add(status)

      // Set the tooltip
      this.indicator.title = message || status
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }
}

/**
 * Initialize the endpoint status indicator
 * @returns {EndpointStatusIndicator|null}
 */
export function initializeEndpointIndicator() {
  try {
    return new EndpointStatusIndicator()
  } catch (error) {
    console.error('Error initializing endpoint indicator:', error)
    return null
  }
}