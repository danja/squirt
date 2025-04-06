// src/core/state/index.js
import { eventBus, EVENTS } from '../events/event-bus.js';

/**
 * Simple state management store
 */
class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = new Set();
  }
  
  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Update state
   * @param {Object} update - State update
   */
  setState(update) {
    this.state = { ...this.state, ...update };
    this.notify();
  }
  
  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Notify listeners of state change
   */
  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
    
    // Emit state change event
    eventBus.emit(EVENTS.STATE_CHANGED, this.state);
  }
}

// Initial state
const initialState = {
  currentView: null,
  endpoints: [],
  posts: [],
  notifications: []
};

// Create singleton store
export const store = new Store(initialState);

// Action creators
export const setCurrentView = (viewId) => {
  store.setState({ 
    previousView: store.getState().currentView,
    currentView: viewId 
  });
};

export const setPosts = (posts) => {
  store.setState({ posts });
};

export const addPost = (post) => {
  const posts = [...store.getState().posts, post];
  store.setState({ posts });
};

export const setEndpoints = (endpoints) => {
  store.setState({ endpoints });
};

// Selectors
export const getCurrentView = (state) => state.currentView;
export const getPreviousView = (state) => state.previousView;
export const getEndpoints = (state) => state.endpoints;
export const getPosts = (state) => state.posts;
export const getNotifications = (state) => state.notifications;