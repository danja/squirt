// src/js/plugins/yasgui-plugin.js
// YASGUI SPARQL query editor plugin

import { PluginBase } from '../core/plugin-base.js'
import { errorHandler } from '../core/errors/index.js'
import { EVENTS, eventBus } from 'evb'
import { querySparql } from '../services/sparql/sparql.js'

/**
 * YASGUI SPARQL query editor plugin (eventBus-driven)
 */
export class YasguiPlugin extends PluginBase {
  constructor(id = 'yasgui-plugin', options = {}) {
    super(id, {
      autoInitialize: true,
      defaultQuery: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nPREFIX squirt: <http://purl.org/stuff/squirt/>\n\nSELECT ?subject ?predicate ?object\nWHERE {\n  ?subject ?predicate ?object\n}\nLIMIT 10`,
      ...options
    })
    this.yasguiInstance = null
    this.resizeObserver = null
    this._evbUnsubs = []
  }

  /**
   * Initialize plugin (load YASGUI if needed)
   */
  async initialize() {
    if (this.isInitialized) return
    try {
      await this.loadYasguiDependencies()
      super.initialize()
    } catch (error) {
      errorHandler.handle(error, { showToUser: false, context: 'YasguiPlugin Initialization' })
      throw new Error(`Failed to initialize YASGUI plugin: ${error.message}`)
    }
  }

