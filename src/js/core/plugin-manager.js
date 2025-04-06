// src/js/core/plugin-manager.js
import { ErrorHandler } from './errors.js';
import { state } from './state.js';

/**
 * Manages the application plugin system
 */
class PluginManager {
  constructor() {
    this.plugins = {};
    this.loadedPlugins = {};
    this.activePlugin = null;
    this.viewMap = {};
  }

  /**
   * Initialize the plugin manager
   * @param {HTMLElement} mainContainerEl - The main container element for the application
   */
  initialize(mainContainerEl) {
    this.mainContainerEl = mainContainerEl;

    // Listen for route changes to load/unload plugins
    document.addEventListener('routeChange', (e) => {
      const { from, to } = e.detail;

      // Unload previous plugin if exists
      if (from && this.viewMap[from]) {
        this.unloadPlugin(this.viewMap[from]);
      }

      // Load new plugin if exists
      if (to && this.viewMap[to]) {
        this.loadPlugin(this.viewMap[to]);
      }
    });

    // Update state to indicate plugin manager is ready
    state.update('pluginManagerReady', true);

    console.log('Plugin manager initialized');
    return this;
  }

  /**
   * Register a plugin with the manager
   * @param {string} id - Unique plugin identifier
   * @param {string} viewId - The view ID this plugin is associated with
   * @param {Object} options - Plugin registration options
   * @param {Function} options.loader - Function that returns a Promise resolving to the plugin module
   * @param {string} options.title - Human-readable plugin title
   * @param {string[]} options.dependencies - Array of dependency IDs this plugin requires
   */
  register(id, viewId, options) {
    if (this.plugins[id]) {
      console.warn(`Plugin ${id} is already registered`);
      return this;
    }

    // Register the plugin with its metadata
    this.plugins[id] = {
      id,
      viewId,
      title: options.title || id,
      loader: options.loader,
      dependencies: options.dependencies || [],
      loaded: false,
      instance: null
    };

    // Map the view ID to this plugin
    this.viewMap[viewId] = id;

    console.log(`Plugin registered: ${id} for view ${viewId}`);
    return this;
  }

  /**
   * Dynamically load a plugin by ID
   * @param {string} id - Plugin ID to load
   * @returns {Promise<Object>} The loaded plugin instance
   */
  async loadPlugin(id) {
    try {
      const plugin = this.plugins[id];

      if (!plugin) {
        throw new Error(`Plugin ${id} is not registered`);
      }

      // Skip if already loaded and active
      if (plugin.loaded && this.activePlugin === id) {
        console.log(`Plugin ${id} is already loaded and active`);
        return plugin.instance;
      }

      // Set loading state
      state.update('pluginLoading', true);
      state.update('currentPlugin', id);

      // Get the container for this plugin
      const container = this.getPluginContainer(plugin.viewId);

      // Show loading indicator in container
      if (container) {
        this.showLoading(container, plugin.title);
      } else {
        console.warn(`No container found for plugin ${id} in view ${plugin.viewId}`);
      }

      // Load dependencies first if any
      if (plugin.dependencies.length > 0) {
        await Promise.all(
          plugin.dependencies.map(depId => this.loadPlugin(depId))
        );
      }

      let pluginModule;

      // If not loaded yet, dynamically import the plugin
      if (!plugin.loaded) {
        console.log(`Loading plugin: ${id}`);
        try {
          // Use the loader function to import the module
          pluginModule = await plugin.loader();

          // Initialize the plugin with our container
          if (pluginModule.default) {
            plugin.instance = await pluginModule.default.initialize(container);
          } else {
            throw new Error(`Plugin ${id} does not export a default initialize method`);
          }

          plugin.loaded = true;
          this.loadedPlugins[id] = plugin;

        } catch (loadError) {
          console.error(`Failed to load plugin ${id}:`, loadError);
          if (container) {
            this.showError(container, plugin.title, loadError.message);
          }
          throw loadError;
        }
      }

      // Activate the plugin
      await this.activatePlugin(id);

      // Clear loading state
      state.update('pluginLoading', false);

      return plugin.instance;

    } catch (error) {
      state.update('pluginLoading', false);
      ErrorHandler.handle(error);
      throw error;
    }
  }

