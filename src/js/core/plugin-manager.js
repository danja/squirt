// src/js/core/plugin-manager.js
// Central registry and lifecycle manager for all plugins

import { ErrorHandler } from './errors.js';
import { state } from './state.js';

/**
 * Manages the lifecycle and registration of all plugins in the application
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.containers = new Map();
    this.activePlugins = new Set();

    // Subscribe to route changes to activate/deactivate plugins
    this.handleRouteChange = this.handleRouteChange.bind(this);
    document.addEventListener('routeChange', this.handleRouteChange);
  }

  /**
   * Register a plugin with the manager
   * @param {string} viewId - The view ID this plugin is associated with
   * @param {PluginBase} pluginInstance - Instance of a PluginBase-derived class
   * @param {Object} options - Plugin configuration options
   */
  register(viewId, pluginInstance, options = {}) {
    const pluginId = pluginInstance.id;

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already registered`);
    }

    this.plugins.set(pluginId, {
      instance: pluginInstance,
      viewId,
      options: {
        autoActivate: true, // Automatically activate plugin when view is shown
        ...options
      }
    });

    console.log(`Plugin "${pluginId}" registered for view "${viewId}"`);
  }

  /**
   * Create a container for a plugin in the specified view
   * @param {string} viewId - The view ID
   * @param {string} pluginId - The plugin ID
   * @param {string} [containerId] - Optional container ID, defaults to plugin-container-{pluginId}
   * @returns {HTMLElement} The container element
   */
  createContainer(viewId, pluginId, containerId = null) {
    const view = document.getElementById(viewId);
    if (!view) {
      throw new Error(`View "${viewId}" not found`);
    }

    // Use provided ID or generate a default one
    const id = containerId || `plugin-container-${pluginId}`;

    // Check if container already exists
    let container = document.getElementById(id);
    if (!container) {
      container = document.createElement('div');
      container.id = id;
      container.className = 'plugin-container';
      container.dataset.plugin = pluginId;

      // Either append to view or to a specific plugin section if it exists
      const pluginSection = view.querySelector('.plugins-section');
      if (pluginSection) {
        pluginSection.appendChild(container);
      } else {
        view.appendChild(container);
      }
    }

    // Store reference to container
    this.containers.set(pluginId, container);

    return container;
  }

  /**
   * Initialize all registered plugins
   * @returns {Promise<void>}
   */
  async initializeAll() {
    const promises = [];

    for (const [pluginId, pluginData] of this.plugins.entries()) {
      try {
        promises.push(this.initializePlugin(pluginId));
      } catch (error) {
        ErrorHandler.handle(error);
        console.error(`Failed to initialize plugin ${pluginId}:`, error);
      }
    }

    await Promise.all(promises);
    console.log('All plugins initialized');

    // Check current route to activate appropriate plugins
    const currentView = state.get('currentView');
    if (currentView) {
      this.activatePluginsForView(currentView);
    }
  }

  /**
   * Initialize a specific plugin
   * @param {string} pluginId - The plugin ID to initialize
   * @returns {Promise<void>}
   */
  async initializePlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    try {
      await pluginData.instance.initialize();
      console.log(`Plugin ${pluginId} initialized successfully`);
    } catch (error) {
      ErrorHandler.handle(error);
      throw new Error(`Failed to initialize plugin ${pluginId}: ${error.message}`);
    }
  }

  /**
   * Activate plugins for a specific view
   * @param {string} viewId - The view ID to activate plugins for
   */
  async activatePluginsForView(viewId) {
    // Collect plugins that need to be activated for this view
    const pluginsToActivate = [];

    for (const [pluginId, pluginData] of this.plugins.entries()) {
      if (pluginData.viewId === viewId && pluginData.options.autoActivate) {
        pluginsToActivate.push(pluginId);
      }
    }

    // Activate the plugins
    for (const pluginId of pluginsToActivate) {
      await this.activatePlugin(pluginId);
    }
  }

  /**
   * Deactivate plugins that are not associated with the current view
   * @param {string} currentViewId - The current active view ID
   */
  async deactivatePluginsNotInView(currentViewId) {
    const pluginsToDeactivate = [];

    // Find active plugins that don't belong to the current view
    for (const pluginId of this.activePlugins) {
      const pluginData = this.plugins.get(pluginId);
      if (pluginData && pluginData.viewId !== currentViewId) {
        pluginsToDeactivate.push(pluginId);
      }
    }

    // Deactivate the plugins
    for (const pluginId of pluginsToDeactivate) {
      await this.deactivatePlugin(pluginId);
    }
  }

  /**
   * Activate a specific plugin by mounting it to its container
   * @param {string} pluginId - The plugin ID to activate
   * @returns {Promise<void>}
   */
  async activatePlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    const { instance, viewId } = pluginData;

    if (this.activePlugins.has(pluginId)) {
      console.warn(`Plugin ${pluginId} is already active`);
      return;
    }

    try {
      // Ensure container exists
      let container = this.containers.get(pluginId);
      if (!container) {
        container = this.createContainer(viewId, pluginId);
      }

      // Mount plugin to container
      await instance.mount(container);
      this.activePlugins.add(pluginId);
      console.log(`Plugin ${pluginId} activated successfully`);
    } catch (error) {
      ErrorHandler.handle(error);
      console.error(`Failed to activate plugin ${pluginId}:`, error);
    }
  }

  /**
   * Deactivate a specific plugin by unmounting it
   * @param {string} pluginId - The plugin ID to deactivate
   * @returns {Promise<void>}
   */
  async deactivatePlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    const { instance } = pluginData;

    if (!this.activePlugins.has(pluginId)) {
      return; // Not active, nothing to do
    }

    try {
      await instance.unmount();
      this.activePlugins.delete(pluginId);
      console.log(`Plugin ${pluginId} deactivated successfully`);
    } catch (error) {
      ErrorHandler.handle(error);
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
    }
  }

  /**
   * Get a plugin instance by ID
   * @param {string} pluginId - The plugin ID to retrieve
   * @returns {PluginBase|null} The plugin instance, or null if not found
   */
  getPlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    return pluginData ? pluginData.instance : null;
  }

  /**
   * Handle route change events to activate/deactivate plugins
   * @param {CustomEvent} event - The routeChange event
   */
  async handleRouteChange(event) {
    const { to } = event.detail;
    if (!to) return;

    // Deactivate plugins from the previous view
    await this.deactivatePluginsNotInView(to);

    // Activate plugins for the new view
    await this.activatePluginsForView(to);
  }

  /**
   * Destroy all plugins and clean up resources
   */
  async destroy() {
    // Deactivate all active plugins
    for (const pluginId of this.activePlugins) {
      await this.deactivatePlugin(pluginId);
    }

    // Destroy all plugins
    for (const [pluginId, pluginData] of this.plugins.entries()) {
      try {
        await pluginData.instance.destroy();
      } catch (error) {
        ErrorHandler.handle(error);
        console.error(`Failed to destroy plugin ${pluginId}:`, error);
      }
    }

    // Clear collections
    this.plugins.clear();
    this.containers.clear();
    this.activePlugins.clear();

    // Remove event listeners
    document.removeEventListener('routeChange', this.handleRouteChange);
  }
}

// Create and export a singleton instance
export const pluginManager = new PluginManager();