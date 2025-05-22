import { pluginManager } from '../../core/plugin-manager.js'
import { eventBus, EVENTS } from 'evb'

// Add styles for the Atuin plugin
const styles = `
.atuin-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  box-sizing: border-box;
}

.atuin-tabs {
  display: flex;
  border-bottom: 1px solid #ccc;
  margin-bottom: 1rem;
}

.atuin-tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
}

.atuin-tab:hover {
  color: #333;
  background-color: #f5f5f5;
}

.atuin-tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.atuin-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allows content to scroll */
}

.editor-container {
  flex: 1;
  min-height: 300px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.sparql-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.results-container {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: auto;
  padding: 1rem;
  background: #f9f9f9;
}
`

export function initView() {
  // Find the atuin view container
  const view = document.getElementById('atuin-view')
  if (!view) {
    console.error('Atuin view container not found')
    return
  }

  // Add the atuin-view class for styling
  view.classList.add('atuin-view')
  
  // Add styles to the document
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
  
  // Create a container for the plugin
  const pluginContainer = document.createElement('div')
  pluginContainer.id = 'atuin-plugin-container'
  pluginContainer.style.flex = '1'
  pluginContainer.style.display = 'flex'
  pluginContainer.style.flexDirection = 'column'
  pluginContainer.style.minHeight = '0' // Important for flex children to respect overflow
  
  // Clear any existing content and add our container
  view.innerHTML = ''
  view.appendChild(pluginContainer)
  
  // Initialize plugin reference
  let plugin = null
  let isMounted = false
  
  // Helper to mount the plugin
  const mountPlugin = async () => {
    if (isMounted) return
    
    try {
      plugin = pluginManager.getPlugin('atuin-plugin')
      if (!plugin) {
        console.error('Atuin plugin not found')
        return
      }
      
      // Ensure the plugin is unmounted first
      await plugin.unmount()
      
      // Mount the plugin to our container
      await plugin.mount(pluginContainer)
      isMounted = true
      
      console.log('Atuin plugin mounted successfully')
    } catch (error) {
      console.error('Error mounting Atuin plugin:', error)
    }
  }
  
  // Handle view updates
  const update = () => {
    if (view.offsetParent !== null && !isMounted) {
      mountPlugin()
    }
  }
  
  // Clean up function
  const cleanup = async () => {
    if (plugin && isMounted) {
      try {
        await plugin.unmount()
      } catch (error) {
        console.error('Error unmounting Atuin plugin:', error)
      }
      isMounted = false
    }
    
    // Remove the style element
    if (styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement)
    }
    
    // Remove the view class
    view.classList.remove('atuin-view')
  }
  
  // Set up a mutation observer to watch for view visibility changes
  const observer = new MutationObserver(update)
  observer.observe(view, { attributes: true, attributeFilter: ['class', 'style'] })
  
  // Initial mount check
  update()
  
  // Return the cleanup function
  return {
    update,
    cleanup
  }
}