import { eventBus, EVENTS } from '../events/event-bus.js'

/**
 * Redux-like store for state management
 */
class Store {
  constructor(initialState = {}) {
    this.state = initialState
    this.listeners = new Set()
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return this.state
  }

  /**
   * Update state
   * @param {Object} update - State update
   */
  setState(update) {
    this.state = { ...this.state, ...update }
    this.notify()
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify listeners of state change
   */
  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Error in state listener:', error)
      }
    })

    // Emit state changed event
    eventBus.emit(EVENTS.STATE_CHANGED, this.state)
  }
}

// Initial application state
const initialState = {
  currentView: null,
  ui: {
    currentView: null,
    previousView: null,
    theme: 'light',
    notifications: []
  },
  endpoints: [],
  posts: []
}

// Create store instance
export const store = new Store(initialState)

// Helper actions
export const setCurrentView = (viewId) => {
  store.setState({
    ui: {
      ...store.getState().ui,
      previousView: store.getState().ui.currentView,
      currentView: viewId
    }
  })
}

export const setPosts = (posts) => {
  store.setState({ posts })
}

export const addPost = (post) => {
  const posts = [...store.getState().posts, post]
  store.setState({ posts })
}

export const setEndpoints = (endpoints) => {
  store.setState({ endpoints })
}

// Selectors (re-export)
export * from './selectors.js'
export * from './actions.js'