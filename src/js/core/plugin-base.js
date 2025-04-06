// src/js/core/plugin-base.js
/**
 * Base class for all plugins
 * Implements the standard plugin lifecycle methods
 */
export class PluginBase {
  constructor(id, options = {}) {
    this.id = id;
    this.title = options.title || id;
    this.container = null;
    this.initialized = false;
    this.mounted = false;
    this.settings = { ...options.settings };
  }

  /**
   * Initialize the plugin (called once when plugin is first loaded)
   * @param {HTMLElement} container - The container element for the plugin
   * @returns {PluginBase} Plugin instance for chaining
   */
  async initialize(container) {
    this.container = container;
    this.initialized = true;
    console.log(`Plugin ${this.id} initialized`);
    return this;
  }

  /**
   * Mount the plugin (called when plugin should become active)
   * @param {HTMLElement} container - The container element for the plugin
   * @returns {PluginBase} Plugin instance for chaining
   */
  async mount(container) {
    if (!this.initialized) {
      throw new Error(`Plugin ${this.id} must be initialized before mounting`);
    }
    
    // Update container reference if provided
    if (container) {
      this.container = container;
    }
    
    this.mounted = true;
    console.log(`Plugin ${this.id} mounted`);
    return this;
  }

  /**
   * Unmount the plugin (called when plugin should become inactive)
   * @returns {PluginBase} Plugin instance for chaining
   */
  async unmount() {
    this.mounted = false;
    console.log(`Plugin ${this.id} unmounted`);
    return this;
  }

  /**
   * Destroy the plugin (called when plugin is being unloaded)
   * @returns {boolean} Success status
   */
  async destroy() {
    await this.unmount();
    this.initialized = false;
    this.container = null;
    console.log(`Plugin ${this.id} destroyed`);
    return true;
  }

  /**
   * Get plugin settings
   * @returns {Object} Plugin settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update plugin settings
   * @param {Object} newSettings - New settings to merge with existing
   * @returns {Object} Updated settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }

  /**
   * Reset plugin settings to defaults
   * @param {Object} defaults - Default settings
   * @returns {Object} Reset settings
   */
  resetSettings(defaults = {}) {
    this.settings = { ...defaults };
    return this.settings;
  }
}
