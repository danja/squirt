// src/core/events/event-bus.js
/**
 * A simple event bus implementation to decouple components
 * and break circular dependencies
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to an event and unsubscribe after it fires once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback(...args);
    });
    
    return unsubscribe;
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Create and export singleton instance
export const eventBus = new EventBus();

// Export event type constants
export const EVENTS = {
  // State events
  STATE_CHANGED: 'state:changed',
  
  // RDF model events
  POST_CREATED: 'rdf:post:created',
  POST_UPDATED: 'rdf:post:updated',
  POST_DELETED: 'rdf:post:deleted',
  MODEL_SYNCED: 'rdf:model:synced',
  
  // Endpoint events
  ENDPOINT_ADDED: 'endpoint:added',
  ENDPOINT_REMOVED: 'endpoint:removed',
  ENDPOINT_UPDATED: 'endpoint:updated',
  ENDPOINT_STATUS_CHANGED: 'endpoint:status:changed',
  
  // UI events
  VIEW_CHANGED: 'ui:view:changed',
  NOTIFICATION_SHOW: 'ui:notification:show',
  FORM_SUBMITTED: 'ui:form:submitted',
  
  // Error events
  ERROR_OCCURRED: 'error:occurred'
};
