// src/ui/router.js
import { eventBus, EVENTS } from '../core/events/event-bus.js';
import { errorHandler } from '../core/errors/index.js';
import { store } from '../core/state/index.js';
import { setCurrentView } from '../core/state/actions.js';
import { getCurrentView } from '../core/state/selectors.js';

const VIEWS = {
    POST: 'post-view',
    WIKI: 'wiki-view',
    CHAT: 'chat-view',
    YASGUI: 'yasgui-view',
    DEVELOPER: 'developer-view',
    PROFILE: 'profile-view',
    SETTINGS: 'settings-view'
};


const ROUTE_MAP = {
    'post': VIEWS.POST,
    'wiki': VIEWS.WIKI,
    'chat': VIEWS.CHAT,
    'sparql': VIEWS.YASGUI,
    'dev': VIEWS.DEVELOPER,
    'profile': VIEWS.PROFILE,
    'settings': VIEWS.SETTINGS
};


const VIEW_MODULES = {
    [VIEWS.POST]: () => import('./views/post-view.js'),
    [VIEWS.WIKI]: () => import('./views/wiki-view.js'),
    [VIEWS.CHAT]: () => import('./views/chat-view.js'),
    [VIEWS.YASGUI]: () => import('./views/yasgui-view.js'),
    [VIEWS.DEVELOPER]: () => import('./views/developer-view.js'),
    [VIEWS.PROFILE]: () => import('./views/profile-view.js'),
    [VIEWS.SETTINGS]: () => import('./views/settings-view.js')
};
// Active view handlers
const activeViewHandlers = {};

/**
 * Initialize the router
 */
export function initRouter() {
    // Setup route change listener
    window.addEventListener('hashchange', handleRouteChange);

    // Handle initial route
    handleRouteChange();

    // Setup navigation links
    setupNavLinks();
}

/**
 * Handle route changes
 */
function handleRouteChange() {
    try {
        const hash = window.location.hash.slice(1) || 'post';
        const viewId = ROUTE_MAP[hash] || VIEWS.POST;

        const currentView = getCurrentView(store.getState());

        // No change, skip
        if (currentView === viewId) {
            return;
        }

        // Dispatch route change event
        const event = new CustomEvent('routeChange', {
            detail: {
                from: currentView,
                to: viewId
            },
            cancelable: true
        });

        // Allow event to be canceled
        if (!document.dispatchEvent(event)) {
            // If canceled, revert to previous route
            if (currentView) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === currentView);
                if (route) {
                    window.location.hash = route;
                }
            }
            return;
        }

        // Update state
        store.dispatch(setCurrentView(viewId));

        // Show the view
        showView(viewId);

        // Initialize view if needed
        initializeView(viewId);

        // Update active navigation link
        updateActiveNavLink(viewId);

        // Emit event through event bus
        eventBus.emit(EVENTS.VIEW_CHANGED, {
            from: currentView,
            to: viewId
        });
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Route change'
        });

        // If error, go to post view
        if (window.location.hash !== '#post') {
            window.location.hash = 'post';
        }
    }
}

/**
 * Show a view and hide others
 */
function showView(viewId) {
    Object.values(VIEWS).forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            view.classList.toggle('hidden', id !== viewId);
        }
    });
}

/**
 * Initialize a view if needed
 */
async function initializeView(viewId) {
    try {
        // Skip if already initialized
        if (activeViewHandlers[viewId]) {
            // Call update if it exists
            if (typeof activeViewHandlers[viewId].update === 'function') {
                activeViewHandlers[viewId].update();
            }
            return;
        }

        // Get view module
        const moduleLoader = VIEW_MODULES[viewId];
        if (!moduleLoader) {
            console.warn(`No module defined for view ${viewId}`);
            return;
        }

        // Load the module
        const module = await moduleLoader();

        // Initialize the view
        if (typeof module.initView === 'function') {
            activeViewHandlers[viewId] = module.initView() || {};
        } else {
            console.warn(`No initView function in module for ${viewId}`);
            activeViewHandlers[viewId] = {};
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: `Initializing view ${viewId}`
        });
    }
}

/**
 * Update the active navigation link
 */
function updateActiveNavLink(viewId) {
    document.querySelectorAll('nav a').forEach(link => {
        const linkViewId = link.getAttribute('data-view');
        link.classList.toggle('active', linkViewId === viewId);
    });
}

/**
 * Setup navigation links
 */
function setupNavLinks() {
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = e.target.getAttribute('data-view');
            if (viewId) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === viewId);
                if (route) {
                    window.location.hash = route;
                }

                // If we have a hamburger menu, close it when navigating
                const menu = document.querySelector('.hamburger-menu');
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active');
                    document.querySelector('nav').classList.remove('visible');
                }
            }
        });
    });
}

// Export constants and functions
export { VIEWS, ROUTE_MAP };