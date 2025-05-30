import { EVENTS } from './event-constants.js'

/**
 * Simple event bus for pub/sub communication
 */
class EventBus {
  constructor() {
    this.listeners = new Map()
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event).add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(event)
        }
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    console.debug(`Event emitted: ${event}`, data)
    // Hard guard for notification event misuse
    if (
      event === EVENTS.NOTIFICATION_SHOW &&
      data &&
      typeof data === 'object' &&
      'action' in data &&
      'state' in data
    ) {
      console.error('[eventBus] FATAL: Someone is emitting a Redux state change as a notification event:', data)
      console.trace('Stack trace for FATAL notification event misuse')
      throw new Error('FATAL: Redux state change emitted as notification event. See stack trace above.')
    }
    // Guard for malformed notification events
    if (
      event === EVENTS.NOTIFICATION_SHOW &&
      (!data || typeof data.message !== 'string' || data.message.trim() === '')
    ) {
      console.error('[eventBus] Malformed notification event emitted:', data)
      console.trace('Stack trace for malformed notification event')
    }
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error)
        }
      })
    }
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} [event] - Event name (optional, removes all if not specified)
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

// Create singleton instance
export const eventBus = new EventBus()

// Export events
export { EVENTS } from './event-constants.js'