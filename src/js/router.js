// src/js/router.js
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
function handleRoute(hash, validRoutes) {
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

        // Early check if the view is already active
        if (currentView === viewId) {
            console.log(`View ${viewId} is already active`);
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

        // Let the plugin manager handle plugin loading/unloading
        // The plugin manager listens for routeChange events directly
    } catch (error) {
        ErrorHandler.handle(error);
        if (hash !== '#post') {
            window.location.hash = '#post';
        }
    }
}