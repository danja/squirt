/**
 * Simple state management for backwards compatibility
 */
export class StateManager {
    constructor() {
        this.state = {
            endpoints: [],
            currentView: null,
            user: null,
            posts: [],
            drafts: []
        }
        this.listeners = new Map()
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key
     * @param {Function} callback - Change handler
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set())
        }
        this.listeners.get(key).add(callback)
    }

    /**
     * Update state
     * @param {string} key - State key
     * @param {*} value - New value
     */
    update(key, value) {
        this.state[key] = value
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => callback(value))
        }
    }

    /**
     * Get state value
     * @param {string} key - State key
     * @returns {*} State value
     */
    get(key) {
        return this.state[key]
    }
}

// Create singleton instance
export const state = new StateManager()