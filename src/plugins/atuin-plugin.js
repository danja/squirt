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
import { GraphVisualizerTab } from './GraphVisualizerTab.js'

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
    super(id, { ...DEFAULT_OPTIONS, ...options });
    this.editor = null;
    this.sparqlEditor = null;
    this.sparqlService = null;
    this.logger = null;
    this.currentView = this.options.defaultView;
    this._eventHandlers = [];
    this.graphTab = null;
    this._graphInitialized = false;
    this._unsubscribe = null;
    this.isMounted = false;
    this.container = null;
  }

  async initialize() {
    // Create a safe logger that won't throw if logger is not available
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' || level === 'error' ? console[level] || console.error : console.log;
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
          // Check if LoggerService is available
          if (typeof LoggerService === 'function') {
            this.logger = new LoggerService({ level: this.options.logLevel });
            log('debug', 'Logger initialized');
          } else {
            // Fallback to console if LoggerService is not available
            this.logger = {
              debug: (...args) => console.debug('[AtuinPlugin]', ...args),
              info: (...args) => console.info('[AtuinPlugin]', ...args),
              warn: (...args) => console.warn('[AtuinPlugin]', ...args),
              error: (...args) => console.error('[AtuinPlugin]', ...args)
            };
            log('debug', 'Using console fallback logger');
          }
        } catch (loggerError) {
          console.error('Failed to initialize logger:', loggerError);
          // Fallback to console
          this.logger = {
            debug: (...args) => console.debug('[AtuinPlugin]', ...args),
            info: (...args) => console.info('[AtuinPlugin]', ...args),
            warn: (...args) => console.warn('[AtuinPlugin]', ...args),
            error: (...args) => console.error('[AtuinPlugin]', ...args)
          };
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
    if (this._eventHandlers && Array.isArray(this._eventHandlers)) {
      this._eventHandlers.forEach(({ event, handler }) => {
        try {
          if (eventBus && typeof eventBus.off === 'function' && event && handler) {
            eventBus.off(event, handler);
          }
        } catch (error) {
          console.error('Error removing event listener:', error);
        }
      });
      this._eventHandlers = [];
    }
  }

  _setupEventListeners() {
    // Listen for tab changes
    const switchViewHandler = (view) => {
      if (view === 'turtle' || view === 'sparql' || view === 'graph') {
        this.switchView(view);
      }
    };
    
    // Listen for SPARQL query events
    const queryHandler = (query) => {
      if (this.sparqlEditor && typeof this.sparqlEditor.executeQuery === 'function') {
        this.sparqlEditor.executeQuery(query);
      }
    };
    
    // Set up event listeners
    if (eventBus) {
      eventBus.on('atuin:switch-view', switchViewHandler);
      eventBus.on('sparql:query', queryHandler);
      
      // Store handlers for cleanup
      this._eventHandlers = [
        { event: 'atuin:switch-view', handler: switchViewHandler },
        { event: 'sparql:query', handler: queryHandler }
      ];
    }
  }

  async switchView(view) {
    if (view === this.currentView) return;
    
    // Hide all views
    const views = ['turtle', 'sparql', 'graph'];
    views.forEach(v => {
      let element = document.getElementById(`${v}-editor-container`) || 
                   document.getElementById(`${v}-container`);
      
      // Create the container if it doesn't exist
      if (!element && v === 'graph') {
        element = document.createElement('div');
        element.id = 'graph-container';
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.display = 'none';
        
        const mainContainer = this.container.querySelector('.main-content') || this.container;
        mainContainer.appendChild(element);
      }
      
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Update current view
    this.currentView = view;
    
    // Show selected view
    let viewElement = document.getElementById(`${view}-editor-container`) || 
                     document.getElementById(`${view}-container`);
                     
    // Create the view element if it doesn't exist
    if (!viewElement && view === 'graph') {
      viewElement = document.createElement('div');
      viewElement.id = 'graph-container';
      viewElement.style.width = '100%';
      viewElement.style.height = '100%';
      
      const mainContainer = this.container.querySelector('.main-content') || this.container;
      mainContainer.appendChild(viewElement);
    }
    
    if (viewElement) {
      viewElement.style.display = 'block';
    }
    
    // Update active tab
    if (document.querySelectorAll) {
      document.querySelectorAll('.atuin-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase() === view) {
          tab.classList.add('active');
        }
      });
    }
    
    // Handle view-specific initialization
    if (view === 'turtle' && this.editor && typeof this.editor.refresh === 'function') {
      this.editor.refresh();
    } else if (view === 'sparql' && this.sparqlEditor && typeof this.sparqlEditor.refresh === 'function') {
      this.sparqlEditor.refresh();
    } else if (view === 'graph') {
      await this._initializeGraphView();
    }
  }

  async _initializeGraphView() {
    try {
      // Ensure the graph container exists in the DOM
      let container = document.getElementById('graph-container');
      if (!container) {
        // Create the container if it doesn't exist
        container = document.createElement('div');
        container.id = 'graph-container';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'block';
        
        // Add the container to the main container
        const mainContainer = document.getElementById('graph-editor-container') || this.container;
        mainContainer.appendChild(container);
      }
      
      // Initialize graph tab if not already done
      if (!this.graphTab) {
        const turtleContent = this.editor ? this.editor.getValue() : '';
        this.graphTab = new GraphVisualizerTab(container, turtleContent);
      } else if (this.graphTab && !this.graphTab.initialized) {
        // Re-initialize if needed
        await this.graphTab.initialize();
      }
      
      // Initialize or update the graph
      if (this.graphTab && typeof this.graphTab.initialize === 'function') {
        await this.graphTab.initialize();
      }
      
      // If there's a turtle editor, update the graph with its content
      if (this.editor && this.graphTab && typeof this.graphTab.updateGraph === 'function') {
        const turtleContent = this.editor.getValue();
        await this.graphTab.updateGraph(turtleContent);
      }
      
      this._graphInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize graph view:', error);
      const container = document.getElementById('graph-container');
      if (container) {
        container.innerHTML = `
          <div class="error">
            Failed to load graph visualization: ${error.message}
          </div>
        `;
      }
    }
  }

  _createTabbedInterface() {
    if (!this.container) return;
    
    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.className = 'atuin-tabs';

    // Create tabs
    const tabs = [
      { id: 'turtle', label: 'Turtle' },
      { id: 'sparql', label: 'SPARQL' },
      { id: 'graph', label: 'Graph' }
    ];

    tabs.forEach(tabInfo => {
      const tab = document.createElement('button');
      tab.className = `atuin-tab ${this.currentView === tabInfo.id ? 'active' : ''}`;
      tab.textContent = tabInfo.label;
      tab.dataset.view = tabInfo.id;
      tab.addEventListener('click', () => this.switchView(tabInfo.id));
      tabContainer.appendChild(tab);
    });

    // Add tabs to the DOM
    this.container.insertBefore(tabContainer, this.container.firstChild);
  }

  async _executeSparql() {
    if (!this.sparqlEditor || !this.sparqlService) return;
    
    const query = this.sparqlEditor.getValue();
    if (!query || !query.trim()) {
      console.warn('No SPARQL query to execute');
      return;
    }
    
    const resultsContainer = document.getElementById('sparql-results');
    if (!resultsContainer) {
      console.error('SPARQL results container not found');
      return;
    }
    
    // Show loading state
    resultsContainer.innerHTML = '<div class="loading">Executing query...</div>';
    
    try {
      // Execute the SPARQL query
      const result = await this.sparqlService.executeQuery(query);
      
      // Display results
      if (result && typeof result === 'object') {
        // Format and display the results
        resultsContainer.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
      } else {
        resultsContainer.innerHTML = '<div class="success">Query executed successfully. No results to display.</div>';
      }
    } catch (error) {
      console.error('Error executing SPARQL query:', error);
      resultsContainer.innerHTML = `
        <div class="error">
          <strong>Error executing query:</strong><br>
          ${error.message || 'Unknown error'}
        </div>
      `;
    }
  }

  _initializeEditors() {
    if (!this.container) return;
    
    // Create main content container
    const content = document.createElement('div');
    content.className = 'atuin-content';
    this.container.appendChild(content);
    
    // Create tabbed interface
    this._createTabbedInterface();
    
    // Create editor containers
    content.innerHTML = `
      <div id="turtle-editor-container" class="editor-container" ${this.currentView !== 'turtle' ? 'style="display: none;"' : ''}>
        <textarea id="turtle-editor">${sampleContent}</textarea>
      </div>
      <div id="sparql-container" ${this.currentView !== 'sparql' ? 'style="display: none;"' : ''}>
        <div id="sparql-editor-container" class="editor-container">
          <textarea id="sparql-editor"></textarea>
        </div>
        <div id="sparql-results" class="results-container"></div>
      </div>
      <div id="graph-container" ${this.currentView !== 'graph' ? 'style="display: none;"' : ''}>
      </div>
    `;
    
    // Initialize Turtle editor
    const turtleTextarea = document.getElementById('turtle-editor');
    if (window.CodeMirror && turtleTextarea) {
      try {
        this.editor = window.CodeMirror.fromTextArea(turtleTextarea, {
          mode: 'text/turtle',
          lineNumbers: true,
          lineWrapping: true,
          theme: 'default',
          extraKeys: {
            'Ctrl-Enter': () => this._executeSparql()
          }
        });
        
        // Handle changes to update the graph view
        this.editor.on('change', () => {
          if (this.currentView === 'graph' && this.graphTab) {
            this.graphTab.updateGraph(this.editor.getValue());
          }
        });
        
      } catch (error) {
        console.error('Failed to initialize Turtle editor:', error);
        turtleTextarea.outerHTML = '<div class="error">Failed to initialize Turtle editor. Check console for details.</div>';
      }
    }
    
    // Initialize SPARQL editor
    const sparqlTextarea = document.getElementById('sparql-editor');
    if (window.CodeMirror && sparqlTextarea) {
      try {
        this.sparqlEditor = window.CodeMirror.fromTextArea(sparqlTextarea, {
          mode: 'application/sparql-query',
          lineNumbers: true,
          lineWrapping: true,
          theme: 'default',
          extraKeys: {
            'Ctrl-Enter': () => this._executeSparql()
          }
        });
        
        // Set up SPARQL service if available
        if (this.sparqlService) {
          this.sparqlEditor.sparqlService = this.sparqlService;
        }
        
      } catch (error) {
        console.error('Failed to initialize SPARQL editor:', error);
        sparqlTextarea.outerHTML = '<div class="error">Failed to initialize SPARQL editor. Check console for details.</div>';
      }
    }
  }

  _updateEndpoints() {
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : 
                       level === 'error' ? console.error : 
                       level === 'info' ? console.info : 
                       console.log;
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

  async mount(container) {
    if (!container) {
      throw new Error('Container element is required');
    }
    
    this.container = container;
    this.isMounted = true;
    
    try {
      // Set up the UI
      this._initializeEditors();
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Initial endpoints update
      this._updateEndpoints();
      
      // Initialize the current view
      await this.switchView(this.currentView);
      
      this.logger?.info('Atuin plugin mounted successfully');
      return true;
    } catch (error) {
      this.logger?.error('Error mounting Atuin plugin:', error);
      this.isMounted = false;
      throw error;
    }
  }
  
  async unmount() {
    try {
      // Switch to turtle view before unmounting to ensure proper cleanup
      if (this.currentView !== 'turtle') {
        await this.switchView('turtle');
      }
      
      // Clean up DOM
      if (this.container) {
        while (this.container.firstChild) {
          this.container.removeChild(this.container.firstChild);
        }
      }
      
      // Clean up event listeners
      this._removeEventListeners();
      
      // Reset state
      this.isMounted = false;
      this.container = null;
      
      this.logger?.info('Atuin plugin unmounted');
      return true;
    } catch (error) {
      this.logger?.error('Error unmounting Atuin plugin:', error);
      throw error;
    }
  }
  
  async destroy() {
    const log = (level, ...args) => {
      try {
        if (this.logger && typeof this.logger[level] === 'function') {
          this.logger[level](...args);
        } else {
          const logFn = level === 'warn' ? console.warn : 
                       level === 'error' ? console.error : 
                       level === 'info' ? console.info : 
                       console.log;
          logFn(`[AtuinPlugin]`, ...args);
        }
      } catch (logError) {
        console.error('Error in Atuin plugin logger:', logError);
      }
    };

    try {
      log('info', 'Destroying Atuin plugin...');
      
      // Clean up event listeners and resources
      this._removeEventListeners();
      
      // Unsubscribe from store if exists
      if (this._unsubscribe && typeof this._unsubscribe === 'function') {
        try {
          this._unsubscribe();
        } catch (unsubError) {
          log('error', 'Error unsubscribing from store:', unsubError);
        }
        this._unsubscribe = null;
      }
      
      // Clean up graph tab
      if (this.graphTab && typeof this.graphTab.destroy === 'function') {
        try {
          this.graphTab.destroy();
        } catch (graphError) {
          log('error', 'Error destroying graph tab:', graphError);
        }
        this.graphTab = null;
      }
      
      // Clean up editors
      if (this.editor && typeof this.editor.destroy === 'function') {
        try {
          this.editor.destroy();
        } catch (editorError) {
          log('error', 'Error destroying editor:', editorError);
        }
        this.editor = null;
      }
      
      if (this.sparqlEditor && typeof this.sparqlEditor.destroy === 'function') {
        try {
          this.sparqlEditor.destroy();
        } catch (sparqlError) {
          log('error', 'Error destroying SPARQL editor:', sparqlError);
        }
        this.sparqlEditor = null;
      }
      
      // Remove all child elements
      if (this.container && this.container.firstChild) {
        try {
          while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
          }
        } catch (domError) {
          log('error', 'Error cleaning up DOM elements:', domError);
        }
      }
      
      // Call parent destroy if it exists
      if (super.destroy && typeof super.destroy === 'function') {
        try {
          await super.destroy();
        } catch (parentError) {
          log('error', 'Error in parent destroy:', parentError);
        }
      }
      
      log('info', 'Atuin plugin destroyed successfully');
    } catch (error) {
      log('error', 'Error during Atuin plugin destruction:', error);
      throw error;
    }
  }
}