// src/ui/router.js - Updated to use Redux-style store instead of deprecated StateManager
import { eventBus, EVENTS } from '../core/events/event-bus.js'
import { errorHandler } from '../core/errors/index.js'
import { store } from '../core/state/index.js'
import { setCurrentView } from '../core/state/actions.js'
import { getCurrentView } from '../core/state/selectors.js'

// View IDs
const VIEWS = {
    POST: 'post-view',
    WIKI: 'wiki-view',
    CHAT: 'chat-view',
    YASGUI: 'yasgui-view',
    DEVELOPER: 'developer-view',
    PROFILE: 'profile-view',
    SETTINGS: 'settings-view'
}

// Map routes to view IDs
const ROUTE_MAP = {
    'post': VIEWS.POST,
    'wiki': VIEWS.WIKI,
    'chat': VIEWS.CHAT,
    'sparql': VIEWS.YASGUI,
    'dev': VIEWS.DEVELOPER,
    'profile': VIEWS.PROFILE,
    'settings': VIEWS.SETTINGS
}

// Map views to module loaders
const VIEW_MODULES = {
    [VIEWS.POST]: () => import('./views/post-view.js'),
    [VIEWS.WIKI]: () => import('./views/wiki-view.js'),
    [VIEWS.CHAT]: () => import('./views/chat-view.js'),
    // [VIEWS.YASGUI]: () => import('./views/yasgui-view.js'),
    [VIEWS.DEVELOPER]: () => import('./views/developer-view.js'),
    [VIEWS.PROFILE]: () => import('./views/profile-view.js'),
    [VIEWS.SETTINGS]: () => import('./views/settings-view.js')
}

// Store active view handlers
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

        // Skip if view hasn't changed
        if (currentView === viewId) {
            return
        }

        // Create and dispatch route change event
        const event = new CustomEvent('routeChange', {
            detail: {
                from: currentView,
                to: viewId
            },
            cancelable: true
        })

        // If event is cancelled, restore previous route
        if (!document.dispatchEvent(event)) {
            if (currentView) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === currentView)
                if (route) {
                    window.location.hash = route
                }
            }
            return
        }

        // Update state with new view
        store.dispatch(setCurrentView(viewId))

        // Show the selected view
        showView(viewId)

        // Initialize the view module
        initializeView(viewId)

        // Update active nav link
        updateActiveNavLink(viewId)

        // Emit view change event
        eventBus.emit(EVENTS.VIEW_CHANGED, {
            from: currentView,
            to: viewId
        })
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Route change'
        })

        // Fallback to post view if error occurs
        if (window.location.hash !== '#post') {
            window.location.hash = 'post'
        }
    }
}

/**
 * Show the selected view, hide others
 * @param {string} viewId - ID of view to show
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
 * Initialize or update a view
 * @param {string} viewId - ID of view to initialize
 */
async function initializeView(viewId) {
    try {
        // If view is already initialized, just update it
        if (activeViewHandlers[viewId]) {
            if (typeof activeViewHandlers[viewId].update === 'function') {
                activeViewHandlers[viewId].update()
            }
            return
        }

        // Load the module for this view
        const moduleLoader = VIEW_MODULES[viewId]
        if (!moduleLoader) {
            console.warn(`No module defined for view ${viewId}`)
            return
        }

        // Load and initialize the view
        const module = await moduleLoader()

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
 * Update the active navigation link
 * @param {string} viewId - ID of active view
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

export { VIEWS, ROUTE_MAP }