// src/ui/views/yasgui-view.js
import { YasguiPlugin } from '../../plugins/yasgui-plugin.js';
import { pluginManager } from '../../core/plugin-manager.js';
import { showNotification } from '../notifications/notifications.js';
import { errorHandler } from '../../core/errors/index.js';
import { VIEWS } from '../../core/views.js';

const PLUGIN_ID = 'yasgui-plugin';

/**
 * Initialize the YASGUI view
 * @returns {Object} View handler with optional lifecycle methods
 */
export function initView() {
    try {
        console.log('Initializing YASGUI view');

        // Check if the plugin is already registered
        let plugin = pluginManager.getPlugin(PLUGIN_ID);

        if (!plugin) {
            // Create and register the plugin
            console.log('Creating new YASGUI plugin instance');
            plugin = new YasguiPlugin(PLUGIN_ID);

            // Register with the plugin manager
            pluginManager.register(VIEWS.YASGUI, plugin, {
                autoActivate: true
            });
        }

        // The container is needed for the YASGUI plugin
        const container = document.getElementById('yasgui-container');
        if (!container) {
            throw new Error('YASGUI container element not found');
        }

        // Create plugin container if it doesn't exist
        pluginManager.createContainer(VIEWS.YASGUI, PLUGIN_ID, 'yasgui-container');

        // The plugin will be automatically activated by the plugin manager
        // when the view is shown, due to the autoActivate option

        return {
            // Optional update method - called when returning to this view
            update() {
                console.log('Updating YASGUI view');
            },

            // Optional cleanup method - called when leaving this view
            cleanup() {
                console.log('Cleaning up YASGUI view');
            }
        };
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing YASGUI view'
        });

        // Show error in the container
        const container = document.getElementById('yasgui-container');
        if (container) {
            container.innerHTML = `
        <div class="error-message">
          <p>Failed to initialize SPARQL editor: ${error.message}</p>
          <button onclick="window.location.reload()">Reload Page</button>
        </div>
      `;
        }

        return {};
    }
}