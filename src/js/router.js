// src/js/router.js
import { state } from './core/state.js';
import { ErrorHandler } from './core/errors.js';
import { VIEWS } from './core/views.js';

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
        
        // Special handling for YASGUI
        if (viewId === VIEWS.YASGUI) {
            // Import the YASGUI view module and initialize it
            import('./ui/views/yasgui-view.js')
                .then(module => {
                    if (typeof module.initializeYasguiView === 'function') {
                        // Delay to ensure view is visible
                        setTimeout(() => module.initializeYasguiView(), 100);
                    }
                })
                .catch(error => {
                    console.error('Error loading YASGUI module:', error);
                });
        }

    } catch (error) {
        ErrorHandler.handle(error);
        if (hash !== '#post') {
            window.location.hash = '#post';
        }
    }
}