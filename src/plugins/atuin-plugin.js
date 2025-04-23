// AtuinPlugin for Squirt - integrates Atuin RDF editor as a plugin
import { PluginBase } from '../core/plugin-base.js'
// Import Atuin modules (adjust paths as needed)
import { TurtleEditor } from '../../../atuin/src/js/core/TurtleEditor.js'
import { GraphVisualizer } from '../../../atuin/src/js/core/GraphVisualizer.js'
import { LoggerService } from '../../../atuin/src/js/services/LoggerService.js'
import { UIManager } from '../../../atuin/src/js/ui/UIManager.js'
import { SplitPaneManager } from '../../../atuin/src/js/ui/SplitPaneManager.js'
import '../../../atuin/src/css/main.css'
import '../../../atuin/src/css/editor.css'
import '../../../atuin/src/css/graph.css'

export class AtuinPlugin extends PluginBase {
    constructor(id = 'atuin-plugin', options = {}) {
        super(id, options)
        this.editor = null
        this.visualizer = null
        this.logger = null
        this.uiManager = null
        this.splitPane = null
    }

    async initialize() {
        if (this.isInitialized) return
        // Any async setup can go here
        this.isInitialized = true
    }

    async mount(container) {
        console.log('[AtuinPlugin] mount called', container)
        await super.mount(container)
        // Remove debug message if present
        container.innerHTML = ''
        // Clear container and set up Atuin UI structure
        container.innerHTML = `
      <div class="atuin-main-container">
        <div id="atuin-message-queue"></div>
        <div class="split-container">
          <div id="atuin-editor-container" class="split-pane">
            <textarea id="atuin-input-contents" placeholder="Enter Turtle RDF content here"></textarea>
          </div>
          <div id="atuin-divider" class="split-divider"></div>
          <div id="atuin-graph-container" class="split-pane"></div>
        </div>
      </div>
    `
        console.log('[AtuinPlugin] DOM updated, looking for editor and graph containers')
        // Initialize logger
        this.logger = new LoggerService('atuin-message-queue')
        // Correctly select the textarea and graph container
        const textarea = container.querySelector('#atuin-input-contents')
        const graphContainer = container.querySelector('#atuin-graph-container')
        console.log('[AtuinPlugin] textarea:', textarea, 'graphContainer:', graphContainer)
        // Initialize editor and visualizer
        try {
            this.editor = new TurtleEditor(textarea, this.logger)
            this.editor.initialize()
            console.log('[AtuinPlugin] TurtleEditor initialized')
        } catch (e) {
            console.error('[AtuinPlugin] Error initializing TurtleEditor', e)
        }
        try {
            this.visualizer = new GraphVisualizer(graphContainer, this.logger)
            this.visualizer.initialize()
            console.log('[AtuinPlugin] GraphVisualizer initialized')
        } catch (e) {
            console.error('[AtuinPlugin] Error initializing GraphVisualizer', e)
        }
        // Connect editor and visualizer
        if (this.editor && this.visualizer) {
            this.editor.onChange(content => this.visualizer.updateGraph(content))
            this.visualizer.onNodeSelect(nodeId => this.editor.highlightNode(nodeId))
        }
        // Only initialize UIManager if main controls exist (plugin mode skips extra controls)
        const splitButton = container.querySelector('#split-button')
        if (splitButton) {
            this.uiManager = new UIManager({
                editor: this.editor,
                visualizer: this.visualizer,
                logger: this.logger
            })
        }
        // Split pane
        try {
            this.splitPane = new SplitPaneManager({
                container: container.querySelector('.split-container'),
                leftPane: container.querySelector('#atuin-editor-container'),
                rightPane: graphContainer,
                divider: container.querySelector('#atuin-divider')
            })
            console.log('[AtuinPlugin] SplitPaneManager initialized')
        } catch (e) {
            console.error('[AtuinPlugin] Error initializing SplitPaneManager', e)
        }
        // Set sample content and update graph
        if (this.editor && this.visualizer) {
            this.editor.setValue(this.options.sampleContent || '')
            this.visualizer.updateGraph(this.options.sampleContent || '')
            console.log('[AtuinPlugin] Sample content set and graph updated')
        }
        // Inject debug CSS to ensure visibility
        const style = document.createElement('style')
        style.textContent = `
          .atuin-main-container, .split-container, #atuin-editor-container, #atuin-graph-container {
            min-height: 400px !important;
            height: 100% !important;
            display: block !important;
            position: relative;
          }
          #atuin-editor-container, #atuin-graph-container {
            min-width: 200px;
            min-height: 200px;
            background: #fff;
            border: 1px solid #eee;
          }
        `
        document.head.appendChild(style)
    }

    async unmount() {
        // Clean up Atuin UI
        if (this.container) this.container.innerHTML = ''
        this.editor = null
        this.visualizer = null
        this.logger = null
        this.uiManager = null
        this.splitPane = null
        await super.unmount()
    }
} 