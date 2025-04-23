import { pluginManager } from '../../core/plugin-manager.js'

export function initView() {
    // Find the plugins section in the atuin view
    const view = document.getElementById('atuin-view')
    if (!view) return
    const pluginsSection = view.querySelector('.plugins-section')
    if (!pluginsSection) return

    // Helper to mount the plugin
    const mountPlugin = () => {
        const plugin = pluginManager.getPlugin('atuin-plugin')
        if (plugin) {
            plugin.unmount().then(() => {
                let container = document.getElementById('plugin-container-atuin-plugin')
                if (container) container.remove()
                container = document.createElement('div')
                container.id = 'plugin-container-atuin-plugin'
                container.className = 'plugin-container'
                pluginsSection.appendChild(container)
                plugin.mount(container)
            })
        }
    }

    // If view is visible, mount immediately
    if (!view.classList.contains('hidden')) {
        mountPlugin()
    } else {
        // Otherwise, observe for visibility change
        const observer = new MutationObserver(() => {
            if (!view.classList.contains('hidden')) {
                observer.disconnect()
                mountPlugin()
            }
        })
        observer.observe(view, { attributes: true, attributeFilter: ['class'] })
    }

    return {
        update() { },
        cleanup() { }
    }
} 