// src/js/plugins/yasgui-plugin.js
// YASGUI SPARQL query editor plugin

import { PluginBase } from '../core/plugin-base.js';
import { state } from '../core/state.js';
import { ErrorHandler } from '../core/errors.js';
import { showNotification } from '../ui/components/notifications.js';

/**
 * Plugin that provides YASGUI SPARQL query editor functionality
 */
export class YasguiPlugin extends PluginBase {
  constructor(id = 'yasgui-plugin', options = {}) {
    super(id, {
      autoInitialize: true,
      defaultQuery: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX squirt: <http://purl.org/stuff/squirt/>

SELECT ?subject ?predicate ?object 
WHERE {
  ?subject ?predicate ?object
} 
LIMIT 10`,
      ...options
    });

    this.yasguiInstance = null;
    this.resizeObserver = null;
  }

  /**
   * Initialize the YASGUI plugin by loading required resources
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load YASGUI dynamically
      await this.loadYasguiDependencies();

      super.initialize();
      console.log('YASGUI plugin initialized');
    } catch (error) {
      ErrorHandler.handle(error);
      throw new Error(`Failed to initialize YASGUI plugin: ${error.message}`);
    }
  }

  /**
   * Dynamically load the YASGUI library and CSS
   */
  async loadYasguiDependencies() {
    try {
      // First try to use the Yasgui that might already be loaded
      if (window.Yasgui) {
        this.Yasgui = window.Yasgui;
        return;
      }

      // Otherwise, dynamically import it
      const module = await import('@triply/yasgui');
      this.Yasgui = module.default;

      // Import CSS if not already loaded
      if (!document.querySelector('link[href*="yasgui.min.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/@triply/yasgui/build/yasgui.min.css';
        document.head.appendChild(link);
      }
    } catch (error) {
      throw new Error(`Failed to load YASGUI dependencies: ${error.message}`);
    }
  }

  /**
   * Set up the YASGUI component in the container
   */
  async mount(container) {
    await super.mount(container);

    try {
      // Clear container
      container.innerHTML = '<div class="yasgui-wrapper"></div>';
      const wrapper = container.querySelector('.yasgui-wrapper');

      // Get endpoint configuration
      const endpoints = state.get('endpoints') || [];
      const activeEndpoint = endpoints.find(e => e.type === 'query' && e.status === 'active');

      // Create minimal configuration
      const config = {
        requestConfig: {
          endpoint: activeEndpoint ? activeEndpoint.url : 'http://localhost:4030/semem/query',
          method: 'POST'
        }
      };

      // Add authentication if needed
      if (activeEndpoint && activeEndpoint.credentials) {
        const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password);
        config.requestConfig.headers = {
          'Authorization': 'Basic ' + authString
        };
      }

      // Create the YASGUI instance
      this.yasguiInstance = new this.Yasgui(wrapper, config);

      // Set default query
      const tab = this.yasguiInstance.getTab();
      if (tab && tab.yasqe) {
        tab.yasqe.setValue(this.options.defaultQuery);
      }

      // Set up resize handling
      this.setupResizeObserver();

      // Handle endpoint changes
      this.addEventListener(document, 'endpointsStatusChecked', this.handleEndpointChange.bind(this));

      console.log('YASGUI plugin mounted successfully');
    } catch (error) {
      ErrorHandler.handle(error);
      container.innerHTML = `<div class="error-message">Failed to initialize SPARQL editor: ${error.message}</div>`;
      throw error;
    }
  }

  /**
   * Handle endpoint change events
   */
  handleEndpointChange(event) {
    if (!this.yasguiInstance) return;

    try {
      const { queryActive } = event.detail;
      if (queryActive) {
        // Get the active endpoint
        const endpoints = state.get('endpoints') || [];
        const activeEndpoint = endpoints.find(e => e.type === 'query' && e.status === 'active');

        if (activeEndpoint) {
          // Update all tabs with the new endpoint
          this.yasguiInstance.getTab().yasqe.options.requestConfig.endpoint = activeEndpoint.url;

          // Update authentication if needed
          if (activeEndpoint.credentials) {
            const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password);
            this.yasguiInstance.getTab().yasqe.options.requestConfig.headers = {
              'Authorization': 'Basic ' + authString
            };
          } else {
            // Remove auth if not needed
            delete this.yasguiInstance.getTab().yasqe.options.requestConfig.headers;
          }

          showNotification('SPARQL endpoint updated', 'success');
        }
      }
    } catch (error) {
      ErrorHandler.handle(error);
    }
  }

  /**
   * Set up resize observer to handle container size changes
   */
  setupResizeObserver() {
    // Clean up existing observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Create new observer
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.handleResize();
        }
      }
    });

    // Observe container
    if (this.container) {
      this.resizeObserver.observe(this.container);
    }

    // Initial resize
    this.handleResize();
  }

  /**
   * Handle container resize events
   */
  handleResize() {
    if (!this.yasguiInstance || !this.container) return;

    // Get container dimensions
    const { width, height } = this.container.getBoundingClientRect();

    // Apply min-height to ensure the component is visible
    const wrapper = this.container.querySelector('.yasgui-wrapper');
    if (wrapper) {
      wrapper.style.minHeight = '500px';
      wrapper.style.height = `${height}px`;
      wrapper.style.width = `${width}px`;
    }

    // Force YASGUI to redraw
    if (this.yasguiInstance.store) {
      this.yasguiInstance.store.dispatch({
        type: 'YASGUI_RESIZE'
      });
    }
  }

  /**
   * Clean up the YASGUI component
   */
  async unmount() {
    if (!this.isMounted) return;

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up YASGUI instance
    if (this.yasguiInstance) {
      // No explicit destroy method, so we'll just remove references
      this.yasguiInstance = null;
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    await super.unmount();
    console.log('YASGUI plugin unmounted');
  }

  /**
   * Release all resources
   */
  async destroy() {
    await this.unmount();
    await super.destroy();
    console.log('YASGUI plugin destroyed');
  }
}