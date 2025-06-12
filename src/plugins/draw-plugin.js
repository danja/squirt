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
    this.drawContainer = null
    this.fallbackCanvas = null
    this.fallbackContext = null
    this.reactRoot = null
    this._eventHandlers = []
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
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        position: relative;
      `
      container.appendChild(drawContainer)
    }

    // Create header with title and controls
    const header = document.createElement('div')
    header.className = 'draw-header'
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #e1e5e9;
      background: #f8f9fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #495057;">Drawing Canvas</h3>
      <div class="draw-controls" style="display: flex; gap: 8px; align-items: center;">
        <button id="clear-canvas" class="btn btn-outline" style="padding: 6px 12px; border: 1px solid #6c757d; border-radius: 4px; cursor: pointer; font-size: 13px; background: transparent; color: #6c757d;">Clear Canvas</button>
        <button id="export-png" class="btn btn-outline" style="padding: 6px 12px; border: 1px solid #0d6efd; border-radius: 4px; cursor: pointer; font-size: 13px; background: transparent; color: #0d6efd;">Export PNG</button>
      </div>
    `
    
    // Create Excalidraw container
    const excalidrawContainer = document.createElement('div')
    excalidrawContainer.className = 'excalidraw-container'
    excalidrawContainer.style.cssText = `
      flex: 1;
      width: 100%;
      height: calc(100% - 50px);
      position: relative;
    `

    // Clear and setup container
    drawContainer.innerHTML = ''
    drawContainer.appendChild(header)
    drawContainer.appendChild(excalidrawContainer)

    try {
      console.log(`[DrawPlugin] Creating drawing canvas`)
      
      // Use fallback canvas for now due to Excalidraw build issues
      console.log(`[DrawPlugin] Using fallback canvas (Excalidraw temporarily disabled due to build issues)`)
      this._createFallbackCanvas(excalidrawContainer)

      // Set up event handlers for controls
      this._setupDrawControls(header)
      
    } catch (error) {
      console.error(`[DrawPlugin] Failed to mount drawing component:`, error)
      excalidrawContainer.innerHTML = `
        <div class="draw-fallback" style="padding: 40px; text-align: center; color: #6c757d;">
          <h4>Drawing Canvas Unavailable</h4>
          <p>The drawing component could not be initialized.</p>
          <p>Error: ${error.message}</p>
        </div>
      `
    }
  }

  /**
   * Create a fallback canvas when Excalidraw is not available
   */
  _createFallbackCanvas(container) {
    console.log(`[DrawPlugin] Creating fallback canvas`)
    
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      border: 1px solid #e1e5e9;
      background: white;
      cursor: crosshair;
    `
    
    const ctx = canvas.getContext('2d')
    let isDrawing = false
    let lastX = 0
    let lastY = 0
    
    // Set up drawing context
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Handle mouse events
    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true
      const rect = canvas.getBoundingClientRect()
      lastX = (e.clientX - rect.left) * (canvas.width / rect.width)
      lastY = (e.clientY - rect.top) * (canvas.height / rect.height)
    })
    
    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return
      
      const rect = canvas.getBoundingClientRect()
      const currentX = (e.clientX - rect.left) * (canvas.width / rect.width)
      const currentY = (e.clientY - rect.top) * (canvas.height / rect.height)
      
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(currentX, currentY)
      ctx.stroke()
      
      lastX = currentX
      lastY = currentY
    })
    
    canvas.addEventListener('mouseup', () => isDrawing = false)
    canvas.addEventListener('mouseout', () => isDrawing = false)
    
    // Handle touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      isDrawing = true
      lastX = (touch.clientX - rect.left) * (canvas.width / rect.width)
      lastY = (touch.clientY - rect.top) * (canvas.height / rect.height)
    })
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (!isDrawing) return
      
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      const currentX = (touch.clientX - rect.left) * (canvas.width / rect.width)
      const currentY = (touch.clientY - rect.top) * (canvas.height / rect.height)
      
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(currentX, currentY)
      ctx.stroke()
      
      lastX = currentX
      lastY = currentY
    })
    
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      isDrawing = false
    })
    
    container.appendChild(canvas)
    this.fallbackCanvas = canvas
    this.fallbackContext = ctx
    
    console.log(`[DrawPlugin] Fallback canvas created successfully`)
  }

  /**
   * Set up event handlers for drawing controls
   */
  _setupDrawControls(header) {
    const clearBtn = header.querySelector('#clear-canvas')
    const exportBtn = header.querySelector('#export-png')

    if (clearBtn) {
      const handler = () => this._clearCanvas()
      clearBtn.addEventListener('click', handler)
      this._eventHandlers.push({ element: clearBtn, event: 'click', handler })
    }

    if (exportBtn) {
      const handler = () => this._exportPNG()
      exportBtn.addEventListener('click', handler)
      this._eventHandlers.push({ element: exportBtn, event: 'click', handler })
    }

    // Add hover effects
    const buttons = header.querySelectorAll('.btn')
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (btn.id === 'export-png') {
          btn.style.background = '#0d6efd'
          btn.style.color = 'white'
        } else {
          btn.style.background = '#6c757d'
          btn.style.color = 'white'
        }
      })
      
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent'
        if (btn.id === 'export-png') {
          btn.style.color = '#0d6efd'
        } else {
          btn.style.color = '#6c757d'
        }
      })
    })
  }

  /**
   * Clear the drawing canvas
   */
  _clearCanvas() {
    if (this.fallbackCanvas && this.fallbackContext) {
      try {
        this.fallbackContext.clearRect(0, 0, this.fallbackCanvas.width, this.fallbackCanvas.height)
        console.log(`[DrawPlugin] Canvas cleared`)
      } catch (error) {
        console.error(`[DrawPlugin] Error clearing canvas:`, error)
      }
    } else {
      console.warn(`[DrawPlugin] Cannot clear canvas - no drawing canvas available`)
    }
  }

  /**
   * Export drawing as PNG
   */
  async _exportPNG() {
    if (this.fallbackCanvas) {
      try {
        // Convert canvas to blob and download
        this.fallbackCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `drawing-${new Date().toISOString().slice(0, 10)}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 'image/png')
        
        console.log(`[DrawPlugin] Canvas drawing exported as PNG`)
      } catch (error) {
        console.error(`[DrawPlugin] Error exporting canvas PNG:`, error)
      }
    } else {
      console.warn(`[DrawPlugin] Cannot export - no drawing canvas available`)
    }
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
      this.fallbackCanvas = null
      this.fallbackContext = null

      // Clean up event handlers
      if (this._eventHandlers) {
        this._eventHandlers.forEach(({ element, event, handler }) => {
          if (element && handler) {
            element.removeEventListener(event, handler)
          }
        })
        this._eventHandlers = []
      }

      // Reset container
      this.container = null
      
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