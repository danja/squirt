// src/ui/router.js
import { eventBus, EVENTS } from '../core/events/event-bus.js'
import { errorHandler } from '../core/errors/index.js'
import { state } from '../core/state.js'

// View Constants
const VIEWS = {
    POST: 'post-view',
    WIKI: 'wiki-view',
    CHAT: 'chat-view',
    YASGUI: 'yasgui-view',
    DEVELOPER: 'developer-view',
    PROFILE: 'profile-view',
    SETTINGS: 'settings-view'
}

// Route mapping
const ROUTE_MAP = {
    'post': VIEWS.POST,
    'wiki': VIEWS.WIKI,
    'chat': VIEWS.CHAT,
    'sparql': VIEWS.YASGUI,
    'dev': VIEWS.DEVELOPER,
    'profile': VIEWS.PROFILE,
    'settings': VIEWS.SETTINGS
}

// Lazy-loaded view modules
const VIEW_MODULES = {
    [VIEWS.POST]: () => import('./views/post-view.js'),
    [VIEWS.WIKI]: () => import('./views/wiki-view.js'),
    [VIEWS.CHAT]: () => import('./views/chat-view.js'),
    [VIEWS.YASGUI]: () => import('./views/yasgui-view.js'),
    [VIEWS.DEVELOPER]: () => import('./views/developer-view.js'),
    [VIEWS.PROFILE]: () => import('./views/profile-view.js'),
    [VIEWS.SETTINGS]: () => import('./views/settings-view.js')
}

// Active view handlers
const activeViewHandlers = {}

/**
 * Initialize the router
 */
export function initRouter() {
    // Listen for hash changes
    window.addEventListener('hashchange', handleRouteChange)

    // Handle initial route
    handleRouteChange()

    // Setup navigation links
    setupNavLinks()
}

/**
 * Handle route changes
 */
function handleRouteChange() {
    try {
        const hash = window.location.hash.slice(1) || 'post'
        const viewId = ROUTE_MAP[hash] || VIEWS.POST

        const currentView = state.get('currentView')

        // Skip if already on the same view
        if (currentView === viewId) {
            return
        }

        // Create route change event
        const event = new CustomEvent('routeChange', {
            detail: {
                from: currentView,
                to: viewId
            },
            cancelable: true
        })

        // Allow event to be canceled
        if (!document.dispatchEvent(event)) {
            // Revert to previous hash if canceled
            if (currentView) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === currentView)
                if (route) {
                    window.location.hash = route
                }
            }
            return
        }

        // Update state using state manager's update method instead of store.dispatch
        state.update('currentView', viewId)

        // Also update UI state if that's in a different structure
        if (state.get('ui')) {
            state.update('ui', {
                ...state.get('ui'),
                previousView: state.get('ui')?.currentView,
                currentView: viewId
            })
        }

        // Show the view in UI
        showView(viewId)

        // Initialize view if needed
        initializeView(viewId)

        // Update active navigation link
        updateActiveNavLink(viewId)

        // Emit view changed event
        eventBus.emit(EVENTS.VIEW_CHANGED, {
            from: currentView,
            to: viewId
        })
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Route change'
        })

        // Redirect to main view if error
        if (window.location.hash !== '#post') {
            window.location.hash = 'post'
        }
    }
}

/**
 * Show the specified view and hide others
 * @param {string} viewId - ID of the view to show
 */
function showView(viewId) {
    Object.values(VIEWS).forEach(id => {
        const view = document.getElementById(id)
        if (view) {
            view.classList.toggle('hidden', id !== viewId)
        }
    })
}

/**
 * Initialize a view if it hasn't been initialized yet
 * @param {string} viewId - ID of the view to initialize
 */
async function initializeView(viewId) {
    try {
        // Check if view is already initialized
        if (activeViewHandlers[viewId]) {
            // Just update if already initialized
            if (typeof activeViewHandlers[viewId].update === 'function') {
                activeViewHandlers[viewId].update()
            }
            return
        }

        // Get module loader for the view
        const moduleLoader = VIEW_MODULES[viewId]
        if (!moduleLoader) {
            console.warn(`No module defined for view ${viewId}`)
            return
        }

        // Load the view module
        const module = await moduleLoader()

        // Initialize the view
        if (typeof module.initView === 'function') {
            activeViewHandlers[viewId] = module.initView() || {}
        } else {
            console.warn(`No initView function in module for ${viewId}`)
            activeViewHandlers[viewId] = {}
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: `Initializing view ${viewId}`
        })
    }
}

/**
 * Update the active state of navigation links
 * @param {string} viewId - ID of the active view
 */
function updateActiveNavLink(viewId) {
    document.querySelectorAll('nav a').forEach(link => {
        const linkViewId = link.getAttribute('data-view')
        link.classList.toggle('active', linkViewId === viewId)
    })
}

/**
 * Setup navigation link event handlers
 */
function setupNavLinks() {
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const viewId = e.target.getAttribute('data-view')
            if (viewId) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === viewId)
                if (route) {
                    window.location.hash = route
                }

                // Hide mobile menu if active
                const menu = document.querySelector('.hamburger-menu')
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active')
                    document.querySelector('nav').classList.remove('visible')
                }
            }
        })
    })
}

export { VIEWS, ROUTE_MAP }