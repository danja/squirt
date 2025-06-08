// AtuinPlugin for Squirt - Uses actual atuin v0.1.1 components
import { PluginBase } from '../core/plugin-base.js'
import { eventBus, EVENTS } from 'evb'
import { store } from '../core/state/index.js'
import { getEndpoints } from '../core/state/selectors.js'
import { querySparql } from '../services/sparql/sparql.js'

// Import atuin components and services using specific export paths
import { TurtleEditor } from 'atuin/core/TurtleEditor'
import { SPARQLEditor } from 'atuin/core/SPARQLEditor'
import { GraphVisualizer } from 'atuin/core/GraphVisualizer'
import { LoggerService } from 'atuin/services'
import { SettingsManager, SplitPaneManager } from 'atuin/ui'

// Import CSS from atuin dist using correct export paths
import 'atuin/css/main'
import 'atuin/css/editor'
import 'atuin/css/graph'

// Default configuration
const DEFAULT_OPTIONS = {
  defaultView: 'turtle', // 'turtle', 'sparql', or 'graph'
  endpointType: 'query', // Type of endpoint to use for queries
  enableSplitPane: true, // Enable split pane layout
  enableSettings: true, // Enable settings panel
  enableFileHandling: true, // Enable file save/load
  logLevel: 'info' // Logger level
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

// Sample SPARQL query
const sampleSparql = `PREFIX ex: <http://example.org/>
SELECT ?person ?name ?age WHERE {
  ?person a ex:Person ;
          ex:name ?name ;
          ex:age ?age .
  FILTER(?age > 25)
}
ORDER BY ?name
`

export class AtuinPlugin extends PluginBase {
  constructor(id = 'atuin-plugin', options = {}) {
    super(id, { 
      ...DEFAULT_OPTIONS, 
      ...options,
      // Define main tab contributions
      providesMainTabs: [
        { id: 'turtle', label: 'Turtle', component: 'TurtleEditor' },
        { id: 'sparql', label: 'SPARQL', component: 'SPARQLEditor' },
        { id: 'graph', label: 'Graph', component: 'GraphVisualizer' }
      ]
    });
    
    // Atuin components
    this.logger = null;
    this.turtleEditor = null;
    this.sparqlEditor = null;
    this.graphVisualizer = null;
    this.sparqlService = null;
    this.settingsManager = null;
    this.splitPaneManager = null;
    
    // UI state - now tracks which tab component is active
    this._eventHandlers = [];
    this._unsubscribe = null;
    this._isComponentsInitialized = false;
    this._activeTabComponent = null;
    this._activeTabId = null;
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn('Atuin plugin already initialized');
      return;
    }

    try {
      console.log('Initializing Atuin plugin with v0.1.1...');

      // Initialize professional logger first
      await this._initializeLogger();

      // Subscribe to store changes for endpoint updates
      this._unsubscribe = store.subscribe(this._handleStoreUpdate.bind(this));

      // Initial endpoints update
      this._updateEndpoints();

      // Set up mutation observer to detect container clearing
      this._setupContainerObserver();

      await super.initialize();
      this.logger.info('Atuin plugin v0.1.1 initialized successfully');
    } catch (error) {
      console.error('Error initializing Atuin plugin:', error);
      throw error;
    }
  }

  async _initializeLogger() {
    try {
      // Suppress ResizeObserver errors (common with graph visualizations)
      this._suppressResizeObserverErrors();

      // Create logger container for alerts
      const loggerContainer = document.createElement('div');
      loggerContainer.id = 'atuin-logger-container';
      loggerContainer.style.position = 'fixed';
      loggerContainer.style.top = '20px';
      loggerContainer.style.right = '20px';
      loggerContainer.style.zIndex = '10000';
      document.body.appendChild(loggerContainer);

      this.logger = new LoggerService(loggerContainer);
      this.logger.setLevel(this.options.logLevel);
      console.log('Professional LoggerService initialized');
    } catch (error) {
      console.warn('Failed to initialize LoggerService, using console fallback:', error);
      // Fallback to console
      this.logger = {
        debug: (...args) => console.debug('[Atuin]', ...args),
        info: (...args) => console.info('[Atuin]', ...args),
        warn: (...args) => console.warn('[Atuin]', ...args),
        error: (...args) => console.error('[Atuin]', ...args),
        alert: (...args) => console.log('[Atuin Alert]', ...args)
      };
    }
  }

  _suppressResizeObserverErrors() {
    // Suppress harmless ResizeObserver errors that are common with graph visualizations
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (message && typeof message === 'string' && 
          message.includes('ResizeObserver loop completed with undelivered notifications')) {
        // Suppress this specific error as it's harmless
        return true;
      }
      // Call original error handler for other errors
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  _setupContainerObserver() {
    // Create a mutation observer to detect when plugin containers are being cleared
    this._observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          // Check if this was a plugin container or graph-specific content
          const target = mutation.target;
          const isPluginContainer = target && target.classList && target.classList.contains('plugin-tab-container');
          const isGraphContainer = target && target.classList && target.classList.contains('graph-container');
          const isGraphVisualizer = target && target.classList && target.classList.contains('graph-visualizer-container');
          
          if (isPluginContainer || isGraphContainer || isGraphVisualizer) {
            console.log(`[AtuinPlugin] MUTATION OBSERVER: Content removed from ${target.className}:`, target);
            console.log(`[AtuinPlugin] Removed nodes:`, Array.from(mutation.removedNodes).map(n => n.tagName || n.nodeType));
            console.log(`[AtuinPlugin] Current container content length:`, target.innerHTML.length);
            console.log(`[AtuinPlugin] Stack trace:`, new Error().stack);
          }
        }
      });
    });

    // Start observing plugin containers when they're created
    this._observeContainers();
  }

  _observeContainers() {
    // Look for existing plugin containers and observe them
    const containers = document.querySelectorAll('.plugin-tab-container');
    containers.forEach(container => {
      this._observer.observe(container, {
        childList: true,
        subtree: true
      });
    });

    // Also observe the document for new plugin containers
    this._observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async mount(container) {
    if (!container) {
      throw new Error('Container element is required');
    }

    this.container = container;

    try {
      // For backwards compatibility - mount with default tab
      await this.mountTabComponent('turtle', container);
      console.log('Atuin plugin mounted successfully (legacy mode)');
      return true;
    } catch (error) {
      console.error('Error mounting Atuin plugin:', error);
      throw error;
    }
  }

  /**
   * Mount a specific tab component
   * @param {string} tabId - The tab ID ('turtle', 'sparql', 'graph')
   * @param {HTMLElement} container - Container to mount to
   */
  async mountTabComponent(tabId, container) {
    console.log(`[AtuinPlugin] mountTabComponent called: ${tabId}`, container);
    
    if (!container) {
      throw new Error('Container element is required');
    }

    // If we're already showing this tab, just refresh it
    if (this._activeTabId === tabId && this.container === container) {
      console.log(`[AtuinPlugin] Tab ${tabId} already mounted, refreshing...`);
      return true;
    }

    // Clear the previous container content but don't fully unmount components
    if (this._activeTabComponent && this._activeTabId !== tabId) {
      console.log(`[AtuinPlugin] Switching from ${this._activeTabId} to ${tabId}`);
      // Just clear event handlers, but keep components alive
      this._cleanupEventHandlers();
    }

    this.container = container;
    this._activeTabId = tabId;

    try {
      // Initialize components if not already done
      if (!this._isComponentsInitialized) {
        console.log(`[AtuinPlugin] Initializing Atuin components...`);
        await this._initializeAtuinComponents();
      }

      // Mount the specific component
      console.log(`[AtuinPlugin] Mounting specific component: ${tabId}`);
      await this._mountSpecificComponent(tabId, container);
      
      console.log(`[AtuinPlugin] Tab ${tabId} mounted successfully`);
      return true;
    } catch (error) {
      console.error(`[AtuinPlugin] Error mounting tab ${tabId}:`, error);
      throw error;
    }
  }

  _createAtuinDOM() {
    this.container.innerHTML = `
      <div class="atuin-container">
        <!-- Header with tabs and controls -->
        <div class="atuin-header">
          <div class="tab-container">
            <div class="tabs">
              <button id="tab-turtle" class="tab active" data-view="turtle">Turtle Editor</button>
              <button id="tab-sparql" class="tab" data-view="sparql">SPARQL Query</button>
              <button id="tab-graph" class="tab" data-view="graph">Graph View</button>
            </div>
          </div>
          ${this.options.enableFileHandling ? `
          <div class="file-controls">
            <button id="load-file" class="btn btn-outline">Load File</button>
            <button id="save-file" class="btn btn-outline">Save File</button>
            <input type="file" id="file-input" accept=".ttl,.turtle,.n3,.rdf,.sparql" style="display: none;">
          </div>
          ` : ''}
          ${this.options.enableSettings ? `
          <div class="settings-controls">
            <button id="toggle-settings" class="btn btn-outline">⚙️ Settings</button>
          </div>
          ` : ''}
        </div>

        <!-- Main content area with split pane layout -->
        <div class="atuin-main-content">
          ${this.options.enableSplitPane ? `
          <div class="split-pane-container">
            <div class="left-pane">
              <!-- Editor panels -->
              <div id="turtle-editor-pane" class="editor-pane">
                <div id="turtle-editor-container" class="editor-container"></div>
              </div>
              <div id="sparql-editor-pane" class="editor-pane" style="display: none;">
                <div id="sparql-editor-container" class="editor-container"></div>
                <div class="sparql-controls">
                  <button id="execute-sparql" class="btn btn-primary">Execute Query</button>
                  <button id="clear-results" class="btn btn-secondary">Clear Results</button>
                  <button id="format-sparql" class="btn btn-outline">Format Query</button>
                </div>
                <div id="sparql-results" class="results-container">
                  <div class="no-results">No query executed yet.</div>
                </div>
              </div>
            </div>
            <div id="split-divider" class="split-divider"></div>
            <div class="right-pane">
              <div id="graph-pane" class="graph-pane">
                <div id="graph-container" class="graph-container"></div>
                <div class="graph-controls">
                  <button id="fit-graph" class="btn btn-outline">Fit to View</button>
                  <button id="reset-graph" class="btn btn-outline">Reset Layout</button>
                  <label class="control-label">
                    Node Size: <input type="range" id="node-size-slider" min="10" max="50" value="25">
                  </label>
                </div>
              </div>
            </div>
          </div>
          ` : `
          <!-- Non-split layout fallback -->
          <div class="content-container">
            <div id="turtle-editor-pane" class="editor-pane">
              <div id="turtle-editor-container" class="editor-container"></div>
            </div>
            <div id="sparql-editor-pane" class="editor-pane" style="display: none;">
              <div id="sparql-editor-container" class="editor-container"></div>
              <div class="sparql-controls">
                <button id="execute-sparql" class="btn btn-primary">Execute Query</button>
                <button id="clear-results" class="btn btn-secondary">Clear Results</button>
              </div>
              <div id="sparql-results" class="results-container">
                <div class="no-results">No query executed yet.</div>
              </div>
            </div>
            <div id="graph-pane" class="graph-pane" style="display: none;">
              <div id="graph-container" class="graph-container"></div>
            </div>
          </div>
          `}
        </div>

        <!-- Settings panel (hidden by default) -->
        ${this.options.enableSettings ? `
        <div id="settings-panel" class="settings-panel" style="display: none;">
          <div class="settings-header">
            <h3>Atuin Settings</h3>
            <button id="close-settings" class="btn btn-outline">✕</button>
          </div>
          <div id="settings-content" class="settings-content">
            <!-- Settings will be populated by SettingsManager -->
          </div>
        </div>
        ` : ''}
      </div>
    `;

    // Add enhanced styles
    this._addEnhancedStyles();
  }

  _addEnhancedStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .atuin-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .atuin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #e1e5e9;
        background: #f8f9fa;
      }

      .tab-container {
        flex: 1;
      }

      .tabs {
        display: flex;
        gap: 4px;
      }

      .tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 6px 6px 0 0;
        transition: all 0.2s ease;
        font-weight: 500;
        color: #6c757d;
        font-size: 14px;
      }

      .tab:hover {
        background: #e9ecef;
        color: #495057;
      }

      .tab.active {
        background: #fff;
        color: #0d6efd;
        border-bottom: 2px solid #0d6efd;
        font-weight: 600;
      }

      .file-controls, .settings-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .atuin-main-content {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      .split-pane-container {
        display: flex;
        height: 100%;
      }

      .left-pane {
        flex: 1;
        min-width: 300px;
        position: relative;
      }

      .split-divider {
        width: 4px;
        background: #e1e5e9;
        cursor: col-resize;
        transition: background-color 0.2s;
      }

      .split-divider:hover {
        background: #0d6efd;
      }

      .right-pane {
        flex: 1;
        min-width: 300px;
        position: relative;
      }

      .editor-pane, .graph-pane {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
      }

      .editor-container {
        flex: 1;
        position: relative;
      }

      .sparql-controls {
        padding: 12px;
        border-top: 1px solid #e1e5e9;
        background: #f8f9fa;
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .graph-controls {
        padding: 12px;
        border-top: 1px solid #e1e5e9;
        background: #f8f9fa;
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }

      .control-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #495057;
      }

      .results-container {
        max-height: 300px;
        overflow-y: auto;
        border-top: 1px solid #e1e5e9;
        background: #fff;
      }

      .graph-container {
        flex: 1;
        background: #fff;
      }

      .btn {
        padding: 6px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .btn-primary {
        background: #0d6efd;
        color: white;
        border-color: #0d6efd;
      }

      .btn-primary:hover {
        background: #0b5ed7;
        border-color: #0a58ca;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
        border-color: #6c757d;
      }

      .btn-secondary:hover {
        background: #5c636a;
        border-color: #565e64;
      }

      .btn-outline {
        background: transparent;
        color: #0d6efd;
        border-color: #0d6efd;
      }

      .btn-outline:hover {
        background: #0d6efd;
        color: white;
      }

      .settings-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 350px;
        height: 100vh;
        background: #fff;
        border-left: 1px solid #e1e5e9;
        z-index: 1000;
        box-shadow: -2px 0 8px rgba(0,0,0,0.1);
        overflow-y: auto;
      }

      .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #e1e5e9;
        background: #f8f9fa;
      }

      .settings-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #495057;
      }

      .settings-content {
        padding: 16px;
      }

      .no-results, .loading {
        padding: 32px 16px;
        text-align: center;
        color: #6c757d;
        font-style: italic;
      }

      .error {
        padding: 12px 16px;
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
        margin: 8px;
        border-radius: 4px;
        font-size: 14px;
      }

      .success {
        padding: 12px 16px;
        background: #d1e7dd;
        color: #0f5132;
        border: 1px solid #badbcc;
        margin: 8px;
        border-radius: 4px;
        font-size: 14px;
      }

      pre {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 12px;
        margin: 8px;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.4;
        overflow-x: auto;
      }

      /* CodeMirror integration styles */
      .editor-container .cm-editor {
        height: 100%;
        font-size: 14px;
      }

      .editor-container .cm-focused {
        outline: none;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .split-pane-container {
          flex-direction: column;
        }
        
        .left-pane, .right-pane {
          min-width: unset;
          min-height: 300px;
        }
        
        .split-divider {
          width: 100%;
          height: 4px;
          cursor: row-resize;
        }
        
        .settings-panel {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async _initializeAtuinComponents() {
    try {
      this.logger.info('Initializing atuin v0.1.1 components...');

      // Initialize professional components
      await this._initializeTurtleEditor();
      await this._initializeSparqlEditor(); 
      await this._initializeGraphVisualizer();
      await this._initializeSparqlService();
      
      // Initialize UI managers
      if (this.options.enableSplitPane) {
        await this._initializeSplitPaneManager();
      }
      
      if (this.options.enableSettings) {
        await this._initializeSettingsManager();
      }

      // Set up event-driven communication
      this._setupEventBusIntegration();

      this._isComponentsInitialized = true;
      this.logger.info('All atuin components initialized successfully');
      
    } catch (error) {
      this.logger.error('Some atuin components failed to initialize:', error);
      // Continue with fallback components
    }
  }

  async _initializeTurtleEditor() {
    const container = document.getElementById('turtle-editor-container');
    if (!container) {
      this.logger.warn('Turtle editor container not found');
      return;
    }

    try {
      this.turtleEditor = new TurtleEditor(container, this.logger);
      await this.turtleEditor.initialize();
      
      // Set initial content
      this.turtleEditor.setValue(sampleContent);
      
      // Set up change handler for real-time graph updates
      this.turtleEditor.onChange((content) => {
        if (this.graphVisualizer && typeof this.graphVisualizer.updateGraph === 'function') {
          this.graphVisualizer.updateGraph(content);
        }
        // Emit event for other components
        eventBus.emit('turtle:content-changed', content);
      });
      
      this.logger.info('Professional TurtleEditor initialized with CodeMirror 6');
    } catch (error) {
      this.logger.error('Failed to initialize professional TurtleEditor:', error);
      // Create fallback simple editor
      this._createFallbackTurtleEditor(container);
    }
  }

  _createFallbackTurtleEditor(container) {
    container.innerHTML = `<textarea id="turtle-fallback" class="editor-textarea">${sampleContent}</textarea>`;
    const textarea = container.querySelector('#turtle-fallback');
    
    this.turtleEditor = {
      getValue: () => textarea.value,
      setValue: (value) => { textarea.value = value; },
      onChange: (callback) => {
        textarea.addEventListener('input', () => callback(textarea.value));
      },
      refresh: () => {},
      destroy: () => {}
    };
    
    this.logger.warn('Using fallback textarea editor for Turtle');
  }

  async _initializeSparqlEditor() {
    const container = document.getElementById('sparql-editor-container');
    if (!container) {
      this.logger.warn('SPARQL editor container not found');
      return;
    }

    try {
      this.sparqlEditor = new SPARQLEditor(container, this.logger);
      await this.sparqlEditor.initialize();
      
      // Set initial content
      this.sparqlEditor.setValue(sampleSparql);
      
      // Set up change handler
      this.sparqlEditor.onChange((query) => {
        eventBus.emit('sparql:query-changed', query);
      });
      
      this.logger.info('Professional SPARQLEditor initialized with syntax highlighting');
    } catch (error) {
      this.logger.error('Failed to initialize professional SPARQLEditor:', error);
      // Create fallback simple editor
      this._createFallbackSparqlEditor(container);
    }
  }

  _createFallbackSparqlEditor(container) {
    container.innerHTML = `<textarea id="sparql-fallback" class="editor-textarea">${sampleSparql}</textarea>`;
    const textarea = container.querySelector('#sparql-fallback');
    
    this.sparqlEditor = {
      getValue: () => textarea.value,
      setValue: (value) => { textarea.value = value; },
      onChange: (callback) => {
        textarea.addEventListener('input', () => callback(textarea.value));
      },
      refresh: () => {},
      destroy: () => {}
    };
    
    this.logger.warn('Using fallback textarea editor for SPARQL');
  }

  async _initializeGraphVisualizer() {
    const container = document.getElementById('graph-container');
    if (!container) {
      this.logger.warn('Graph container not found');
      return;
    }

    try {
      this.graphVisualizer = new GraphVisualizer(container, this.logger);
      await this.graphVisualizer.initialize();
      
      // Set up node selection handler for editor highlighting
      this.graphVisualizer.onNodeSelect((nodeId) => {
        if (this.turtleEditor && typeof this.turtleEditor.highlightNode === 'function') {
          this.turtleEditor.highlightNode(nodeId);
        }
        eventBus.emit('graph:node-selected', nodeId);
      });
      
      // Set initial graph content
      this.graphVisualizer.updateGraph(sampleContent);
      
      this.logger.info('Professional GraphVisualizer initialized with vis-network');
    } catch (error) {
      this.logger.error('Failed to initialize professional GraphVisualizer:', error);
      // Create fallback message
      container.innerHTML = `
        <div class="graph-fallback" style="padding: 40px; text-align: center; color: #6c757d;">
          <h4>Graph Visualization Unavailable</h4>
          <p>The professional graph visualizer could not be initialized.</p>
          <p>RDF content can still be edited in the Turtle and SPARQL tabs.</p>
        </div>
      `;
    }
  }

  async _initializeSparqlService() {
    try {
      // Try to import SparqlService directly from its file
      const module = await import('atuin/core/TurtleEditor');
      // For now, just use fallback since the core exports have issues
      this.logger.info('Using fallback SPARQL service implementation');
      // Fallback will be created in _updateEndpoints
    } catch (error) {
      this.logger.warn('Professional SparqlService not available, using fallback:', error.message);
      // Fallback will be created in _updateEndpoints
    }
  }

  async _initializeSplitPaneManager() {
    try {
      const container = document.querySelector('.split-pane-container');
      const leftPane = document.querySelector('.left-pane');
      const rightPane = document.querySelector('.right-pane');
      const divider = document.getElementById('split-divider');
      
      if (container && leftPane && rightPane && divider) {
        this.splitPaneManager = new SplitPaneManager({
          container,
          leftPane,
          rightPane,
          divider,
          minLeftWidth: 300,
          minRightWidth: 300
        });
        
        await this.splitPaneManager.initialize();
        this.logger.info('SplitPaneManager initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize SplitPaneManager:', error);
    }
  }

  async _initializeSettingsManager() {
    try {
      const settingsContent = document.getElementById('settings-content');
      
      if (settingsContent) {
        this.settingsManager = new SettingsManager({
          container: settingsContent,
          visualizer: this.graphVisualizer,
          turtleEditor: this.turtleEditor,
          sparqlEditor: this.sparqlEditor,
          logger: this.logger
        });
        
        await this.settingsManager.initialize();
        this.logger.info('SettingsManager initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize SettingsManager:', error);
    }
  }

  _setupEventBusIntegration() {
    // Listen for model synchronization events
    eventBus.on('model:synced', (content) => {
      if (this.graphVisualizer && typeof this.graphVisualizer.updateGraph === 'function') {
        this.graphVisualizer.updateGraph(content);
      }
    });

    // Listen for editor content changes
    eventBus.on('turtle:content-changed', (content) => {
      if (this.currentView === 'graph' && this.graphVisualizer) {
        this.graphVisualizer.updateGraph(content);
      }
    });

    // Listen for graph interactions
    eventBus.on('graph:node-selected', (nodeId) => {
      this.logger.debug('Graph node selected:', nodeId);
    });

    this.logger.debug('Event bus integration established');
  }

  _setupEventListeners() {
    // Tab switching
    const tabs = this.container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      const handler = () => {
        const view = tab.dataset.view;
        this.switchView(view);
      };
      tab.addEventListener('click', handler);
      this._eventHandlers.push({ element: tab, event: 'click', handler });
    });

    // SPARQL controls
    const executeBtn = document.getElementById('execute-sparql');
    if (executeBtn) {
      const handler = () => this._executeSparql();
      executeBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: executeBtn, event: 'click', handler });
    }

    const clearBtn = document.getElementById('clear-results');
    if (clearBtn) {
      const handler = () => this._clearResults();
      clearBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: clearBtn, event: 'click', handler });
    }

    const formatBtn = document.getElementById('format-sparql');
    if (formatBtn) {
      const handler = () => this._formatSparql();
      formatBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: formatBtn, event: 'click', handler });
    }

    // Graph controls
    const fitGraphBtn = document.getElementById('fit-graph');
    if (fitGraphBtn) {
      const handler = () => this._fitGraph();
      fitGraphBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: fitGraphBtn, event: 'click', handler });
    }

    const resetGraphBtn = document.getElementById('reset-graph');
    if (resetGraphBtn) {
      const handler = () => this._resetGraph();
      resetGraphBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: resetGraphBtn, event: 'click', handler });
    }

    const nodeSizeSlider = document.getElementById('node-size-slider');
    if (nodeSizeSlider) {
      const handler = (e) => this._setNodeSize(e.target.value);
      nodeSizeSlider.addEventListener('input', handler);
      this._eventHandlers.push({ element: nodeSizeSlider, event: 'input', handler });
    }

    // File handling controls
    if (this.options.enableFileHandling) {
      const loadBtn = document.getElementById('load-file');
      const saveBtn = document.getElementById('save-file');
      const fileInput = document.getElementById('file-input');

      if (loadBtn) {
        const handler = () => fileInput.click();
        loadBtn.addEventListener('click', handler);
        this._eventHandlers.push({ element: loadBtn, event: 'click', handler });
      }

      if (saveBtn) {
        const handler = () => this._saveCurrentFile();
        saveBtn.addEventListener('click', handler);
        this._eventHandlers.push({ element: saveBtn, event: 'click', handler });
      }

      if (fileInput) {
        const handler = (e) => this._loadFile(e);
        fileInput.addEventListener('change', handler);
        this._eventHandlers.push({ element: fileInput, event: 'change', handler });
      }
    }

    // Settings controls
    if (this.options.enableSettings) {
      const toggleSettingsBtn = document.getElementById('toggle-settings');
      const closeSettingsBtn = document.getElementById('close-settings');

      if (toggleSettingsBtn) {
        const handler = () => this._toggleSettings();
        toggleSettingsBtn.addEventListener('click', handler);
        this._eventHandlers.push({ element: toggleSettingsBtn, event: 'click', handler });
      }

      if (closeSettingsBtn) {
        const handler = () => this._closeSettings();
        closeSettingsBtn.addEventListener('click', handler);
        this._eventHandlers.push({ element: closeSettingsBtn, event: 'click', handler });
      }
    }
  }

  // New enhanced handler methods for v0.1.1 features

  _formatSparql() {
    if (this.sparqlEditor && typeof this.sparqlEditor.format === 'function') {
      this.sparqlEditor.format();
      this.logger.info('SPARQL query formatted');
    } else {
      this.logger.warn('SPARQL formatting not available');
    }
  }

  _fitGraph() {
    if (this.graphVisualizer && typeof this.graphVisualizer.resizeAndFit === 'function') {
      this.graphVisualizer.resizeAndFit();
      this.logger.debug('Graph fitted to view');
    }
  }

  _resetGraph() {
    if (this.graphVisualizer && typeof this.graphVisualizer.resetLayout === 'function') {
      this.graphVisualizer.resetLayout();
      this.logger.debug('Graph layout reset');
    }
  }

  _setNodeSize(size) {
    if (this.graphVisualizer && typeof this.graphVisualizer.setNodeSize === 'function') {
      this.graphVisualizer.setNodeSize(parseInt(size));
      this.logger.debug('Node size set to:', size);
    }
  }

  async _loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await this._readFileContent(file);
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (['ttl', 'turtle', 'n3', 'rdf'].includes(extension)) {
        if (this.turtleEditor) {
          this.turtleEditor.setValue(content);
          this.switchView('turtle');
          this.logger.info(`Loaded Turtle file: ${file.name}`);
        }
      } else if (extension === 'sparql') {
        if (this.sparqlEditor) {
          this.sparqlEditor.setValue(content);
          this.switchView('sparql');
          this.logger.info(`Loaded SPARQL file: ${file.name}`);
        }
      }
      
      // Clear the file input
      event.target.value = '';
    } catch (error) {
      this.logger.error('Failed to load file:', error.message);
    }
  }

  _readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  _saveCurrentFile() {
    try {
      let content = '';
      let filename = '';
      
      if (this.currentView === 'turtle' && this.turtleEditor) {
        content = this.turtleEditor.getValue();
        filename = 'turtle-content.ttl';
      } else if (this.currentView === 'sparql' && this.sparqlEditor) {
        content = this.sparqlEditor.getValue();
        filename = 'sparql-query.sparql';
      } else {
        this.logger.warn('No content to save in current view');
        return;
      }

      this._downloadFile(content, filename);
      this.logger.info(`Saved ${filename}`);
    } catch (error) {
      this.logger.error('Failed to save file:', error.message);
    }
  }

  _downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
      this.logger.debug('Settings panel toggled');
    }
  }

  _closeSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
      panel.style.display = 'none';
      this.logger.debug('Settings panel closed');
    }
  }

  switchView(view) {
    if (view === this.currentView) return;

    // Update tabs
    const tabs = this.container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.view === view) {
        tab.classList.add('active');
      }
    });

    if (this.options.enableSplitPane) {
      // In split pane mode, handle left pane switching
      const leftPanes = ['turtle-editor-pane', 'sparql-editor-pane'];
      leftPanes.forEach(paneId => {
        const pane = document.getElementById(paneId);
        if (pane) {
          pane.style.display = 'none';
        }
      });

      if (view === 'turtle') {
        const turtlePane = document.getElementById('turtle-editor-pane');
        if (turtlePane) turtlePane.style.display = 'flex';
      } else if (view === 'sparql') {
        const sparqlPane = document.getElementById('sparql-editor-pane');
        if (sparqlPane) sparqlPane.style.display = 'flex';
      }

      // Graph pane is always visible in split mode
      const graphPane = document.getElementById('graph-pane');
      if (graphPane && view === 'graph') {
        // In graph-only view, hide left pane
        const leftPane = document.querySelector('.left-pane');
        const rightPane = document.querySelector('.right-pane');
        if (leftPane && rightPane) {
          leftPane.style.display = view === 'graph' ? 'none' : 'flex';
          rightPane.style.flex = view === 'graph' ? '1' : '1';
        }
      } else if (graphPane) {
        // Show both panes normally
        const leftPane = document.querySelector('.left-pane');
        if (leftPane) leftPane.style.display = 'flex';
      }
    } else {
      // Non-split mode - hide all panes and show selected one
      const allPanes = ['turtle-editor-pane', 'sparql-editor-pane', 'graph-pane'];
      allPanes.forEach(paneId => {
        const pane = document.getElementById(paneId);
        if (pane) {
          pane.style.display = 'none';
        }
      });

      const targetPaneId = `${view === 'turtle' ? 'turtle-editor' : view === 'sparql' ? 'sparql-editor' : 'graph'}-pane`;
      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) {
        targetPane.style.display = 'flex';
      }
    }

    this.currentView = view;

    // Handle view-specific actions with enhanced features
    if (view === 'turtle' && this.turtleEditor) {
      setTimeout(() => {
        if (typeof this.turtleEditor.refresh === 'function') {
          this.turtleEditor.refresh();
        }
        // Focus the editor
        if (typeof this.turtleEditor.focus === 'function') {
          this.turtleEditor.focus();
        }
      }, 10);
    } else if (view === 'sparql' && this.sparqlEditor) {
      setTimeout(() => {
        if (typeof this.sparqlEditor.refresh === 'function') {
          this.sparqlEditor.refresh();
        }
        if (typeof this.sparqlEditor.focus === 'function') {
          this.sparqlEditor.focus();
        }
      }, 10);
    } else if (view === 'graph' && this.graphVisualizer) {
      // Update graph with current turtle content
      const currentContent = this._getCurrentTurtleContent();
      if (currentContent && typeof this.graphVisualizer.updateGraph === 'function') {
        this.graphVisualizer.updateGraph(currentContent);
      }
      // Resize and fit graph
      setTimeout(() => {
        if (typeof this.graphVisualizer.resizeAndFit === 'function') {
          this.graphVisualizer.resizeAndFit();
        }
      }, 100);
    }

    // Emit view change event
    eventBus.emit('atuin:view-changed', view);
    this.logger.debug(`Switched to ${view} view`);
  }

  _getCurrentTurtleContent() {
    if (this.turtleEditor && typeof this.turtleEditor.getValue === 'function') {
      return this.turtleEditor.getValue();
    } else {
      const textareaElement = document.getElementById('input-contents');
      return textareaElement ? textareaElement.value : '';
    }
  }

  async _executeSparql() {
    // Use professional SparqlService if available, otherwise fallback
    const service = this.sparqlService || this._getFallbackSparqlService();
    
    if (!service) {
      this._showSparqlResult('error', 'SPARQL service not available. Please configure an endpoint in settings.');
      return;
    }

    let query = '';
    if (this.sparqlEditor && typeof this.sparqlEditor.getValue === 'function') {
      query = this.sparqlEditor.getValue();
    }

    query = query.trim();
    if (!query) {
      this._showSparqlResult('error', 'Please enter a SPARQL query.');
      return;
    }

    this._showSparqlResult('loading', 'Executing query...');
    this.logger.info('Executing SPARQL query');

    try {
      const result = await service.executeQuery(query);
      this._showSparqlResult('success', result);
      this.logger.info('SPARQL query executed successfully');
      
      // Emit event for other components
      eventBus.emit('sparql:query-executed', { query, result });
    } catch (error) {
      this._showSparqlResult('error', `Query execution failed: ${error.message}`);
      this.logger.error('SPARQL query failed:', error);
    }
  }

  _getFallbackSparqlService() {
    // Return the existing fallback service from _updateEndpoints
    return this._fallbackSparqlService;
  }

  _clearResults() {
    const resultsContainer = document.getElementById('sparql-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="no-results">Results cleared.</div>';
    }
  }

  _showSparqlResult(type, content) {
    const resultsContainer = document.getElementById('sparql-results');
    if (!resultsContainer) return;

    if (type === 'loading') {
      resultsContainer.innerHTML = `<div class="loading">🔄 ${content}</div>`;
    } else if (type === 'error') {
      resultsContainer.innerHTML = `<div class="error"><strong>Error:</strong> ${content}</div>`;
    } else if (type === 'success') {
      if (typeof content === 'object' && content !== null) {
        const formatted = JSON.stringify(content, null, 2);
        resultsContainer.innerHTML = `<div class="success">Query executed successfully!</div><pre>${formatted}</pre>`;
      } else {
        resultsContainer.innerHTML = `<div class="success">${content || 'Query executed successfully.'}</div>`;
      }
    }
  }

  _updateEndpoints() {
    try {
      if (!store || typeof store.getState !== 'function') {
        this.logger.warn('Store not available for endpoints update');
        return;
      }

      const state = store.getState();
      if (!state) {
        this.logger.warn('State not available for endpoints update');
        return;
      }

      const endpoints = getEndpoints(state) || [];
      const queryEndpoints = endpoints.filter(e => 
        e && e.type === this.options.endpointType && e.enabled !== false
      );

      if (queryEndpoints.length === 0) {
        this.logger.warn('No enabled SPARQL endpoints found');
        // Keep fallback service available
        this._createFallbackSparqlService();
        return;
      }

      const activeEndpoint = queryEndpoints[0];
      this.logger.info('Using SPARQL endpoint:', activeEndpoint.url);

      // Update professional SparqlService if available
      if (this.sparqlService && typeof this.sparqlService.setEndpoint === 'function') {
        this.sparqlService.setEndpoint(activeEndpoint);
      } else {
        // Create fallback service
        this._createFallbackSparqlService(activeEndpoint);
      }
    } catch (error) {
      this.logger.error('Error updating endpoints:', error);
      this._createFallbackSparqlService();
    }
  }

  _createFallbackSparqlService(endpoint = null) {
    this._fallbackSparqlService = {
      executeQuery: async (query) => {
        if (!query) {
          throw new Error('Query cannot be empty');
        }

        if (!endpoint) {
          throw new Error('No SPARQL endpoint configured');
        }

        try {
          return await querySparql(
            endpoint.url,
            query,
            'select',
            endpoint.credentials
          );
        } catch (error) {
          this.logger.error('SPARQL query failed:', error);
          throw error;
        }
      }
    };
  }

  _handleStoreUpdate() {
    try {
      if (this.isInitialized) {
        this._updateEndpoints();
      }
    } catch (error) {
      console.error('Error in store update handler:', error);
    }
  }

  /**
   * Mount a specific component based on tab ID
   * @param {string} tabId - The tab ID to mount
   * @param {HTMLElement} container - Container to mount to
   */
  async _mountSpecificComponent(tabId, container) {
    console.log(`[AtuinPlugin] _mountSpecificComponent: ${tabId}, activeComponent: ${this._activeTabComponent}, container content length: ${container.innerHTML.length}`);
    
    // Check if this container already has content for this tab type
    const hasTabContent = this._hasContentForTab(tabId, container);
    console.log(`[AtuinPlugin] Container has content for ${tabId}: ${hasTabContent}`);
    
    // Only clear container if switching to a different component AND container is empty or wrong content
    if (this._activeTabComponent !== tabId && !hasTabContent) {
      console.log(`[AtuinPlugin] Switching from ${this._activeTabComponent} to ${tabId}, clearing container`);
      console.log(`[AtuinPlugin] CLEARING CONTAINER - Stack trace:`, new Error().stack);
      container.innerHTML = '';
    } else if (hasTabContent) {
      console.log(`[AtuinPlugin] Container already has ${tabId} content, preserving it`);
      this._activeTabComponent = tabId;
      
      // For graph components, we need to defer refresh until after the view is visible
      if (tabId === 'graph') {
        console.log(`[AtuinPlugin] Deferring graph refresh until view is visible`);
        // Use a longer timeout to ensure the router has finished showing the view
        setTimeout(async () => {
          console.log(`[AtuinPlugin] Executing deferred graph refresh`);
          await this._refreshExistingComponent(tabId, container);
        }, 200);
      } else {
        // For other components, refresh immediately
        await this._refreshExistingComponent(tabId, container);
      }
      return; // Don't remount if content already exists
    } else {
      console.log(`[AtuinPlugin] Same component ${tabId}, keeping existing content`);
    }
    
    switch (tabId) {
      case 'turtle':
        await this._mountTurtleEditor(container);
        break;
      case 'sparql':
        await this._mountSparqlEditor(container);
        break;
      case 'graph':
        await this._mountGraphVisualizer(container);
        break;
      default:
        throw new Error(`Unknown tab ID: ${tabId}`);
    }
    
    this._activeTabComponent = tabId;
    console.log(`[AtuinPlugin] _mountSpecificComponent complete: ${tabId}, container content length now: ${container.innerHTML.length}`);
  }

  /**
   * Check if container already has content for the specified tab type
   * @param {string} tabId - The tab ID to check
   * @param {HTMLElement} container - Container to check
   * @returns {boolean} True if container has appropriate content
   */
  _hasContentForTab(tabId, container) {
    if (!container || container.innerHTML.length === 0) {
      return false;
    }
    
    // Check for specific component containers
    switch (tabId) {
      case 'turtle':
        return container.querySelector('.turtle-editor-container') !== null;
      case 'sparql':
        return container.querySelector('.sparql-editor-container') !== null;
      case 'graph':
        return container.querySelector('.graph-visualizer-container') !== null;
      default:
        return false;
    }
  }

  /**
   * Refresh an existing component when switching back to it
   * @param {string} tabId - The tab ID to refresh
   * @param {HTMLElement} container - Container with existing content
   */
  async _refreshExistingComponent(tabId, container) {
    console.log(`[AtuinPlugin] Refreshing existing ${tabId} component`);
    
    try {
      switch (tabId) {
        case 'turtle':
          if (this.turtleEditor && typeof this.turtleEditor.refresh === 'function') {
            this.turtleEditor.refresh();
          }
          setTimeout(() => {
            if (typeof this.turtleEditor.focus === 'function') {
              this.turtleEditor.focus();
            }
          }, 100);
          break;
          
        case 'sparql':
          if (this.sparqlEditor && typeof this.sparqlEditor.refresh === 'function') {
            this.sparqlEditor.refresh();
          }
          setTimeout(() => {
            if (typeof this.sparqlEditor.focus === 'function') {
              this.sparqlEditor.focus();
            }
          }, 100);
          break;
          
        case 'graph':
          console.log(`[AtuinPlugin] Graph visualizer instance exists:`, !!this.graphVisualizer);
          const graphContainer = container.querySelector('.graph-container');
          console.log(`[AtuinPlugin] Graph container found:`, !!graphContainer);
          
          if (this.graphVisualizer && graphContainer) {
            // Graph visualizers often get corrupted when hidden/shown
            // Let's destroy and recreate the visualization
            console.log(`[AtuinPlugin] Destroying existing graph visualizer to recreate`);
            
            try {
              if (typeof this.graphVisualizer.destroy === 'function') {
                this.graphVisualizer.destroy();
              }
            } catch (error) {
              console.log(`[AtuinPlugin] Error destroying graph visualizer:`, error);
            }
            
            // Clear the graph container content
            graphContainer.innerHTML = '';
            
            // Recreate the graph visualizer
            console.log(`[AtuinPlugin] Recreating graph visualizer`);
            try {
              const { GraphVisualizer } = await import('atuin/core/GraphVisualizer');
              this.graphVisualizer = new GraphVisualizer(graphContainer, this.logger);
              await this.graphVisualizer.initialize();
              
              this.graphVisualizer.onNodeSelect((nodeId) => {
                eventBus.emit('graph:node-selected', nodeId);
              });
              
              // Update with current turtle content - try multiple sources
              console.log(`[AtuinPlugin] Checking turtle editor for content:`, !!this.turtleEditor);
              
              let currentContent = null;
              
              // Try to get content from turtle editor first
              if (this.turtleEditor && typeof this.turtleEditor.getValue === 'function') {
                try {
                  currentContent = this.turtleEditor.getValue();
                  console.log(`[AtuinPlugin] Got content from turtle editor, length:`, currentContent ? currentContent.length : 0);
                } catch (error) {
                  console.log(`[AtuinPlugin] Error getting content from turtle editor:`, error);
                }
              }
              
              // Fallback to sample content if no turtle editor content
              if (!currentContent || currentContent.length === 0) {
                console.log(`[AtuinPlugin] Using sample turtle content as fallback`);
                currentContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ex: <http://example.org/> .

ex:Person a rdfs:Class ;
  rdfs:label "Person" .

ex:john a ex:Person ;
  ex:name "John Doe" ;
  ex:age "30" ;
  ex:knows ex:jane .

ex:jane a ex:Person ;
  ex:name "Jane Smith" ;
  ex:age "28" ;
  ex:knows ex:john .`;
              }
              
              // Update graph with content
              if (currentContent && typeof this.graphVisualizer.updateGraph === 'function') {
                console.log(`[AtuinPlugin] Updating recreated graph with turtle content, length:`, currentContent.length);
                try {
                  this.graphVisualizer.updateGraph(currentContent);
                  console.log(`[AtuinPlugin] Graph updated successfully`);
                } catch (error) {
                  console.error(`[AtuinPlugin] Error updating graph:`, error);
                }
              } else {
                console.log(`[AtuinPlugin] Cannot update graph - no content or updateGraph unavailable`);
                console.log(`[AtuinPlugin] Content available:`, !!currentContent);
                console.log(`[AtuinPlugin] updateGraph function:`, typeof this.graphVisualizer.updateGraph);
              }
              
              // Single delayed resize after DOM settles
              setTimeout(() => {
                console.log(`[AtuinPlugin] Calling resizeAndFit after DOM settlement`);
                if (this.graphVisualizer && typeof this.graphVisualizer.resizeAndFit === 'function') {
                  try {
                    this.graphVisualizer.resizeAndFit();
                    console.log(`[AtuinPlugin] Graph resized successfully`);
                  } catch (error) {
                    console.error(`[AtuinPlugin] Error during resize:`, error);
                  }
                } else {
                  console.error(`[AtuinPlugin] Graph visualizer or resizeAndFit method not available`);
                }
              }, 300);
              
              console.log(`[AtuinPlugin] Graph visualizer recreated successfully`);
            } catch (error) {
              console.error(`[AtuinPlugin] Failed to recreate graph visualizer:`, error);
              // Fallback error display
              graphContainer.innerHTML = `
                <div class="graph-fallback" style="padding: 40px; text-align: center; color: #6c757d;">
                  <h4>Graph Visualization Error</h4>
                  <p>Failed to recreate the graph visualizer.</p>
                  <p>${error.message}</p>
                </div>
              `;
            }
          } else {
            console.log(`[AtuinPlugin] ERROR: Graph visualizer instance or container missing!`);
          }
          break;
      }
      console.log(`[AtuinPlugin] _refreshExistingComponent completed for ${tabId}`);
    } catch (error) {
      console.error(`[AtuinPlugin] Error in _refreshExistingComponent for ${tabId}:`, error);
    }
  }

  /**
   * Mount just the Turtle Editor component
   */
  async _mountTurtleEditor(container) {
    console.log(`[AtuinPlugin] _mountTurtleEditor called, container content length: ${container.innerHTML.length}`);
    // Check if already mounted in this container
    let editorContainer = container.querySelector('.turtle-editor-container');
    
    if (!editorContainer) {
      editorContainer = document.createElement('div');
      editorContainer.className = 'turtle-editor-container';
      editorContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      `;
      container.appendChild(editorContainer);
    }
    
    try {
      if (!this.turtleEditor) {
        this.turtleEditor = new TurtleEditor(editorContainer, this.logger);
        await this.turtleEditor.initialize();
        this.turtleEditor.setValue(sampleContent);
        
        // Set up change handler for real-time updates
        this.turtleEditor.onChange((content) => {
          eventBus.emit('turtle:content-changed', content);
        });
      } else {
        // Re-mount existing editor or refresh
        if (typeof this.turtleEditor.mount === 'function') {
          await this.turtleEditor.mount(editorContainer);
        } else if (typeof this.turtleEditor.refresh === 'function') {
          this.turtleEditor.refresh();
        }
      }
      
      // Focus the editor
      setTimeout(() => {
        if (typeof this.turtleEditor.focus === 'function') {
          this.turtleEditor.focus();
        }
      }, 100);
      
    } catch (error) {
      this.logger.error('Failed to mount Turtle editor:', error);
      this._createFallbackTurtleEditor(editorContainer);
    }
  }

  /**
   * Mount just the SPARQL Editor component
   */
  async _mountSparqlEditor(container) {
    console.log(`[AtuinPlugin] _mountSparqlEditor called, container content length: ${container.innerHTML.length}`);
    // Check if already mounted in this container
    let sparqlContainer = container.querySelector('.sparql-editor-container');
    
    if (!sparqlContainer) {
      sparqlContainer = document.createElement('div');
      sparqlContainer.className = 'sparql-editor-container';
      sparqlContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      `;
      
      // Add editor container
      const editorDiv = document.createElement('div');
      editorDiv.className = 'editor-container';
      editorDiv.style.flex = '1';
      sparqlContainer.appendChild(editorDiv);
      
      // Add controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'sparql-controls';
      controlsDiv.style.padding = '12px';
      controlsDiv.style.borderTop = '1px solid #e1e5e9';
      controlsDiv.style.background = '#f8f9fa';
      controlsDiv.style.display = 'flex';
      controlsDiv.style.gap = '8px';
      controlsDiv.innerHTML = `
        <button id="execute-sparql" class="btn btn-primary">Execute Query</button>
        <button id="clear-results" class="btn btn-secondary">Clear Results</button>
        <button id="format-sparql" class="btn btn-outline">Format Query</button>
      `;
      sparqlContainer.appendChild(controlsDiv);
      
      // Add results container
      const resultsDiv = document.createElement('div');
      resultsDiv.id = 'sparql-results';
      resultsDiv.className = 'results-container';
      resultsDiv.style.maxHeight = '300px';
      resultsDiv.style.overflowY = 'auto';
      resultsDiv.style.borderTop = '1px solid #e1e5e9';
      resultsDiv.style.background = '#fff';
      resultsDiv.style.padding = '16px';
      resultsDiv.innerHTML = '<div class="no-results">No query executed yet.</div>';
      sparqlContainer.appendChild(resultsDiv);
      
      container.appendChild(sparqlContainer);
    }
    
    const editorDiv = sparqlContainer.querySelector('.editor-container');
    const controlsDiv = sparqlContainer.querySelector('.sparql-controls');
    
    try {
      if (!this.sparqlEditor) {
        this.sparqlEditor = new SPARQLEditor(editorDiv, this.logger);
        await this.sparqlEditor.initialize();
        this.sparqlEditor.setValue(sampleSparql);
        
        this.sparqlEditor.onChange((query) => {
          eventBus.emit('sparql:query-changed', query);
        });
      } else {
        // Re-mount existing editor or refresh
        if (typeof this.sparqlEditor.mount === 'function') {
          await this.sparqlEditor.mount(editorDiv);
        } else if (typeof this.sparqlEditor.refresh === 'function') {
          this.sparqlEditor.refresh();
        }
      }
      
      // Set up event handlers for controls (only if not already set up)
      if (!controlsDiv.hasAttribute('data-handlers-setup')) {
        this._setupSparqlControls(controlsDiv);
        controlsDiv.setAttribute('data-handlers-setup', 'true');
      }
      
    } catch (error) {
      this.logger.error('Failed to mount SPARQL editor:', error);
      this._createFallbackSparqlEditor(editorDiv);
    }
  }

  /**
   * Mount just the Graph Visualizer component  
   */
  async _mountGraphVisualizer(container) {
    console.log(`[AtuinPlugin] _mountGraphVisualizer called, container content length: ${container.innerHTML.length}`);
    // Check if already mounted in this container
    let graphContainer = container.querySelector('.graph-visualizer-container');
    
    if (!graphContainer) {
      graphContainer = document.createElement('div');
      graphContainer.className = 'graph-visualizer-container';
      graphContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      `;
      
      // Add graph container
      const vizDiv = document.createElement('div');
      vizDiv.className = 'graph-container';
      vizDiv.style.flex = '1';
      vizDiv.style.background = '#fff';
      graphContainer.appendChild(vizDiv);
      
      // Add controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'graph-controls';
      controlsDiv.style.padding = '12px';
      controlsDiv.style.borderTop = '1px solid #e1e5e9';
      controlsDiv.style.background = '#f8f9fa';
      controlsDiv.style.display = 'flex';
      controlsDiv.style.gap = '12px';
      controlsDiv.style.alignItems = 'center';
      controlsDiv.innerHTML = `
        <button id="fit-graph" class="btn btn-outline">Fit to View</button>
        <button id="reset-graph" class="btn btn-outline">Reset Layout</button>
        <label class="control-label">
          Node Size: <input type="range" id="node-size-slider" min="10" max="50" value="25">
        </label>
      `;
      graphContainer.appendChild(controlsDiv);
      
      container.appendChild(graphContainer);
    }
    
    const vizDiv = graphContainer.querySelector('.graph-container');
    const controlsDiv = graphContainer.querySelector('.graph-controls');
    
    try {
      if (!this.graphVisualizer) {
        this.graphVisualizer = new GraphVisualizer(vizDiv, this.logger);
        await this.graphVisualizer.initialize();
        
        this.graphVisualizer.onNodeSelect((nodeId) => {
          eventBus.emit('graph:node-selected', nodeId);
        });
        
        // Set initial graph content
        this.graphVisualizer.updateGraph(sampleContent);
      } else {
        // Re-mount existing visualizer or refresh
        if (typeof this.graphVisualizer.mount === 'function') {
          await this.graphVisualizer.mount(vizDiv);
        } else if (typeof this.graphVisualizer.refresh === 'function') {
          this.graphVisualizer.refresh();
        }
        
        // Update with current content
        if (this.turtleEditor) {
          this.graphVisualizer.updateGraph(this.turtleEditor.getValue());
        }
      }
      
      // Set up graph controls (only if not already set up)
      if (!controlsDiv.hasAttribute('data-handlers-setup')) {
        this._setupGraphControls(controlsDiv);
        controlsDiv.setAttribute('data-handlers-setup', 'true');
      }
      
      // Resize and fit
      setTimeout(() => {
        if (typeof this.graphVisualizer.resizeAndFit === 'function') {
          this.graphVisualizer.resizeAndFit();
        }
      }, 100);
      
    } catch (error) {
      this.logger.error('Failed to mount Graph visualizer:', error);
      vizDiv.innerHTML = `
        <div class="graph-fallback" style="padding: 40px; text-align: center; color: #6c757d;">
          <h4>Graph Visualization Unavailable</h4>
          <p>The professional graph visualizer could not be initialized.</p>
          <p>RDF content can still be edited in the Turtle and SPARQL tabs.</p>
        </div>
      `;
    }
  }

  /**
   * Unmount the currently active component
   */
  async _unmountActiveComponent() {
    if (this._activeTabComponent && this.container) {
      // Clean up component-specific event handlers
      this._cleanupEventHandlers();
      
      // Clear container
      this.container.innerHTML = '';
      
      this._activeTabComponent = null;
      this._activeTabId = null;
    }
  }

  /**
   * Set up event handlers for SPARQL controls
   */
  _setupSparqlControls(controlsDiv) {
    const executeBtn = controlsDiv.querySelector('#execute-sparql');
    const clearBtn = controlsDiv.querySelector('#clear-results');
    const formatBtn = controlsDiv.querySelector('#format-sparql');
    
    if (executeBtn) {
      const handler = () => this._executeSparql();
      executeBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: executeBtn, event: 'click', handler });
    }
    
    if (clearBtn) {
      const handler = () => this._clearResults();
      clearBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: clearBtn, event: 'click', handler });
    }
    
    if (formatBtn) {
      const handler = () => this._formatSparql();
      formatBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: formatBtn, event: 'click', handler });
    }
  }

  /**
   * Set up event handlers for graph controls
   */
  _setupGraphControls(controlsDiv) {
    const fitBtn = controlsDiv.querySelector('#fit-graph');
    const resetBtn = controlsDiv.querySelector('#reset-graph');
    const sizeSlider = controlsDiv.querySelector('#node-size-slider');
    
    if (fitBtn) {
      const handler = () => this._fitGraph();
      fitBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: fitBtn, event: 'click', handler });
    }
    
    if (resetBtn) {
      const handler = () => this._resetGraph();
      resetBtn.addEventListener('click', handler);
      this._eventHandlers.push({ element: resetBtn, event: 'click', handler });
    }
    
    if (sizeSlider) {
      const handler = (e) => this._setNodeSize(e.target.value);
      sizeSlider.addEventListener('input', handler);
      this._eventHandlers.push({ element: sizeSlider, event: 'input', handler });
    }
  }

  /**
   * Clean up event handlers
   */
  _cleanupEventHandlers() {
    this._eventHandlers.forEach(({ element, event, handler }) => {
      if (element && handler) {
        element.removeEventListener(event, handler);
      }
    });
    this._eventHandlers = [];
  }

  async unmount() {
    try {
      await this._unmountActiveComponent();
      
      // Reset state
      this.container = null;
      console.log('Atuin plugin unmounted');
      return true;
    } catch (error) {
      console.error('Error unmounting Atuin plugin:', error);
      throw error;
    }
  }

  async destroy() {
    try {
      this.logger.info('Destroying Atuin plugin v0.1.1...');

      // Clean up event bus listeners
      eventBus.off('model:synced');
      eventBus.off('turtle:content-changed');
      eventBus.off('graph:node-selected');

      // Unsubscribe from store
      if (this._unsubscribe) {
        this._unsubscribe();
        this._unsubscribe = null;
      }

      // Destroy all atuin v0.1.1 components
      if (this.settingsManager && typeof this.settingsManager.destroy === 'function') {
        this.settingsManager.destroy();
      }
      
      if (this.splitPaneManager && typeof this.splitPaneManager.destroy === 'function') {
        this.splitPaneManager.destroy();
      }

      if (this.turtleEditor && typeof this.turtleEditor.destroy === 'function') {
        this.turtleEditor.destroy();
      }
      
      if (this.sparqlEditor && typeof this.sparqlEditor.destroy === 'function') {
        this.sparqlEditor.destroy();
      }
      
      if (this.graphVisualizer && typeof this.graphVisualizer.destroy === 'function') {
        this.graphVisualizer.destroy();
      }

      if (this.sparqlService && typeof this.sparqlService.destroy === 'function') {
        this.sparqlService.destroy();
      }

      // Clean up logger container
      const loggerContainer = document.getElementById('atuin-logger-container');
      if (loggerContainer) {
        document.body.removeChild(loggerContainer);
      }

      // Reset all references
      this.logger = null;
      this.turtleEditor = null;
      this.sparqlEditor = null;
      this.graphVisualizer = null;
      this.sparqlService = null;
      this.settingsManager = null;
      this.splitPaneManager = null;
      this._fallbackSparqlService = null;
      this._isComponentsInitialized = false;

      await super.destroy();
      console.log('Atuin plugin v0.1.1 destroyed successfully');
    } catch (error) {
      console.error('Error destroying Atuin plugin:', error);
      throw error;
    }
  }
}