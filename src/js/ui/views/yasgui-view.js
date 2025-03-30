// src/js/ui/views/yasgui-view.js
import Yasgui from '@triply/yasgui';
import '@triply/yasgui/build/yasgui.min.css';
import { state } from '../../core/state.js';
import { ErrorHandler } from '../../core/errors.js';

// Global instance reference
let yasguiInstance = null;

/**
 * Initialize the YASGUI component
 */
function initializeYasguiComponent() {
  const container = document.getElementById('yasgui-container');
  if (!container) {
    console.error('YASGUI container not found');
    return;
  }

  try {
    // Skip if already initialized
    if (yasguiInstance) {
      console.log('YASGUI already initialized');
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Get endpoint configuration
    const endpoints = state.get('endpoints') || [];
    const activeEndpoint = endpoints.find(e => e.type === 'query' && e.status === 'active');

    // Create minimal configuration
    const config = {
      requestConfig: {
        endpoint: activeEndpoint ? activeEndpoint.url : 'http://localhost:3030/semem/query',
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
    yasguiInstance = new Yasgui(container, config);

    // Set default query
    const defaultQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX squirt: <http://purl.org/stuff/squirt/>

SELECT ?subject ?predicate ?object 
WHERE {
  ?subject ?predicate ?object
} 
LIMIT 10`;

    // Set the query for the first tab
    const tab = yasguiInstance.getTab();
    if (tab && tab.yasqe) {
      tab.yasqe.setValue(defaultQuery);
    }

    console.log('YASGUI initialized successfully');
  } catch (error) {
    ErrorHandler.handle(error);
    console.error('Failed to initialize YASGUI:', error);
    container.innerHTML = '<div class="error-message">Failed to initialize SPARQL editor: ' + error.message + '</div>';
  }
}

// Make function available globally
window.initializeYasguiComponent = initializeYasguiComponent;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add a button to initialize YASGUI for explicit user action
  const container = document.getElementById('yasgui-container');
  if (container) {
    container.innerHTML = `
      <div class="yasgui-init">
        <button type="button" onclick="window.initializeYasguiComponent()" class="button-primary">
          Load SPARQL Query Editor
        </button>
      </div>
    `;
  }
});

// Export for module usage
export { initializeYasguiComponent as initializeYasguiView };