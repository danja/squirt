// AtuinPlugin for Squirt - integrates Atuin RDF editor with Turtle and SPARQL views
import { PluginBase } from '../core/plugin-base.js'
import { eventBus, EVENTS } from 'evb'
import { store } from '../core/state/index.js'
import { getEndpoints } from '../core/state/selectors.js'
import { querySparql } from '../services/sparql/sparql.js'

// Import Atuin modules
import { TurtleEditor } from '../../../atuin/src/js/core/TurtleEditor.js'
import { SPARQLEditor } from '../../../atuin/src/js/core/SPARQLEditor.js'
import { LoggerService } from '../../../atuin/src/js/services/LoggerService.js'

// Import styles
import '../../../atuin/src/css/main.css'
import '../../../atuin/src/css/editor.css'
import '../../../atuin/src/css/graph.css'

// Default configuration
const DEFAULT_OPTIONS = {
  defaultView: 'turtle', // 'turtle' or 'sparql'
  logLevel: 'info',
  endpointType: 'query' // Type of endpoint to use for queries
}

// Sample Turtle content for initial editor loading
const sampleContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix ex: <http://example.org/> .

# Define classes
ex:Person a rdfs:Class ;
  rdfs:label "Person" ;
  rdfs:comment "A human being" .

# Define properties
ex:name a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range rdfs:Literal ;
  rdfs:label "name" ;
  rdfs:comment "The name of a person" .

ex:age a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range rdfs:Literal ;
  rdfs:label "age" ;
  rdfs:comment "The age of a person in years" .

ex:knows a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range ex:Person ;
  rdfs:label "knows" ;
  rdfs:comment "Indicates that a person knows another person" .

# Define instances
ex:john a ex:Person ;
  ex:name "John Doe" ;
  ex:age "30" ;
  ex:knows ex:jane .

ex:jane a ex:Person ;
  ex:name "Jane Smith" ;
  ex:age "28" ;
  ex:knows ex:john .