  /**
   * Dynamically load YASGUI and CSS
   */
  async loadYasguiDependencies() {
    if (window.Yasgui) {
      this.Yasgui = window.Yasgui
      return
    }
    const module = await import('@triply/yasgui')
    this.Yasgui = module.default
    if (!document.querySelector('link[href*="yasgui.min.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/@triply/yasgui/build/yasgui.min.css'
      document.head.appendChild(link)
    }
  }

  /**
   * Mount plugin UI and set up eventBus listeners
   */
  async mount(container) {
    await super.mount(container)
    container.innerHTML = '<div class="yasgui-wrapper"></div>'
    const wrapper = container.querySelector('.yasgui-wrapper')

    // Get initial endpoint from eventBus (ask for current endpoint)
    let activeEndpoint = null
    const endpointListener = (data) => {
      if (data && data.type === 'query') activeEndpoint = data.endpoint || data
    }
    // Listen for endpoint status checked/changed
    this._evbUnsubs.push(eventBus.on(EVENTS.ENDPOINTS_STATUS_CHECKED, endpointListener))
    this._evbUnsubs.push(eventBus.on(EVENTS.ENDPOINT_STATUS_CHANGED, endpointListener))

    // Request current endpoint (other part of app should respond by emitting ENDPOINTS_STATUS_CHECKED)
    eventBus.emit(EVENTS.ENDPOINT_CHECK_REQUESTED, { message: 'Requesting endpoint for YASGUI' })

    // Wait a tick for endpoint to be set
    await new Promise(r => setTimeout(r, 50))

    // YASGUI config
    const config = {
      requestConfig: {
        endpoint: activeEndpoint && activeEndpoint.url ? activeEndpoint.url : 'http://localhost:4030/sparql/query',
        method: 'POST'
      }
    }
    if (activeEndpoint && activeEndpoint.credentials) {
      const authString = btoa(activeEndpoint.credentials.user + ':' + activeEndpoint.credentials.password)
      config.requestConfig.headers = { 'Authorization': 'Basic ' + authString }
    }

    // Create YASGUI instance
    this.yasguiInstance = new this.Yasgui(wrapper, config)
    // Set default query if empty
    const tab = this.yasguiInstance.getTab()
    if (tab && tab.yasqe && !tab.yasqe.getValue().trim()) {
      tab.yasqe.setValue(this.options.defaultQuery)
    }

    // Listen for endpoint changes via eventBus
    this._evbUnsubs.push(eventBus.on(EVENTS.ENDPOINTS_STATUS_CHECKED, this.handleEndpointChange.bind(this)))
    this._evbUnsubs.push(eventBus.on(EVENTS.ENDPOINT_STATUS_CHANGED, this.handleEndpointChange.bind(this)))

    // Listen for query execution (YASQE run button)
    if (tab && tab.yasqe) {
      tab.yasqe.on('query', () => this.handleQuery(tab.yasqe))
    }

    // Resize observer for responsive UI
    this.setupResizeObserver()
  }

  /**
   * Update YASGUI endpoint config on event
   */
  handleEndpointChange(data) {
    if (!this.yasguiInstance) return
    // Accept either {endpoint, type} or just endpoint object
    const endpoint = data && data.endpoint ? data.endpoint : data
    if (!endpoint || endpoint.type !== 'query') return
    const tab = this.yasguiInstance.getTab()
    if (!tab || !tab.yasqe) return
    tab.yasqe.options.requestConfig.endpoint = endpoint.url
    if (endpoint.credentials) {
      const authString = btoa(endpoint.credentials.user + ':' + endpoint.credentials.password)
      tab.yasqe.options.requestConfig.headers = { 'Authorization': 'Basic ' + authString }
    } else {
      delete tab.yasqe.options.requestConfig.headers
    }
    eventBus.emit(EVENTS.NOTIFICATION_SHOW, { type: 'info', message: `SPARQL endpoint updated: ${endpoint.url}` })
  }

  /**
   * Execute SPARQL query using eventBus and shared service
   */
  async handleQuery(yasqeInstance) {
    const endpoint = yasqeInstance.options.requestConfig.endpoint
    if (!endpoint) {
      errorHandler.handle(new Error('SPARQL endpoint not configured or inactive'), { showToUser: true, context: 'YasguiPlugin Query No Active Endpoint' })
      if (this.yasguiInstance && this.yasguiInstance.getTab() && this.yasguiInstance.getTab().yasr) {
        this.yasguiInstance.getTab().yasr.setResults({ error: { message: 'SPARQL endpoint not configured or inactive' } })
      }
      return
    }
    const credentials = yasqeInstance.options.requestConfig.headers && yasqeInstance.options.requestConfig.headers['Authorization']
      ? (() => {
        try {
          const [user, password] = atob(yasqeInstance.options.requestConfig.headers['Authorization'].replace('Basic ', '')).split(':')
          return { user, password }
        } catch { return null }
      })()
      : null
    const query = yasqeInstance.getValue()
    eventBus.emit(EVENTS.SPARQL_QUERY_STARTED, { endpoint, query })
    const yasr = this.yasguiInstance.getTab().yasr
    try {
      if (yasr) yasr.setResults(null)
      const results = await querySparql(endpoint, query, 'select', credentials)
      if (yasr) yasr.setResults(results)
      eventBus.emit(EVENTS.SPARQL_QUERY_COMPLETED, { endpoint, results })
    } catch (error) {
      eventBus.emit(EVENTS.SPARQL_QUERY_FAILED, { endpoint, error })
      const handledError = errorHandler.handle(error, { showToUser: true, context: 'YasguiPlugin Query Execution' })
      if (yasr) {
        yasr.setResults({ error: { message: handledError.message, details: handledError.details || {} } })
      }
    }
  }

  /**
   * Responsive resize observer
   */
  setupResizeObserver() {
    if (this.resizeObserver) this.resizeObserver.disconnect()
    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    if (this.container) this.resizeObserver.observe(this.container)
    this.handleResize()
  }
  handleResize() {
    if (!this.yasguiInstance || !this.container) return
    const { width, height } = this.container.getBoundingClientRect()
    const wrapper = this.container.querySelector('.yasgui-wrapper')
    if (wrapper) {
      wrapper.style.minHeight = '500px'
      wrapper.style.height = `${height}px`
      wrapper.style.width = `${width}px`
    }
    if (this.yasguiInstance.store) {
      this.yasguiInstance.store.dispatch({ type: 'YASGUI_RESIZE' })
    }
  }

  /**
   * Clean up all listeners and DOM
   */
  async unmount() {
    if (!this.isMounted) return
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.yasguiInstance) {
      this.yasguiInstance = null
    }
    if (this.container) {
      this.container.innerHTML = ''
    }
    this._evbUnsubs.forEach(unsub => { if (typeof unsub === 'function') unsub() })
    this._evbUnsubs = []
    await super.unmount()
  }

  async destroy() {
    await this.unmount()
    await super.destroy()
  }
}