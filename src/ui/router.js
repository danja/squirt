import { eventBus, EVENTS } from '../core/events/event-bus.js'
import { errorHandler } from '../core/errors/index.js'
import { store } from '../core/state/index.js'
import { setCurrentView } from '../core/state/actions.js'
import { getCurrentView } from '../core/state/selectors.js'

/**
 * View constants
 * @type {Object}
 */
const VIEWS = {
    POST: 'post-view',
    WIKI: 'wiki-view',
    CHAT: 'chat-view',
    YASGUI: 'yasgui-view',
    DEVELOPER: 'developer-view',
    PROFILE: 'profile-view',
    SETTINGS: 'settings-view'
}

/**
 * Map hash routes to view IDs
 * @type {Object}
 */
const ROUTE_MAP = {
    'post': VIEWS.POST,
    'wiki': VIEWS.WIKI,
    'chat': VIEWS.CHAT,
    'sparql': VIEWS.YASGUI,
    'dev': VIEWS.DEVELOPER,
    'profile': VIEWS.PROFILE,
    'settings': VIEWS.SETTINGS
}

/**
 * Map view IDs to module imports
 * @type {Object}
 */
const VIEW_MODULES = {
    [VIEWS.POST]: () => import('./views/post-view.js'),
    [VIEWS.WIKI]: () => import('./views/wiki-view.js'),
    [VIEWS.CHAT]: () => import('./views/chat-view.js'),
    [VIEWS.YASGUI]: () => import('./views/yasgui-view.js'),
    [VIEWS.DEVELOPER]: () => import('./views/developer-view.js'),
    [VIEWS.PROFILE]: () => import('./views/profile-view.js'),
    [VIEWS.SETTINGS]: () => import('./views/settings-view.js')
}

/**
 * Store for active view handlers
 * @type {Object}
 */
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

        const currentView = getCurrentView(store.getState())

        // Skip if already on this view
        if (currentView === viewId) {
            return
        }

        // Create custom event for route change
        const event = new CustomEvent('routeChange', {
            detail: {
                from: currentView,
                to: viewId
            },
            cancelable: true
        })

        // Allow other components to cancel navigation
        if (!document.dispatchEvent(event)) {
            // Navigation was canceled, restore previous hash
            if (currentView) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === currentView)
                if (route) {
                    window.location.hash = route
                }
            }
            return
        }

        // Update store with new view
        store.dispatch(setCurrentView(viewId))

        // Show the selected view
        showView(viewId)

        // Initialize the view if needed
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

        // Fallback to post view on error
        if (window.location.hash !== '#post') {
            window.location.hash = 'post'
        }
    }
}

/**
 * Show a view and hide others
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
 * Initialize a view
 * @param {string} viewId - ID of the view to initialize
 */
async function initializeView(viewId) {
    try {
        // Check if view already initialized
        if (activeViewHandlers[viewId]) {
            // Update view if it has an update method
            if (typeof activeViewHandlers[viewId].update === 'function') {
                activeViewHandlers[viewId].update()
            }
            return
        }

        // Get module loader for this view
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
 * Update active navigation link
 * @param {string} viewId - ID of the active view
 */
function updateActiveNavLink(viewId) {
    document.querySelectorAll('nav a').forEach(link => {
        const linkViewId = link.getAttribute('data-view')
        link.classList.toggle('active', linkViewId === viewId)
    })
}

/**
 * Setup navigation links
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

                // Close mobile menu if open
                const menu = document.querySelector('.hamburger-menu')
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active')
                    document.querySelector('nav').classList.remove('visible')
                }
            }
        })
    })
}

// Export for use in other modules
export { VIEWS, ROUTE_MAP }