`

export class AtuinPlugin extends PluginBase {
  constructor(id = 'atuin-plugin', options = {}) {
    super(id, { ...DEFAULT_OPTIONS, ...options })
    this.editor = null
    this.sparqlEditor = null
    this.sparqlService = null
    this.logger = null
    this.currentView = this.options.defaultView
    this._eventHandlers = []
  }

  async initialize() {
    // Create a safe logger that won't throw if logger is not available
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : console.log;
          logFn(`[AtuinPlugin]`, ...args);
        }
      } catch (logError) {
        console.error('Error in Atuin plugin logger:', logError);
      }
    };

    try {
      if (this.isInitialized) {
        log('warn', 'Atuin plugin already initialized');
        return;
      }

      log('info', 'Initializing Atuin plugin...');

      // Initialize logger if not already done
      if (!this.logger) {
        try {
          this.logger = new LoggerService({ level: this.options.logLevel });
          log('debug', 'Logger initialized');
        } catch (loggerError) {
          console.error('Failed to initialize logger:', loggerError);
          // Continue without logger
        }
      }
      
      // Initial endpoints update
      try {
        this._updateEndpoints();
        log('debug', 'Initial endpoints updated');
      } catch (endpointError) {
        log('error', 'Failed to update endpoints:', endpointError);
        // Continue initialization even if endpoints fail
      }
      
      // Subscribe to store changes
      try {
        this._unsubscribe = store.subscribe(this._handleStoreUpdate.bind(this));
        log('debug', 'Subscribed to store updates');
      } catch (subscribeError) {
        log('error', 'Failed to subscribe to store:', subscribeError);
        // Continue initialization even if subscription fails
      }
      
      await super.initialize();
      log('info', 'Atuin plugin initialized successfully');
    } catch (error) {
      log('error', 'Error initializing Atuin plugin:', error);
      throw error;
    }
  }
  
  _updateEndpoints() {
    // Create a safe logger that won't throw if logger is not available
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : 
                          level === 'error' ? console.error : 
                          level === 'info' ? console.info : console.log;
          logFn(`[AtuinPlugin]`, ...args);
        }
      } catch (logError) {
        console.error('Error in Atuin plugin logger:', logError);
      }
    };

    try {
      // Check if store is available
      if (!store || typeof store.getState !== 'function') {
        log('warn', 'Store not available for endpoints update');
        return;
      }
      
      // Get current state
      const state = store.getState();
      if (!state) {
        log('warn', 'State not available for endpoints update');
        return;
      }
      
      // Safely get endpoints
      const endpoints = Array.isArray(getEndpoints) ? getEndpoints(state) || [] : [];
      log('debug', 'Available endpoints:', endpoints);
      
      // Filter for query endpoints that are enabled
      const queryEndpoints = endpoints.filter(e => { 
        return e && 
               typeof e === 'object' &&
               e.type === this.options.endpointType && 
               e.enabled !== false;
      });
      
      log('debug', 'Filtered query endpoints:', queryEndpoints);
      
      if (queryEndpoints.length === 0) {
        const message = 'No enabled SPARQL endpoints found. Please configure at least one endpoint in settings.';
        log('warn', message);
        
        // Only show notification if we're mounted and eventBus is available
        if (this.isMounted && eventBus && typeof eventBus.emit === 'function') {
          try {
            eventBus.emit(EVENTS.NOTIFICATION, {
              type: 'warning',
              message: message,
              timeout: 5000 // Show for 5 seconds
            });
          } catch (emitError) {
            log('error', 'Failed to emit notification:', emitError);
          }
        }
        
        // Clear any existing SPARQL service
        this.sparqlService = null;
        return;
      }
      
      // Use the first available endpoint
      const activeEndpoint = queryEndpoints[0];
      if (!activeEndpoint || !activeEndpoint.url) {
        log('error', 'Active endpoint is missing URL:', activeEndpoint);
        return;
      }
      
      log('info', 'Using SPARQL endpoint:', activeEndpoint.url);
      
      // Initialize SPARQL service with the active endpoint
      this.sparqlService = {
        executeQuery: async (query) => {
          if (!query) {
            throw new Error('Query cannot be empty');
          }
          
          try {
            log('debug', 'Executing SPARQL query:', query.substring(0, 100) + (query.length > 100 ? '...' : ''));
            const result = await querySparql(
              activeEndpoint.url,
              query,
              'select',
              activeEndpoint.credentials
            );
            log('debug', 'SPARQL query successful');
            return result;
          } catch (error) {
            log('error', 'SPARQL query failed:', error);
            throw error;
          }
        }
      };
      
      // Update any existing editors
      if (this.sparqlEditor && typeof this.sparqlEditor.sparqlService !== 'undefined') {
        try {
          this.sparqlEditor.sparqlService = this.sparqlService;
          log('debug', 'Updated SPARQL service in editor');
        } catch (editorError) {
          log('error', 'Failed to update SPARQL service in editor:', editorError);
        }
      }
    } catch (error) {
      log('error', 'Error in _updateEndpoints:', error);
      
      // Only show notification if we're mounted and eventBus is available
      if (this.isMounted && eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit(EVENTS.NOTIFICATION, {
            type: 'error',
            message: 'Failed to update SPARQL endpoints',
            timeout: 5000
          });
        } catch (emitError) {
          console.error('Failed to emit error notification:', emitError);
        }
      }
    }
  }
  
  _handleStoreUpdate() {
    try {
      // Only update endpoints if we're mounted and initialized
      if (this.isMounted && this.isInitialized) {
        this._updateEndpoints();
      }
    } catch (error) {
      console.error('Error in store update handler:', error);
    }
  }

  _setupEventListeners() {
    // Listen for tab changes
    const switchViewHandler = (view) => {
      if (view === 'turtle' || view === 'sparql') {
        this.switchView(view)
      }
    }
    
    // Listen for SPARQL query events
    const queryHandler = (query) => {
      if (this.sparqlEditor) {
        this.sparqlEditor.executeQuery(query)
      }
    }
    
    eventBus.on('atuin:switch-view', switchViewHandler)
    eventBus.on('sparql:query', queryHandler)
    
    // Store handlers for cleanup
    this._eventHandlers = [
      { event: 'atuin:switch-view', handler: switchViewHandler },
      { event: 'sparql:query', handler: queryHandler }
    ]
  }
  
  _removeEventListeners() {
    this._eventHandlers.forEach(({ event, handler }) => {
      eventBus.off(event, handler);
    });
    this._eventHandlers = [];
  }

  _initializeEditors() {
    const content = this.container.querySelector('.atuin-content');
    if (!content) return;
    
    // Create container for both editors
    content.innerHTML = `
      <div id="turtle-editor-container" class="editor-container" style="display: none;">
        <textarea id="turtle-editor">${sampleContent}</textarea>
      </div>
      <div id="sparql-container" style="display: none;">
        <div id="sparql-editor-container" class="editor-container">
          <textarea id="sparql-editor"></textarea>
        </div>
        <div id="sparql-results" class="results-container"></div>
      </div>
    `;
    
    // Initialize Turtle editor
    const turtleTextarea = document.getElementById('turtle-editor');
    if (turtleTextarea && !this.editor) {
      try {
        this.editor = new TurtleEditor(turtleTextarea, this.logger);
        this.editor.initialize();
      } catch (error) {
        console.error('Failed to initialize Turtle editor:', error);
        turtleTextarea.outerHTML = '<div class="error">Failed to initialize Turtle editor. Check console for details.</div>';
      }
    }
    
    // Initialize SPARQL editor
    const sparqlTextarea = document.getElementById('sparql-editor');
    if (sparqlTextarea && !this.sparqlEditor) {
      try {
        this.sparqlEditor = new SPARQLEditor(sparqlTextarea, this.logger);
        this.sparqlEditor.initialize();
      } catch (error) {
        console.error('Failed to initialize SPARQL editor:', error);
        sparqlTextarea.outerHTML = '<div class="error">Failed to initialize SPARQL editor. Check console for details.</div>';
      }
    }
  }

  _showTurtleView() {
    // Show turtle editor
    const turtleContainer = document.getElementById('turtle-editor-container');
    if (turtleContainer) {
      turtleContainer.style.display = 'block';
    }
    
    // Hide SPARQL container
    const sparqlContainer = document.getElementById('sparql-container');
    if (sparqlContainer) {
      sparqlContainer.style.display = 'none';
    }
  }

  _showSparqlView() {
    // Show SPARQL container
    const sparqlContainer = document.getElementById('sparql-container');
    if (sparqlContainer) {
      sparqlContainer.style.display = 'block';
    }
    
    // Hide turtle editor
    const turtleContainer = document.getElementById('turtle-editor-container');
    if (turtleContainer) {
      turtleContainer.style.display = 'none';
    }
  }

  /**
   * Switch between Turtle and SPARQL views
   * @param {string} view - The view to switch to ('turtle' or 'sparql')
   */
  switchView(view) {
    if (view !== 'turtle' && view !== 'sparql') {
      console.warn(`Invalid view: ${view}. Must be 'turtle' or 'sparql'`);
      return;
    }

    this.currentView = view;
    
    // Update active tab
    const tabs = this.container?.querySelectorAll('.atuin-tab');
    if (tabs && tabs.length >= 2) {
      tabs[0].classList.toggle('active', view === 'turtle');
      tabs[1].classList.toggle('active', view === 'sparql');
    }
    
    // Show the appropriate view
    if (view === 'turtle') {
      this._showTurtleView();
    } else {
      this._showSparqlView();
    }
    
    // Emit event for any listeners
    if (eventBus && typeof eventBus.emit === 'function') {
      eventBus.emit('atuin:view-changed', { view });
    }
  }

  _createTabbedInterface() {
    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.className = 'atuin-tabs';
    
    // Create Turtle tab
    const turtleTab = document.createElement('button');
    turtleTab.className = 'atuin-tab' + (this.currentView === 'turtle' ? ' active' : '');
    turtleTab.textContent = 'Turtle';
    turtleTab.addEventListener('click', () => this.switchView('turtle'));
    
    // Create SPARQL tab
    const sparqlTab = document.createElement('button');
    sparqlTab.className = 'atuin-tab' + (this.currentView === 'sparql' ? ' active' : '');
    sparqlTab.textContent = 'SPARQL';
    sparqlTab.addEventListener('click', () => this.switchView('sparql'));
    
    // Append tabs to container
    tabContainer.appendChild(turtleTab);
    tabContainer.appendChild(sparqlTab);
    
    // Insert tabs before the content
    if (this.container.firstChild) {
      this.container.insertBefore(tabContainer, this.container.firstChild);
    } else {
      this.container.appendChild(tabContainer);
    }
    
    // Add styles if not already added
    this._addTabStyles();
  }
  
  _addTabStyles() {
    // Only add styles once
    if (document.getElementById('atuin-tabs-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'atuin-tabs-styles';
    style.textContent = `
      .atuin-tabs {
        display: flex;
        border-bottom: 1px solid #ddd;
        margin-bottom: 1rem;
      }
      .atuin-tab {
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: 0.9rem;
        color: #666;
        transition: all 0.2s;
      }
      .atuin-tab:hover {
        color: #333;
        background-color: #f5f5f5;
      }
      .atuin-tab.active {
        color: #007bff;
        border-bottom-color: #007bff;
        font-weight: 500;
      }
      .editor-container {
        height: 100%;
        min-height: 300px;
      }
      .results-container {
        margin-top: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 1rem;
        background: #f9f9f9;
        max-height: 300px;
        overflow-y: auto;
      }
    `;
    document.head.appendChild(style);
  }

  async mount(container) {
    // Create a safe logger that won't throw if logger is not available
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : 
                        level === 'error' ? console.error : 
                        level === 'info' ? console.info : console.log;
          logFn(`[AtuinPlugin]`, ...args);
        }
      } catch (logError) {
        console.error('Error in Atuin plugin logger:', logError);
      }
    };

    try {
      log('info', 'Mounting Atuin plugin...');
      this.container = container;
      
      // Create the tabbed interface
      this._createTabbedInterface();
      
      // Create the content container
      const content = document.createElement('div');
      content.className = 'atuin-content';
      container.appendChild(content);
      
      // Initialize SPARQL service
      this.sparqlService = {
        executeQuery: async (query) => this.executeQuery(query)
      };
      
      // Set up Redux store subscription
      this._unsubscribe = store.subscribe(this._handleStoreUpdate.bind(this));
      
      // Initial store update
      this._handleStoreUpdate();
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Initialize both editors but keep them hidden initially
      this._initializeEditors();
      
      // Show the default view
      this.switchView(this.currentView);
      
      this.isMounted = true;
      log('info', 'Atuin plugin mounted successfully');
      return;
    } catch (error) {
      log('error', 'Failed to mount Atuin plugin:', error);
      throw error;
    }
  }

  async unmount() {
    // Create a safe logger that won't throw if logger is not available
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : 
                        level === 'error' ? console.error : 
                        level === 'info' ? console.info : console.log;
          logFn(`[AtuinPlugin]`, ...args);
        }
      } catch (logError) {
        console.error('Error in Atuin plugin logger:', logError);
      }
    };

    log('info', 'Unmounting Atuin plugin...');
    
    try {
      // Clean up editors
      if (this.editor) {
        try {
          if (typeof this.editor.destroy === 'function') {
            this.editor.destroy();
            log('debug', 'Turtle editor destroyed');
          }
          this.editor = null;
        } catch (error) {
          log('error', 'Error destroying Turtle editor:', error);
        }
      }
      
      if (this.sparqlEditor) {
        try {
          if (typeof this.sparqlEditor.destroy === 'function') {
            this.sparqlEditor.destroy();
            log('debug', 'SPARQL editor destroyed');
          }
          this.sparqlEditor = null;
        } catch (error) {
          log('error', 'Error destroying SPARQL editor:', error);
        }
      }
      
      // Clean up container
      if (this.container) {
        try {
          this.container.innerHTML = '';
          log('debug', 'Container cleared');
        } catch (domError) {
          log('error', 'Error clearing container:', domError);
        }
      }
      
      // Unsubscribe from store updates
      if (this._unsubscribe) {
        try {
          this._unsubscribe();
          this._unsubscribe = null;
          log('debug', 'Store unsubscribed');
        } catch (unsubError) {
          log('error', 'Error unsubscribing from store:', unsubError);
        }
      }
      
      // Remove event listeners
      this._removeEventListeners();
      
      this.isMounted = false;
      log('info', 'Atuin plugin unmounted successfully');
      await super.unmount();
    } catch (error) {
      log('error', 'Error unmounting Atuin plugin:', error);
      throw error;
    }
  }
  
  async destroy() {
    // Create a safe logger that won't throw if logger is not available
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : 
                          level === 'error' ? console.error : 
                          level === 'info' ? console.info : console.log;
          logFn(`[AtuinPlugin]`, ...args);
        }
      } catch (logError) {
        console.error('Error in Atuin plugin logger:', logError);
      }
    };

    log('info', 'Destroying Atuin plugin...');
    
    try {
      // First unmount the plugin if it's still mounted
      if (this.isMounted) {
        try {
          await this.unmount();
        } catch (unmountError) {
          log('error', 'Error during unmount in destroy:', unmountError);
          // Continue with destroy even if unmount fails
        }
      }
      
      // Clean up any remaining resources
      try {
        // Clear any stored event handlers
        this._eventHandlers = [];
        
        // Clear any stored references
        this.container = null;
        this.sparqlService = null;
        
        // Clear the logger reference last
        if (this.logger) {
          try {
            log('debug', 'Destroying logger...');
            this.logger = null;
          } catch (loggerError) {
            console.error('Error destroying logger:', loggerError);
          }
        }
        
        log('debug', 'Plugin resources cleaned up');
      } catch (cleanupError) {
        log('error', 'Error during resource cleanup:', cleanupError);
      }
      
      log('info', 'Atuin plugin destroyed successfully');
      await super.destroy();
    } catch (error) {
      log('error', 'Error destroying Atuin plugin:', error);
      throw error;
    }
  }
}