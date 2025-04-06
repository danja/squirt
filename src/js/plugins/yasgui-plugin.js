// src/js/plugins/yasgui-plugin.js
import { PluginBase } from '../core/plugin-base.js';
import { state } from '../core/state.js';
import { ErrorHandler } from '../core/errors.js';
import { showNotification } from '../ui/components/notifications.js';

/**
 * YASGUI Plugin implementation
 */
class YasguiPlugin extends PluginBase {
  constructor() {
    super('yasgui-plugin', {
      title: 'SPARQL Query Editor',
      settings: {
        defaultQuery: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX squirt: <http://purl.org/stuff/squirt/>

SELECT ?subject ?predicate ?object 
WHERE {
  ?subject ?predicate ?object
} 
LIMIT 10`
      }
    });
    
    this.yasguiInstance = null;
    this.resizeObserver = null;
  }

  /**
   * Initialize the plugin
   * @param {HTMLElement} container - The container element
   * @returns {YasguiPlugin} Plugin instance
   */
  async initialize(container) {
    await super.initialize(container);
    
    // We don't load YASGUI yet, just prepare the container
    this.container.innerHTML = `
      <div class="yasgui-container">
        <div class="yasgui-init">
          <button type="button" class="yasgui-load-button button-primary">
            Load SPARQL Query Editor
          </button>
        </div>
      </div>
    `;
    
    // Add click handler to load button
    const loadButton = this.container.querySelector('.yasgui-load-button');
    if (loadButton) {
      loadButton.addEventListener('click', () => {
        this.loadYasgui();
      });
    }
    
    return this;
  }

  /**
   * Mount the plugin
   * @param {HTMLElement} container - The container element
   * @returns {YasguiPlugin} Plugin instance
   */
  async mount(container) {
    await super.mount(container);
    
    // If YASGUI is already loaded, just show it
    if (this.yasguiInstance) {
      this.refreshLayout();
      return this;
    }
    
    // Otherwise, load it automatically
    this.loadYasgui();
    return this;
  }

  /**
   * Dynamically load YASGUI
   * @returns {Promise<Object>} YASGUI instance
   */
  async loadYasgui() {
    if (this.yasguiInstance) {
      return this.yasguiInstance;
    }
    
    try {
      // Show loading indicator
      this.container.innerHTML = `
        <div class="yasgui-container yasgui-container-loading">
          <div class="loading-spinner"></div>
        </div>
      `;
      
      // Dynamically import YASGUI
      const [Yasgui, endpoints] = await Promise.all([
        import(/* webpackChunkName: "yasgui" */ '@triply/yasgui'),
        import(/* webpackChunkName: "endpoints" */ '../services/sparql/endpoints.js')
      ]);
      
      // Also import styles
      await import(/* webpackChunkName: "yasgui-styles" */ '@triply/yasgui/build/yasgui.min.css');
      
      // Get the container element
      const yasguiContainer = document.createElement('div');
      yasguiContainer.className = 'yasgui-wrapper';
      this.container.innerHTML = '';
      this.container.appendChild(yasguiContainer);
      
      // Get endpoint configuration
      const activeEndpoint = endpoints.endpointManager.getActiveEndpoint('query');
      
      if (!activeEndpoint) {
        showNotification('No active SPARQL endpoint found. Using default endpoint.', 'warning');
      }
      
      // Create configuration
      const config = {
        requestConfig: {
          endpoint: activeEndpoint ? activeEndpoint.url : 'http://localhost:4030/semem/query',
          method: 'POST'
        },
        copyEndpointOnNewTab: true,
        autofocus: true
      };
      
      // Add authentication if needed
      if (activeEndpoint && activeEndpoint.credentials) {
        const authString = btoa(`${activeEndpoint.credentials.user}:${activeEndpoint.credentials.password}`);
        config.requestConfig.headers = {
          'Authorization': `Basic ${authString}`
        };
      }
      
      // Create YASGUI instance
      this.yasguiInstance = Yasgui.default(yasguiContainer, config);
      
      // Set default query
      const tab = this.yasguiInstance.getTab();
      if (tab && tab.yasqe) {
        tab.yasqe.setValue(this.settings.defaultQuery);
      }
      
      // Setup resize observer
      this.setupResizeObserver();
      
      // Force refresh after a short delay to ensure proper layout
      setTimeout(() => this.refreshLayout(), 200);
      
      return this.yasguiInstance;
      
    } catch (error) {
      console.error('Failed to load YASGUI:', error);
      ErrorHandler.handle(error);
      
      this.container.innerHTML = `
        <div class="plugin-error">
          <h3>Failed to load SPARQL Query Editor</h3>
          <p>${error.message}</p>
          <button class="retry-button button-primary">Retry</button>
        </div>
      `;
      
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadYasgui();
        });
      }
      
      throw error;
    }
  }

  /**
   * Setup resize observer for YASGUI
   */
  setupResizeObserver() {
    // Clean up any existing observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Skip if ResizeObserver not available
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    
    this.resizeObserver = new ResizeObserver(entries => {
      // Refresh layout when container size changes
      this.refreshLayout();
    });
    
    // Observe the container
    this.resizeObserver.observe(this.container);
  }

  /**
   * Refresh YASGUI layout
   */
  refreshLayout() {
    if (!this.yasguiInstance) return;
    
    try {
      const tab = this.yasguiInstance.getTab();
      if (tab && tab.yasqe) {
        tab.yasqe.refresh();
      }
    } catch (error) {
      console.warn('Error refreshing YASGUI layout:', error);
    }
  }

  /**
   * Unmount the plugin
   * @returns {YasguiPlugin} Plugin instance
   */
  async unmount() {
    await super.unmount();
    
    // Just hide YASGUI, don't destroy it
    if (this.container) {
      this.container.style.display = 'none';
    }
    
    return this;
  }

  /**
   * Destroy the plugin
   * @returns {boolean} Success status
   */
  async destroy() {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Destroy YASGUI instance if it exists
    if (this.yasguiInstance) {
      try {
        this.yasguiInstance.destroy();
      } catch (error) {
        console.warn('Error destroying YASGUI instance:', error);
      }
      this.yasguiInstance = null;
    }
    
    return super.destroy();
  }
}

// Export the plugin instance
export default new YasguiPlugin();
