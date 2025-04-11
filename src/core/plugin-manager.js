// src/core/plugin-manager.js - Updated to use Redux-style store instead of deprecated StateManager
import { errorHandler } from './errors/index.js'
import { store } from './state/index.js'
import { getCurrentView } from './state/selectors.js'

/**
 * Manages application plugins
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map()
    this.containers = new Map()
    this.activePlugins = new Set()

    // Bind route change handler
    this.handleRouteChange = this.handleRouteChange.bind(this)
    document.addEventListener('routeChange', this.handleRouteChange)
  }

  /**
   * Register a plugin for a specific view
   * @param {string} viewId - ID of the view
   * @param {Object} pluginInstance - Plugin instance
   * @param {Object} options - Plugin options
   */
  register(viewId, pluginInstance, options = {}) {
    const pluginId = pluginInstance.id

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already registered`)
    }

    this.plugins.set(pluginId, {
      instance: pluginInstance,
      viewId,
      options: {
        autoActivate: true,
        ...options
      }
    })

    console.log(`Plugin "${pluginId}" registered for view "${viewId}"`)
  }

  /**
   * Create a DOM container for a plugin
   * @param {string} viewId - ID of the view
   * @param {string} pluginId - ID of the plugin
   * @param {string} containerId - Optional container ID
   * @returns {HTMLElement} The created container
   */
  createContainer(viewId, pluginId, containerId = null) {
    const view = document.getElementById(viewId)
    if (!view) {
      throw new Error(`View "${viewId}" not found`)
    }

    // Create container ID if not provided
    const id = containerId || `plugin-container-${pluginId}`

    // Find or create container
    let container = document.getElementById(id)
    if (!container) {
      container = document.createElement('div')
      container.id = id
      container.className = 'plugin-container'
      container.dataset.plugin = pluginId

      // Find plugins section or append to view
      const pluginSection = view.querySelector('.plugins-section')
      if (pluginSection) {
        pluginSection.appendChild(container)
      } else {
        view.appendChild(container)
      }
    }

    // Store container reference
    this.containers.set(pluginId, container)

    return container
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAll() {
    const promises = []

    for (const [pluginId, pluginData] of this.plugins.entries()) {
      try {
        promises.push(this.initializePlugin(pluginId))
      } catch (error) {
        errorHandler.handle(error)
        console.error(`Failed to initialize plugin ${pluginId}:`, error)
      }
    }

    await Promise.all(promises)
    console.log('All plugins initialized')

    // Activate plugins for current view
    const currentView = getCurrentView(store.getState())
    if (currentView) {
      this.activatePluginsForView(currentView)
    }
  }

  /**
   * Initialize a specific plugin
   * @param {string} pluginId - ID of the plugin to initialize
   */
  async initializePlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId)
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`)
    }

    try {
      await pluginData.instance.initialize()
      console.log(`Plugin ${pluginId} initialized successfully`)
    } catch (error) {
      errorHandler.handle(error)
      throw new Error(`Failed to initialize plugin ${pluginId}: ${error.message}`)
    }
  }

  /**
   * Activate plugins for a specific view
   * @param {string} viewId - ID of the view
   */
  async activatePluginsForView(viewId) {
    // Find plugins for this view
    const pluginsToActivate = []

    for (const [pluginId, pluginData] of this.plugins.entries()) {
      if (pluginData.viewId === viewId && pluginData.options.autoActivate) {
        pluginsToActivate.push(pluginId)
      }
    }

    // Activate each plugin
    for (const pluginId of pluginsToActivate) {
      await this.activatePlugin(pluginId)
    }
  }

  /**
   * Deactivate plugins not associated with the current view
   * @param {string} currentViewId - ID of the current view
   */
  async deactivatePluginsNotInView(currentViewId) {
    const pluginsToDeactivate = []

    // Find plugins to deactivate
    for (const pluginId of this.activePlugins) {
      const pluginData = this.plugins.get(pluginId)
      if (pluginData && pluginData.viewId !== currentViewId) {
        pluginsToDeactivate.push(pluginId)
      }
    }

    // Deactivate each plugin
    for (const pluginId of pluginsToDeactivate) {
      await this.deactivatePlugin(pluginId)
    }
  }

  /**
   * Activate a specific plugin
   * @param {string} pluginId - ID of the plugin to activate
   */
  async activatePlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId)
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`)
    }

    const { instance, viewId } = pluginData

    if (this.activePlugins.has(pluginId)) {
      console.warn(`Plugin ${pluginId} is already active`)
      return
    }

    try {
      // Find or create container
      let container = this.containers.get(pluginId)
      if (!container) {
        container = this.createContainer(viewId, pluginId)
      }

      // Mount plugin into container
      await instance.mount(container)
      this.activePlugins.add(pluginId)
      console.log(`Plugin ${pluginId} activated successfully`)
    } catch (error) {
      errorHandler.handle(error)
      console.error(`Failed to activate plugin ${pluginId}:`, error)
    }
  }

  /**
   * Deactivate a specific plugin
   * @param {string} pluginId - ID of the plugin to deactivate
   */
  async deactivatePlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId)
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`)
    }

    const { instance } = pluginData

    if (!this.activePlugins.has(pluginId)) {
      return
    }

    try {
      await instance.unmount()
      this.activePlugins.delete(pluginId)
      console.log(`Plugin ${pluginId} deactivated successfully`)
    } catch (error) {
      errorHandler.handle(error)
      console.error(`Failed to deactivate plugin ${pluginId}:`, error)
    }
  }

  /**
   * Get a plugin instance by ID
   * @param {string} pluginId - ID of the plugin
   * @returns {Object} Plugin instance
   */
  getPlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId)
    return pluginData ? pluginData.instance : null
  }

  /**
   * Handle route change events
   * @param {Event} event - Route change event
   */
  async handleRouteChange(event) {
    const { to } = event.detail
    if (!to) return

    // Deactivate plugins not in this view
    await this.deactivatePluginsNotInView(to)

    // Activate plugins for this view
    await this.activatePluginsForView(to)
  }

  /**
   * Clean up and destroy all plugins
   */
  async destroy() {
    // Deactivate all active plugins
    for (const pluginId of this.activePlugins) {
      await this.deactivatePlugin(pluginId)
    }

    // Destroy all plugins
    for (const [pluginId, pluginData] of this.plugins.entries()) {
      try {
        await pluginData.instance.destroy()
      } catch (error) {
        errorHandler.handle(error)
        console.error(`Failed to destroy plugin ${pluginId}:`, error)
      }
    }

    // Clear all collections
    this.plugins.clear()
    this.containers.clear()
    this.activePlugins.clear()

    // Remove event listener
    document.removeEventListener('routeChange', this.handleRouteChange)
  }
}

// Create and export plugin manager instance
export const pluginManager = new PluginManager()