  /**
   * Activate a loaded plugin
   * @param {string} id - Plugin ID to activate
   */
  async activatePlugin(id) {
    try {
      const plugin = this.loadedPlugins[id];

      if (!plugin || !plugin.loaded || !plugin.instance) {
        throw new Error(`Plugin ${id} is not loaded and cannot be activated`);
      }

      // Deactivate current plugin if different
      if (this.activePlugin && this.activePlugin !== id) {
        await this.deactivatePlugin(this.activePlugin);
      }

      console.log(`Activating plugin: ${id}`);

      // Get the container for this plugin
      const container = this.getPluginContainer(plugin.viewId);

      // Call the plugin's mount method
      if (typeof plugin.instance.mount === 'function' && container) {
        await plugin.instance.mount(container);
      }

      this.activePlugin = id;

    } catch (error) {
      console.error(`Failed to activate plugin ${id}:`, error);
      ErrorHandler.handle(error);
    }
  }

  /**
   * Deactivate an active plugin
   * @param {string} id - Plugin ID to deactivate
   */
  async deactivatePlugin(id) {
    try {
      const plugin = this.loadedPlugins[id];

      if (!plugin || !plugin.loaded) {
        return;
      }

      console.log(`Deactivating plugin: ${id}`);

      // Call the plugin's unmount method
      if (plugin.instance && typeof plugin.instance.unmount === 'function') {
        await plugin.instance.unmount();
      }

      if (this.activePlugin === id) {
        this.activePlugin = null;
      }

    } catch (error) {
      console.error(`Failed to deactivate plugin ${id}:`, error);
      ErrorHandler.handle(error);
    }
  }

  /**
   * Unload a plugin completely
   * @param {string} id - Plugin ID to unload
   */
  async unloadPlugin(id) {
    try {
      // First deactivate
      await this.deactivatePlugin(id);

      const plugin = this.loadedPlugins[id];

      if (!plugin || !plugin.loaded) {
        return;
      }

      console.log(`Unloading plugin: ${id}`);

      // Call the plugin's destroy method
      if (plugin.instance && typeof plugin.instance.destroy === 'function') {
        await plugin.instance.destroy();
      }

      // Clean up references
      plugin.loaded = false;
      plugin.instance = null;
      delete this.loadedPlugins[id];

    } catch (error) {
      console.error(`Failed to unload plugin ${id}:`, error);
      ErrorHandler.handle(error);
    }
  }

  /**
   * Get the container element for a specific view
   * @param {string} viewId - The view ID
   * @returns {HTMLElement} The container element
   */
  getPluginContainer(viewId) {
    // First try to find the specific container for this view
    let container = document.getElementById(`plugin-container-${viewId}`);

    // If not found, try to use the view itself as container
    if (!container) {
      container = document.getElementById(viewId);
    }

    return container;
  }

  /**
   * Show loading indicator in the container
   * @param {HTMLElement} container - The container element
   * @param {string} pluginTitle - Title of the plugin being loaded
   */
  showLoading(container, pluginTitle) {
    if (!container) return;

    container.innerHTML = `
      <div class="plugin-loading">
        <div class="loading-spinner"></div>
        <p>Loading ${pluginTitle}...</p>
      </div>
    `;
  }

  /**
   * Show error message in the container
   * @param {HTMLElement} container - The container element
   * @param {string} pluginTitle - Title of the plugin
   * @param {string} errorMessage - Error message to display
   */
  showError(container, pluginTitle, errorMessage) {
    if (!container) return;

    container.innerHTML = `
      <div class="plugin-error">
        <h3>Failed to load ${pluginTitle}</h3>
        <p>${errorMessage}</p>
        <button id="retry-plugin-load" class="button-primary">Retry</button>
      </div>
    `;

    const retryButton = container.querySelector('#retry-plugin-load');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        const id = this.viewMap[container.id];
        if (id) {
          this.loadPlugin(id);
        }
      });
    }
  }
}

// Export singleton instance
export const pluginManager = new PluginManager();