// Draw Plugin for Squirt - Uses Excalidraw for collaborative drawing
import { PluginBase } from '../core/plugin-base.js'

/**
 * Plugin that provides drawing functionality using Excalidraw
 */
export class DrawPlugin extends PluginBase {
  constructor(id = 'draw-plugin', options = {}) {
    super(id, {
      // Configure plugin to provide a main tab
      providesMainTabs: [
        { id: 'draw', label: 'Draw', component: 'Excalidraw' }
      ],
      ...options
    })

    this.excalidrawAPI = null
    this.excalidrawData = null
    this.reactRoot = null
  }

  /**
   * Initialize the Draw plugin
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('Draw plugin already initialized')
      return
    }

    try {
      console.log('Initializing Draw plugin with Excalidraw...')
      await super.initialize()
      console.log('Draw plugin initialized successfully')
    } catch (error) {
      console.error('Error initializing Draw plugin:', error)
      throw error
    }
  }

  /**
   * Mount a specific tab component
   * @param {string} tabId - The tab ID ('draw')
   * @param {HTMLElement} container - Container to mount to
   */
  async mountTabComponent(tabId, container) {
    console.log(`[DrawPlugin] mountTabComponent called: ${tabId}`, container)
    
    if (!container) {
      throw new Error('Container element is required')
    }

    if (tabId !== 'draw') {
      throw new Error(`Unknown tab ID: ${tabId}`)
    }

    this.container = container
    
    try {
      await this._mountDrawComponent(container)
      console.log(`[DrawPlugin] Draw tab mounted successfully`)
      return true
    } catch (error) {
      console.error(`[DrawPlugin] Error mounting draw tab:`, error)
      throw error
    }
  }

  /**
   * Mount the Excalidraw drawing component
   */
  async _mountDrawComponent(container) {
    console.log(`[DrawPlugin] _mountDrawComponent called, container content length: ${container.innerHTML.length}`)
    
    // Check if already mounted in this container
    let drawContainer = container.querySelector('.draw-container')
    
    if (!drawContainer) {
      drawContainer = document.createElement('div')
      drawContainer.className = 'draw-container'
      drawContainer.style.cssText = `
        width: 100%;
        height: calc(100vh - 60px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
      `
      container.appendChild(drawContainer)
    }

    // Create Excalidraw container (full height for Excalidraw's built-in UI)
    const excalidrawContainer = document.createElement('div')
    excalidrawContainer.className = 'excalidraw-container'
    excalidrawContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
    `

    // Clear and setup container
    drawContainer.innerHTML = ''
    drawContainer.appendChild(excalidrawContainer)

    // Load full Excalidraw component
    console.log(`[DrawPlugin] Creating Excalidraw drawing canvas`)
    await this._createExcalidrawComponent(excalidrawContainer)
  }

  /**
   * Create the full Excalidraw component using React
   */
  async _createExcalidrawComponent(container) {
    console.log(`[DrawPlugin] Creating full Excalidraw component`)
    
    // Dynamic import of React and Excalidraw with CSS
    const React = await import('react')
    const ReactDOM = await import('react-dom/client')
    const { Excalidraw } = await import('@excalidraw/excalidraw')
    
    // Import Excalidraw CSS
    await import('@excalidraw/excalidraw/index.css')
    
    // Create React component
    const ExcalidrawApp = React.createElement(Excalidraw, {
      initialData: {
        elements: [],
        appState: {
          viewBackgroundColor: "#ffffff",
          currentItemStrokeColor: "#000000",
          currentItemBackgroundColor: "transparent",
          currentItemFillStyle: "hachure",
          currentItemStrokeWidth: 1,
          currentItemStrokeStyle: "solid",
          currentItemRoughness: 1,
          currentItemOpacity: 100,
          currentItemFontSize: 20,
          currentItemFontFamily: 1,
          currentItemTextAlign: "left",
          currentItemStartArrowhead: null,
          currentItemEndArrowhead: "arrow",
          scrollX: 0,
          scrollY: 0,
          zoom: {
            value: 1
          },
          gridSize: null,
          theme: "light"
        }
      },
      onChange: (elements, appState, files) => {
        console.log(`[DrawPlugin] Excalidraw content changed: ${elements.length} elements`)
        // Store the current state for potential export/save functionality
        this.excalidrawData = { elements, appState, files }
      },
      onPointerUpdate: (payload) => {
        // Optional: Handle pointer updates for collaborative features
      },
      UIOptions: {
        canvasActions: {
          changeViewBackgroundColor: true,
          clearCanvas: true,
          export: {
            saveFileToDisk: true
          },
          loadScene: true,
          saveAsImage: true,
          theme: true,
          saveToActiveFile: false
        },
        tools: {
          image: true
        }
      }
    })
    
    // Create React root and render
    if (this.reactRoot) {
      this.reactRoot.unmount()
    }
    
    this.reactRoot = ReactDOM.createRoot(container)
    this.reactRoot.render(ExcalidrawApp)
    
    console.log(`[DrawPlugin] Excalidraw component mounted successfully`)
  }


  /**
   * Legacy mount method for backwards compatibility
   */
  async mount(container) {
    if (!container) {
      throw new Error('Container element is required')
    }

    this.container = container

    try {
      // Mount with default draw component
      await this.mountTabComponent('draw', container)
      console.log('Draw plugin mounted successfully (legacy mode)')
      return true
    } catch (error) {
      console.error('Error mounting Draw plugin:', error)
      throw error
    }
  }

  /**
   * Unmount the Draw plugin
   */
  async unmount() {
    try {
      // Clean up React root
      if (this.reactRoot) {
        this.reactRoot.unmount()
        this.reactRoot = null
      }

      // Clean up API references
      this.excalidrawAPI = null
      this.excalidrawData = null
      
      console.log('Draw plugin unmounted')
      return true
    } catch (error) {
      console.error('Error unmounting Draw plugin:', error)
      throw error
    }
  }

  /**
   * Destroy the Draw plugin
   */
  async destroy() {
    try {
      console.log('Destroying Draw plugin...')
      
      await this.unmount()
      await super.destroy()
      
      console.log('Draw plugin destroyed successfully')
    } catch (error) {
      console.error('Error destroying Draw plugin:', error)
      throw error
    }
  }
}