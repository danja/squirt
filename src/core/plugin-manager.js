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
   * Register a plugin for a specific view or as a main tab provider
   * @param {string|null} viewId - ID of the view (null for main tab providers)
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
        autoActivate: !options.providesMainTabs, // Don't auto-activate main tab providers
        ...options
      }
    })

    if (viewId) {
      console.log(`Plugin "${pluginId}" registered for view "${viewId}"`)
    } else {
      console.log(`Plugin "${pluginId}" registered as main tab provider`)
    }
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
    const { to, from } = event.detail
    if (!to) return

    console.log(`[PluginManager] Route change: ${from} -> ${to}`)

    // Check if this is a plugin-contributed tab
    const pluginTabInfo = this.getPluginTabInfo(to)
    const fromPluginTabInfo = from ? this.getPluginTabInfo(from) : null
    
    if (pluginTabInfo) {
      console.log(`[PluginManager] Plugin tab detected: ${pluginTabInfo.id}`)
      
      // Check if we're switching between tabs of the same plugin
      const samePlugin = fromPluginTabInfo && fromPluginTabInfo.pluginId === pluginTabInfo.pluginId
      console.log(`[PluginManager] Same plugin: ${samePlugin}`)
      
      if (!samePlugin) {
        // Different plugin or coming from non-plugin view - deactivate others
        console.log(`[PluginManager] Deactivating other plugins`)
        await this.deactivateAllPlugins()
      }
      
      // Find the container for this view
      const viewElement = document.getElementById(to)
      if (viewElement) {
        console.log(`[PluginManager] View element found: ${to}`)
        
        // Force view to be visible
        viewElement.classList.remove('hidden')
        
        // Find or create plugin container with full height styling
        let container = viewElement.querySelector('.plugin-tab-container')
        if (!container) {
          console.log(`[PluginManager] Creating new plugin container for ${to}`)
          container = document.createElement('div')
          container.className = 'plugin-tab-container'
          container.style.cssText = `
            width: 100%;
            height: calc(100vh - 140px);
            min-height: 600px;
            display: flex;
            flex-direction: column;
            position: relative;
          `
          
          // Only clear non-plugin content, preserve existing plugin containers
          const existingPluginContainers = viewElement.querySelectorAll('.plugin-tab-container')
          console.log(`[PluginManager] Found ${existingPluginContainers.length} existing plugin containers`)
          if (existingPluginContainers.length === 0) {
            // Clear the view element only if no plugin containers exist
            const children = Array.from(viewElement.children)
            console.log(`[PluginManager] Clearing ${children.length} non-plugin children from view`)
            children.forEach(child => {
              if (!child.classList.contains('plugin-tab-container')) {
                console.log(`[PluginManager] Removing child:`, child.className, child.tagName)
                child.remove()
              }
            })
          }
          
          viewElement.appendChild(container)
          console.log(`[PluginManager] Appended new container to view ${to}`)
        } else {
          console.log(`[PluginManager] Reusing existing plugin container for ${to}, content length: ${container.innerHTML.length}`)
        }
        
        try {
          console.log(`[PluginManager] Activating plugin tab: ${pluginTabInfo.pluginId}/${pluginTabInfo.id}`)
          await this.activatePluginTab(pluginTabInfo.pluginId, pluginTabInfo.id, container)
          console.log(`[PluginManager] Plugin tab activated successfully`)
        } catch (error) {
          console.error(`Failed to activate plugin tab ${pluginTabInfo.id}:`, error)
          container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #666;">
              <h3>Error Loading ${pluginTabInfo.label}</h3>
              <p>Failed to load the ${pluginTabInfo.label} component.</p>
              <p>${error.message}</p>
            </div>
          `
        }
      } else {
        console.log(`[PluginManager] View element not found: ${to}`)
      }
    } else {
      // Traditional view handling
      console.log(`[PluginManager] Traditional view: ${to}`)
      // Deactivate plugins not in this view
      await this.deactivatePluginsNotInView(to)

      // Activate plugins for this view
      await this.activatePluginsForView(to)
    }
  }

  /**
   * Deactivate all active plugins
   */
  async deactivateAllPlugins() {
    const pluginsToDeactivate = Array.from(this.activePlugins)
    
    for (const pluginId of pluginsToDeactivate) {
      await this.deactivatePlugin(pluginId)
    }
  }

  /**
   * Get main tab contributions from all enabled plugins
   * @returns {Array<Object>} Array of tab contribution objects with plugin metadata
   */
  getMainTabContributions() {
    const contributions = []

    for (const [pluginId, pluginData] of this.plugins.entries()) {
      try {
        const tabContributions = pluginData.instance.getMainTabContributions()
        
        // Add plugin metadata to each contribution
        tabContributions.forEach(tab => {
          contributions.push({
            ...tab,
            pluginId,
            viewId: `${tab.id}-view`, // Generate view ID from tab ID
            label: tab.label || tab.id
          })
        })
      } catch (error) {
        console.warn(`Failed to get tab contributions from plugin ${pluginId}:`, error)
      }
    }

    return contributions
  }

  /**
   * Get enabled plugins that provide main tabs
   * @returns {Array<Object>} Array of plugin data for main tab providers
   */
  getMainTabProviders() {
    const providers = []

    for (const [pluginId, pluginData] of this.plugins.entries()) {
      try {
        const contributions = pluginData.instance.getMainTabContributions()
        if (contributions.length > 0) {
          providers.push({
            pluginId,
            pluginData,
            contributions
          })
        }
      } catch (error) {
        console.warn(`Failed to check tab contributions from plugin ${pluginId}:`, error)
      }
    }

    return providers
  }

  /**
   * Activate a plugin for a specific tab
   * @param {string} pluginId - ID of the plugin
   * @param {string} tabId - ID of the tab to activate
   * @param {HTMLElement} container - Container to mount the tab component to
   */
  async activatePluginTab(pluginId, tabId, container) {
    const pluginData = this.plugins.get(pluginId)
    if (!pluginData) {
      throw new Error(`Plugin ${pluginId} is not registered`)
    }

    const { instance } = pluginData

    try {
      // Check if plugin supports this tab
      const contributions = instance.getMainTabContributions()
      const tabContribution = contributions.find(tab => tab.id === tabId)
      
      if (!tabContribution) {
        throw new Error(`Plugin ${pluginId} does not support tab ${tabId}`)
      }

      // If plugin is already active, check if it's for a different tab
      if (this.activePlugins.has(pluginId)) {
        const currentTabId = instance.getActiveTabId ? instance.getActiveTabId() : null
        if (currentTabId && currentTabId !== tabId) {
          console.log(`[PluginManager] Switching plugin ${pluginId} from tab ${currentTabId} to ${tabId}`)
          // Don't unmount - let mountTabComponent handle the switch
        } else if (!currentTabId) {
          console.log(`[PluginManager] Plugin ${pluginId} active but no current tab, unmounting`)
          await instance.unmount()
        } else {
          console.log(`[PluginManager] Plugin ${pluginId} already on tab ${tabId}, refreshing`)
        }
      }

      // Mount the specific tab component
      await instance.mountTabComponent(tabId, container)
      this.activePlugins.add(pluginId)
      
      console.log(`Plugin ${pluginId} tab ${tabId} activated successfully`)
    } catch (error) {
      errorHandler.handle(error)
      console.error(`Failed to activate plugin ${pluginId} tab ${tabId}:`, error)
      throw error
    }
  }

  /**
   * Check if a view ID corresponds to a plugin-contributed tab
   * @param {string} viewId - The view ID to check
   * @returns {Object|null} Tab contribution info or null if not a plugin tab
   */
  getPluginTabInfo(viewId) {
    const contributions = this.getMainTabContributions()
    return contributions.find(tab => tab.viewId === viewId) || null
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