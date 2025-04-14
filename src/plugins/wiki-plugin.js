// src/js/plugins/wiki-plugin.js
// Wiki editor plugin with markdown support

import { PluginBase } from '../core/plugin-base.js'
// import { rdfModel } from '../js/services/rdf/rdf-model.js'; // Old path, commented out or removed
import { rdfService } from '../services/rdf/rdf-service.js' // Corrected import
// import { ErrorHandler } from '../core/errors.js'
import { errorHandler } from '../core/errors/index.js' // Import new handler singleton
import { showNotification } from '../ui/components/notifications.js'

/**
 * Plugin that provides wiki editing functionality with markdown support
 */
export class WikiPlugin extends PluginBase {
  constructor(id = 'wiki-plugin', options = {}) {
    super(id, {
      autoInitialize: true,
      toolbarEnabled: true,
      ...options
    })

    this.editor = null
    this.preview = null
    this.toolbar = null
    this.entriesContainer = null
    this.currentEntryId = null // Track current entry being edited
  }

  /**
   * Initialize the wiki plugin by loading required resources
   */
  async initialize() {
    if (this.isInitialized) return

    try {
      // Load dependencies
      await this.loadDependencies()

      // Initialize base
      await super.initialize()
      console.log('Wiki plugin initialized')
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'WikiPlugin Initialize' }) // Use new handler
      throw new Error(`Failed to initialize Wiki plugin: ${error.message}`)
    }
  }

  /**
   * Dynamically load CodeMirror and other dependencies
   */
  async loadDependencies() {
    try {
      // Check if CodeMirror is already loaded
      if (window.CodeMirror) {
        this.CodeMirror = window.CodeMirror
      } else {
        // Dynamically import CodeMirror
        const cm = await import('codemirror')
        this.CodeMirror = cm.default

        // Import mode and addons
        await import('codemirror/mode/markdown/markdown')
        await import('codemirror/addon/edit/continuelist')
        await import('codemirror/addon/display/placeholder')
      }

      // Check if marked is already loaded
      if (window.marked) {
        this.marked = window.marked
      } else {
        // Dynamically import marked
        const markedModule = await import('marked')
        this.marked = markedModule.marked
      }

      // Load CodeMirror CSS if not already loaded
      if (!document.querySelector('link[href*="codemirror.css"]')) {
        const cmCss = document.createElement('link')
        cmCss.rel = 'stylesheet'
        cmCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.12/codemirror.min.css'
        document.head.appendChild(cmCss)
      }

      // Load theme if not already loaded
      if (!document.querySelector('link[href*="monokai.css"]')) {
        const themeCss = document.createElement('link')
        themeCss.rel = 'stylesheet'
        themeCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.12/theme/monokai.min.css'
        document.head.appendChild(themeCss)
      }

      // Load Material Icons if toolbar is enabled
      if (this.options.toolbarEnabled && !document.querySelector('link[href*="material-icons"]')) {
        const iconsCss = document.createElement('link')
        iconsCss.rel = 'stylesheet'
        iconsCss.href = 'https://fonts.googleapis.com/icon?family=Material+Icons'
        document.head.appendChild(iconsCss)
      }

    } catch (error) {
      throw new Error(`Failed to load Wiki plugin dependencies: ${error.message}`)
    }
  }

  /**
   * Set up the wiki editor in the container
   */
  async mount(container) {
    await super.mount(container)

    try {
      // Create editor structure
      this.createEditorStructure(container)

      // Initialize CodeMirror
      this.initializeCodeMirror()

      // Add toolbar if enabled
      if (this.options.toolbarEnabled) {
        this.addToolbar()
      }

      // Set up event listeners
      this.setupEventListeners()

      // Load wiki entries
      this.loadWikiEntries()

      console.log('Wiki plugin mounted successfully')
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'WikiPlugin Mount' }) // Use new handler
      container.innerHTML = `<div class="error-message">Failed to initialize Wiki editor: ${error.message}</div>`
      throw error
    }
  }

  /**
   * Create the editor structure in the container
   */
  createEditorStructure(container) {
    // Clear container
    container.innerHTML = `
      <div class="wiki-plugin">
        <div class="wiki-editor">
          <div class="form-field">
            <label for="wiki-title">Title</label>
            <input type="text" id="wiki-title" name="title" required>
          </div>
          <div class="form-field">
            <label for="wiki-content">Content (Markdown supported)</label>
            <textarea id="wiki-content" name="content" rows="10" required></textarea>
          </div>
          <div class="form-field">
            <label for="wiki-tags">Tags (comma separated)</label>
            <input type="text" id="wiki-tags" name="tags" placeholder="tag1, tag2, tag3">
          </div>
          <button type="button" id="save-wiki" class="button-primary">Save</button>
          <button type="button" id="cancel-edit" class="button-secondary" style="display: none;">Cancel</button>
        </div>
        <div class="wiki-preview">
          <h3>Preview</h3>
          <div class="preview-content"></div>
        </div>
        <div class="wiki-entries">
          <h3>Recent Entries</h3>
          <!-- Entries will be loaded here -->
        </div>
      </div>
    `

    // Store references to elements
    this.editorContainer = container.querySelector('.wiki-editor')
    this.previewContainer = container.querySelector('.wiki-preview')
    this.preview = container.querySelector('.preview-content')
    this.entriesContainer = container.querySelector('.wiki-entries')
    this.titleInput = container.querySelector('#wiki-title')
    this.tagsInput = container.querySelector('#wiki-tags')
    this.saveButton = container.querySelector('#save-wiki')
    this.cancelButton = container.querySelector('#cancel-edit')
  }

  /**
   * Initialize CodeMirror editor
   */
  initializeCodeMirror() {
    const textarea = this.container.querySelector('#wiki-content')
    if (!textarea) {
      throw new Error('Wiki content textarea not found')
    }

    // Initialize CodeMirror
    this.editor = this.CodeMirror.fromTextArea(textarea, {
      mode: 'markdown',
      theme: 'monokai',
      lineNumbers: true,
      lineWrapping: true,
      viewportMargin: Infinity,
      placeholder: 'Enter markdown content here...',
      extraKeys: {
        'Enter': 'newlineAndIndentContinueMarkdownList'
      }
    })

    // Add change event listener for live preview
    this.editor.on('change', () => this.updatePreview())

    // Initial preview update
    this.updatePreview()
  }

  /**
   * Update the preview with the current content
   */
  updatePreview() {
    if (!this.editor || !this.preview) return

    const content = this.editor.getValue()

    // Render Markdown to HTML using marked
    this.preview.innerHTML = this.marked(content)

    // Syntax highlighting for code blocks
    this.preview.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) {
        window.hljs.highlightBlock(block)
      }
    })
  }

  /**
   * Add a toolbar with common markdown formatting buttons
   */
  addToolbar() {
    // Create toolbar element
    this.toolbar = document.createElement('div')
    this.toolbar.className = 'editor-toolbar'

    // Define toolbar buttons
    const buttons = [
      { icon: 'format_bold', title: 'Bold', action: () => this.wrapText('**', '**') },
      { icon: 'format_italic', title: 'Italic', action: () => this.wrapText('*', '*') },
      { icon: 'format_quote', title: 'Quote', action: () => this.prependLine('> ') },
      { icon: 'format_list_bulleted', title: 'Bullet List', action: () => this.prependLine('- ') },
      { icon: 'format_list_numbered', title: 'Numbered List', action: () => this.prependLine('1. ') },
      { icon: 'insert_link', title: 'Link', action: () => this.insertLink() },
      { icon: 'insert_photo', title: 'Image', action: () => this.insertImage() },
      { icon: 'code', title: 'Code', action: () => this.wrapText('`', '`') },
      { icon: 'view_headline', title: 'Heading', action: () => this.prependLine('## ') }
    ]

    // Create buttons
    buttons.forEach(button => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'toolbar-button'
      btn.title = button.title
      btn.innerHTML = `<i class="material-icons">${button.icon}</i>`
      btn.addEventListener('click', button.action)
      this.toolbar.appendChild(btn)
    })

    // Add toolbar before the editor
    if (this.editor) {
      const editorWrapper = this.editor.getWrapperElement()
      editorWrapper.parentNode.insertBefore(this.toolbar, editorWrapper)
    }
  }

  /**
   * Set up event listeners for buttons
   */
  setupEventListeners() {
    // Save button
    if (this.saveButton) {
      this.saveButton.addEventListener('click', () => this.saveWikiEntry())
    }

    // Cancel button
    if (this.cancelButton) {
      this.cancelButton.addEventListener('click', () => this.cancelEdit())
    }
  }

  /**
   * Wrap selected text with prefix and suffix
   */
  wrapText(prefix, suffix) {
    if (!this.editor) return

    const selection = this.editor.getSelection()
    if (selection) {
      this.editor.replaceSelection(prefix + selection + suffix)
    } else {
      const cursor = this.editor.getCursor()
      this.editor.replaceRange(prefix + suffix, cursor)
      this.editor.setCursor({
        line: cursor.line,
        ch: cursor.ch + prefix.length
      })
    }
    this.editor.focus()
  }

  /**
   * Prepend each line in selection with text
   */
  prependLine(text) {
    if (!this.editor) return

    const selection = this.editor.getSelection()
    const cursor = this.editor.getCursor()

    if (selection) {
      const lines = selection.split('\n')
      const newText = lines.map(line => text + line).join('\n')
      this.editor.replaceSelection(newText)
    } else {
      const line = this.editor.getLine(cursor.line)
      this.editor.replaceRange(text + line, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length })
      this.editor.setCursor({ line: cursor.line, ch: text.length + cursor.ch })
    }
    this.editor.focus()
  }

  /**
   * Insert a link at cursor position
   */
  insertLink() {
    if (!this.editor) return

    const selection = this.editor.getSelection()
    const url = prompt('Enter URL:', 'https://')

    if (url) {
      if (selection) {
        this.editor.replaceSelection(`[${selection}](${url})`)
      } else {
        const text = prompt('Enter link text:', 'Link text')
        if (text) {
          this.editor.replaceSelection(`[${text}](${url})`)
        }
      }
    }
    this.editor.focus()
  }

  /**
   * Insert an image at cursor position
   */
  insertImage() {
    if (!this.editor) return

    const url = prompt('Enter image URL:', 'https://')

    if (url) {
      const alt = prompt('Enter image description:', 'Image')
      if (alt) {
        this.editor.replaceSelection(`![${alt}](${url})`)
      }
    }
    this.editor.focus()
  }

  /**
   * Save the current wiki entry
   */
  saveWikiEntry() {
    if (!this.titleInput || !this.titleInput.value.trim()) {
      showNotification('Please enter a title for your wiki entry', 'error')
      return
    }

    const content = this.editor ? this.editor.getValue() : ''
    if (!content.trim()) {
      showNotification('Please enter some content for your wiki entry', 'error')
      return
    }

    const tags = this.tagsInput && this.tagsInput.value
      ? this.tagsInput.value.split(',').map(tag => tag.trim())
      : []

    try {
      // If editing an existing entry, delete it first
      if (this.currentEntryId) {
        // rdfModel.deletePost(this.currentEntryId);
        rdfService.deletePost(this.currentEntryId) // Use new service
      }

      // Create wiki post in RDF model
      const postData = {
        type: 'wiki',
        title: this.titleInput.value.trim(),
        content: content,
        tags: tags
      }

      // If updating, use the same ID
      if (this.currentEntryId) {
        postData.customId = this.currentEntryId
      }

      // const postId = rdfModel.createPost(postData);
      const postId = rdfService.createPost(postData) // Use new service

      // Try to sync with endpoint
      rdfService.syncWithEndpoint() // Use new service
        .catch(syncError => {
          console.warn('Wiki entry saved locally but failed to sync with endpoint', syncError)
        })

      // Reset form
      this.resetForm()

      // No need for showNotification here if the event bus handles it via errorHandler
      // showNotification(this.currentEntryId ? 'Wiki entry updated successfully' : 'Wiki entry saved successfully', 'success')

      // Reset current entry ID
      this.currentEntryId = null

      // Update button text
      if (this.saveButton) {
        this.saveButton.textContent = 'Save'
      }

      // Hide cancel button
      if (this.cancelButton) {
        this.cancelButton.style.display = 'none'
      }

      // Refresh wiki entries list
      this.loadWikiEntries()
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'Wiki Save Entry' })
      // showNotification('Failed to save wiki entry: ' + error.message, 'error') // Redundant
    }
  }

  /**
   * Cancel the current edit and reset the form
   */
  cancelEdit() {
    this.resetForm()
    this.currentEntryId = null

    // Update button text
    if (this.saveButton) {
      this.saveButton.textContent = 'Save'
    }

    // Hide cancel button
    if (this.cancelButton) {
      this.cancelButton.style.display = 'none'
    }
  }

  /**
   * Reset the form to empty state
   */
  resetForm() {
    if (this.titleInput) {
      this.titleInput.value = ''
    }

    if (this.editor) {
      this.editor.setValue('')
    }

    if (this.tagsInput) {
      this.tagsInput.value = ''
    }
  }

  /**
   * Load and display wiki entries
   */
  loadWikiEntries() {
    if (!this.entriesContainer) return

    // Clear existing entries
    this.entriesContainer.innerHTML = '<h3>Recent Entries</h3>'

    try {
      // Get wiki posts from RDF model
      // const entries = rdfModel.getPosts({
      const entries = rdfService.getPosts({ // Use new service
        type: 'wiki',
        limit: 10 // Show only the 10 most recent entries
      })

      if (entries.length === 0) {
        this.entriesContainer.innerHTML += '<p>No wiki entries found.</p>'
        return
      }

      // Create entries list
      const list = document.createElement('ul')
      list.className = 'entries-list'

      entries.forEach(entry => {
        const item = document.createElement('li')
        item.className = 'entry-item'

        item.innerHTML = `
          <h4 class="entry-title">${entry.title || 'Untitled'}</h4>
          <p class="entry-preview">${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}</p>
          <div class="entry-meta">
            <span class="entry-date">${new Date(entry.created).toLocaleString()}</span>
            ${entry.tags.length > 0 ? `<span class="entry-tags">${entry.tags.join(', ')}</span>` : ''}
          </div>
          <div class="entry-actions">
            <button class="view-entry" data-id="${entry.id}">View</button>
            <button class="edit-entry" data-id="${entry.id}">Edit</button>
            <button class="delete-entry" data-id="${entry.id}">Delete</button>
          </div>
        `

        // Add click handlers for buttons
        item.querySelector('.view-entry').addEventListener('click', () => this.viewEntry(entry.id))
        item.querySelector('.edit-entry').addEventListener('click', () => this.editEntry(entry.id))
        item.querySelector('.delete-entry').addEventListener('click', () => this.deleteEntry(entry.id))

        list.appendChild(item)
      })

      this.entriesContainer.appendChild(list)
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'Wiki Load Entries' })
      this.entriesContainer.innerHTML += `<p class="error">Error loading entries: ${error.message}</p>`
    }
  }

  /**
   * View a wiki entry in detail
   */
  viewEntry(id) {
    try {
      // Get post from RDF model
      // const posts = rdfModel.getPosts();
      const posts = rdfService.getPosts() // Use new service
      const post = posts.find(p => p.id === id)

      if (!post) {
        showNotification('Entry not found', 'error')
        return
      }

      // Create entry view
      const entryView = document.createElement('div')
      entryView.className = 'entry-detail'

      entryView.innerHTML = `
        <div class="entry-toolbar">
          <button class="back-button">Back to list</button>
          <button class="edit-entry" data-id="${post.id}">Edit</button>
        </div>
        <h3 class="entry-title">${post.title || 'Untitled'}</h3>
        <div class="entry-meta">
          <span class="entry-date">${new Date(post.created).toLocaleString()}</span>
          ${post.tags.length > 0 ? `<span class="entry-tags">Tags: ${post.tags.join(', ')}</span>` : ''}
        </div>
        <div class="entry-content">${this.marked(post.content)}</div>
      `

      // Replace entries list with entry view
      if (this.entriesContainer) {
        this.entriesContainer.innerHTML = ''
        this.entriesContainer.appendChild(entryView)
      }

      // Add back button handler
      entryView.querySelector('.back-button').addEventListener('click', () => this.loadWikiEntries())

      // Add edit button handler
      entryView.querySelector('.edit-entry').addEventListener('click', () => this.editEntry(post.id))

      // Syntax highlighting for code blocks
      entryView.querySelectorAll('pre code').forEach(block => {
        if (window.hljs) {
          window.hljs.highlightBlock(block)
        }
      })
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'Wiki View Entry' })
      // showNotification('Error viewing entry: ' + error.message, 'error') // Redundant
    }
  }

  /**
   * Edit an existing wiki entry
   */
  editEntry(id) {
    try {
      // Get post from RDF model
      // const posts = rdfModel.getPosts();
      const posts = rdfService.getPosts() // Use new service
      const post = posts.find(p => p.id === id)

      if (!post) {
        showNotification('Entry not found', 'error')
        return
      }

      // Store current entry ID
      this.currentEntryId = id

      // Populate form with post data
      if (this.titleInput) {
        this.titleInput.value = post.title || ''
      }

      if (this.tagsInput) {
        this.tagsInput.value = post.tags.join(', ')
      }

      if (this.editor) {
        this.editor.setValue(post.content || '')
      }

      // Update button text
      if (this.saveButton) {
        this.saveButton.textContent = 'Update'
      }

      // Show cancel button
      if (this.cancelButton) {
        this.cancelButton.style.display = 'inline-block'
      }

      // Scroll to editor
      if (this.editorContainer) {
        this.editorContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }

      showNotification('Editing entry: ' + post.title, 'info')
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'Wiki Edit Entry' })
      // showNotification('Error editing entry: ' + error.message, 'error') // Redundant
    }
  }

  /**
   * Delete a wiki entry
   */
  deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
      return
    }

    try {
      // Delete the post
      // const success = rdfModel.deletePost(id);
      const success = rdfService.deletePost(id) // Use new service

      if (success) {
        // showNotification('Entry deleted successfully', 'success') // Notification handled by service/event bus?
        // Need to decide if delete operation should trigger a success notification via event bus
        // For now, let's assume delete success is just logged or handled locally.

        // Refresh wiki entries list
        this.loadWikiEntries()

        // If editing this entry, reset the form
        if (this.currentEntryId === id) {
          this.resetForm()
          this.currentEntryId = null

          // Update button text
          if (this.saveButton) {
            this.saveButton.textContent = 'Save'
          }

          // Hide cancel button
          if (this.cancelButton) {
            this.cancelButton.style.display = 'none'
          }
        }
      } else {
        // showNotification('Failed to delete entry', 'error') // Possibly redundant
        // Create and handle a specific error for deletion failure
        errorHandler.handle(new Error('Failed to delete entry, post might not exist or service failed'), { context: 'Wiki Delete Entry - Not Found' })
      }
    } catch (error) {
      // ErrorHandler.handle(error) // Old usage
      errorHandler.handle(error, { context: 'Wiki Delete Entry' })
      // showNotification('Error deleting entry: ' + error.message, 'error') // Redundant
    }
  }

  /**
   * Clean up the Wiki plugin
   */
  async unmount() {
    if (!this.isMounted) return

    // Clean up CodeMirror
    if (this.editor) {
      this.editor.toTextArea() // Reverts to original textarea
      this.editor = null
    }

    // Clear containers
    if (this.previewContainer) {
      this.previewContainer.innerHTML = ''
    }

    if (this.entriesContainer) {
      this.entriesContainer.innerHTML = ''
    }

    // Remove toolbar if it exists
    if (this.toolbar && this.toolbar.parentNode) {
      this.toolbar.parentNode.removeChild(this.toolbar)
      this.toolbar = null
    }

    await super.unmount()
    console.log('Wiki plugin unmounted')
  }

  /**
   * Release all resources
   */
  async destroy() {
    await this.unmount()
    await super.destroy()
    console.log('Wiki plugin destroyed')
  }
}