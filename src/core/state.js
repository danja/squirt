import { store } from './state/index.js'
import * as actions from './state/actions.js'

/**
 * @deprecated Use Redux store and actions directly instead.
 * Import from './state/index.js' for store and selectors.
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

        // Initialize with Redux store state
        this.state = { ...store.getState() }

        // Subscribe to Redux store updates
        store.subscribe(() => {
            const newState = store.getState()

            // Find which keys changed
            const changedKeys = Object.keys(newState).filter(
                key => newState[key] !== this.state[key]
            )

            // Update local state
            this.state = { ...newState }

            // Notify listeners of changes
            for (const key of changedKeys) {
                const listenerSet = this.listeners.get(key)
                if (listenerSet) {
                    listenerSet.forEach(listener => {
                        try {
                            listener(newState[key])
                        } catch (error) {
                            console.error('Error in state listener:', error)
                        }
                    })
                }
            }
        })
    }

    /**
     * @deprecated Use store.subscribe() directly
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set())
        }
        this.listeners.get(key).add(callback)

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(key)
            if (listeners) {
                listeners.delete(callback)
                if (listeners.size === 0) {
                    this.listeners.delete(key)
                }
            }
        }
    }

    /**
     * @deprecated Use Redux actions directly
     */
    update(key, value) {
        // Translate to Redux actions for specific keys
        switch (key) {
            case 'currentView':
                store.dispatch(actions.setCurrentView(value))
                break
            case 'posts':
                store.dispatch(actions.setPosts(value))
                break
            case 'endpoints':
                store.dispatch(actions.setEndpoints(value))
                break
            case 'ui':
                // Handle nested ui state
                if (value && value.theme) {
                    store.dispatch(actions.setTheme(value.theme))
                }
                if (value && value.currentView) {
                    store.dispatch(actions.setCurrentView(value.currentView))
                }
                // Handle notifications if needed
                if (value && value.notifications) {
                    value.notifications.forEach(notification => {
                        store.dispatch(actions.showNotification(notification))
                    })
                }
                break
            default:
                console.warn(`No specific action found for state key: ${key}. State update may be lost.`)
                break
        }
    }

    /**
     * @deprecated Use Redux selectors directly
     */
    get(key) {
        return this.state[key]
    }
}

// Export the singleton instance for backward compatibility
export const state = new StateManager()

// Also export the Redux store for direct access in new code
export { store }