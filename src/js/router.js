// src/js/router.js - Updated to work with plugin system
import { state } from './core/state.js';
import { ErrorHandler } from './core/errors.js';
import { VIEWS } from './core/views.js';
import { pluginManager } from './core/plugin-manager.js';

/**
 * Initialize the router
 */
export function initializeRouter() {
    const VALID_ROUTES = Object.values(VIEWS).map(view => view.replace('-view', ''));

    window.addEventListener('hashchange', () => {
        handleRoute(window.location.hash, VALID_ROUTES);
    });

    handleRoute(window.location.hash, VALID_ROUTES);
}

/**
 * Handle route changes
 */
async function handleRoute(hash, validRoutes) {
    try {
        const route = hash.slice(1) || 'post';

        if (!validRoutes.includes(route)) {
            throw new Error(`Invalid route: ${route}`);
        }

        const viewId = `${route}-view`;
        const view = document.getElementById(viewId);

        if (!view) {
            throw new Error(`View not found: ${viewId}`);
        }

        const currentView = state.get('currentView');

        // Only process if view is changing
        if (currentView === viewId) {
            return;
        }

        // Fire route change event
        const event = new CustomEvent('routeChange', {
            detail: {
                from: currentView,
                to: viewId
            },
            cancelable: true
        });

        if (!document.dispatchEvent(event)) {
            if (currentView) {
                window.location.hash = currentView.replace('-view', '');
            }
            return;
        }

        // Update state
        state.update('previousView', currentView);
        state.update('currentView', viewId);

        // Hide all views
        Object.values(VIEWS).forEach(id => {
            const viewElement = document.getElementById(id);
            if (viewElement) {
                viewElement.classList.add('hidden');
            }
        });

        // Show requested view
        view.classList.remove('hidden');

        console.log(`Navigated to view: ${viewId}`);
    } catch (error) {
        ErrorHandler.handle(error);
        if (hash !== '#post') {
            window.location.hash = '#post';
        }
    }
}