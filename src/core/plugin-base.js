// src/js/core/plugin-base.js
// Base class for all plugins with standardized lifecycle methods

/**
 * Base class for all plugins in the application
 * Each plugin should extend this class and implement its methods
 */
export class PluginBase {
  /**
   * Creates a new plugin instance
   * @param {string} id - Unique identifier for this plugin
   * @param {Object} options - Configuration options for the plugin
   */
  constructor(id, options = {}) {
    if (!id) {
      throw new Error('Plugin ID is required');
    }

    this.id = id;
    this.options = options;
    this.container = null;
    this.isInitialized = false;
    this.isMounted = false;
    this._eventListeners = [];
  }

  /**
   * Initialize the plugin - fetch required resources, prepare internal state
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn(`Plugin ${this.id} is already initialized`);
      return;
    }

    // Plugins should override this method with their initialization logic
    this.isInitialized = true;
  }

  /**
   * Mount the plugin to a container in the DOM
   * @param {HTMLElement} container - The DOM element to mount this plugin to
   * @returns {Promise<void>}
   */
  async mount(container) {
    if (!this.isInitialized) {
      throw new Error(`Plugin ${this.id} must be initialized before mounting`);
    }

    if (this.isMounted) {
      console.warn(`Plugin ${this.id} is already mounted`);
      return;
    }

    if (!container) {
      throw new Error(`Cannot mount plugin ${this.id}: container is required`);
    }

    this.container = container;
    this.isMounted = true;

    // Plugins should override this method with their mounting logic
  }

  /**
   * Unmount the plugin from its container
   * @returns {Promise<void>}
   */
  async unmount() {
    if (!this.isMounted) {
      return;
    }

    // Plugins should override this method with their unmounting logic

    this.container = null;
    this.isMounted = false;
  }

  /**
   * Destroy the plugin, releasing all resources
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.isMounted) {
      await this.unmount();
    }

    // Remove all event listeners
    this._eventListeners.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
    this._eventListeners = [];

    // Plugins should override this method with additional cleanup logic

    this.isInitialized = false;
  }

  /**
   * Add an event listener that will be automatically cleaned up on destroy
   * @param {EventTarget} target - The event target (usually a DOM element or window)
   * @param {string} type - The event type to listen for
   * @param {Function} listener - The event listener function
   * @param {Object} options - Options for addEventListener
   */
  addEventListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this._eventListeners.push({ target, type, listener, options });
  }

  /**
   * Remove a specific event listener
   * @param {EventTarget} target - The event target
   * @param {string} type - The event type
   * @param {Function} listener - The event listener function
   * @param {Object} options - Options for removeEventListener
   */
  removeEventListener(target, type, listener, options) {
    target.removeEventListener(type, listener, options);
    this._eventListeners = this._eventListeners.filter(
      item => !(item.target === target &&
        item.type === type &&
        item.listener === listener)
    );
  }

  /**
   * Handle configuration updates
   * @param {Object} newOptions - New configuration options
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    // Plugins should override this method to apply changes based on new options
  }
}