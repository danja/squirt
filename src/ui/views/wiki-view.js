// src/ui/views/wiki-view.js - Updated to use Redux-style store instead of deprecated StateManager
import { eventBus, EVENTS } from 'evb'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { showNotification } from '../notifications/notifications.js'
import { rdfModel } from '../../domain/rdf/model.js'
import { marked } from 'marked'

let editor = null
let preview = null
let currentEntryId = null

/**
 * Initialize Wiki view
 * @returns {Object} View interface with update and cleanup methods
 */
export function initView() {
  try {
    console.log('Initializing Wiki view')

    const view = document.getElementById('wiki-view')
    if (!view) {
      throw new Error('Wiki view element not found')
    }

    // Load CodeMirror and other dependencies
    loadDependencies().then(() => {
      initializeWikiEditor()
      loadWikiEntries()
    }).catch(error => {
      errorHandler.handle(error, {
        showToUser: true,
        context: 'Loading Wiki dependencies'
      })
    })

    return {
      update() {
        console.log('Updating Wiki view')
        loadWikiEntries()
      },

      cleanup() {
        console.log('Cleaning up Wiki view')
      }
    }
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Initializing Wiki view'
    })

    return {}
  }
}

/**
 * Load required dependencies
 * @returns {Promise} Promise resolving when dependencies are loaded
 */
async function loadDependencies() {
  try {
    // Load CodeMirror
    if (!window.CodeMirror) {
      const cm = await import('codemirror')
      window.CodeMirror = cm.default

      // Load CodeMirror plugins
      await import('codemirror/mode/markdown/markdown')
      await import('codemirror/addon/edit/continuelist')
      await import('codemirror/addon/display/placeholder')
    }

    // Load Marked for Markdown rendering
    if (!window.marked) {
      const markedModule = await import('marked')
      window.marked = markedModule.marked || markedModule.default
    }

    // Load CodeMirror CSS
    if (!document.querySelector('link[href*="codemirror.css"]')) {
      const cmCss = document.createElement('link')
      cmCss.rel = 'stylesheet'
      cmCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.12/codemirror.min.css'
      document.head.appendChild(cmCss)
    }

    // Load CodeMirror theme
    if (!document.querySelector('link[href*="monokai.css"]')) {
      const themeCss = document.createElement('link')
      themeCss.rel = 'stylesheet'
      themeCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.12/theme/monokai.min.css'
      document.head.appendChild(themeCss)
    }

    // Load Material Icons
    if (!document.querySelector('link[href*="material-icons"]')) {
      const iconsCss = document.createElement('link')
      iconsCss.rel = 'stylesheet'
      iconsCss.href = 'https://fonts.googleapis.com/icon?family=Material+Icons'
      document.head.appendChild(iconsCss)
    }
  } catch (error) {
    console.error('Error loading dependencies:', error)
    throw new Error(`Failed to load Wiki dependencies: ${error.message}`)
  }
}

/**
 * Initialize the Wiki editor
 */
function initializeWikiEditor() {
  const wikiContent = document.getElementById('wiki-content')
  const previewContainer = document.querySelector('.wiki-preview')
  const saveButton = document.getElementById('save-wiki')

  if (!wikiContent) {
    console.warn('Wiki content element not found')
    return
  }

  // Create preview container if not present
  if (!previewContainer) {
    preview = document.createElement('div')
    preview.className = 'wiki-preview'
    preview.innerHTML = '<h3>Preview</h3><div class="preview-content"></div>'

    const wikiEditor = document.querySelector('.wiki-editor')
    if (wikiEditor) {
      wikiEditor.appendChild(preview)
    }
  } else {
    preview = previewContainer
  }

  // Initialize CodeMirror editor
  editor = window.CodeMirror.fromTextArea(wikiContent, {
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

  // Update preview on content change
  editor.on('change', updatePreview)

  // Setup save button
  if (saveButton) {
    saveButton.addEventListener('click', saveWikiEntry)
  }

  // Add toolbar
  addToolbar()

  // Initial preview update
  updatePreview()
}

/**
 * Update the preview with rendered markdown
 */
function updatePreview() {
  const content = editor.getValue()
  const previewContent = preview.querySelector('.preview-content')

  if (previewContent) {
    // Render markdown to HTML
    previewContent.innerHTML = marked(content)

    // Highlight code blocks if highlight.js is available
    previewContent.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) {
        window.hljs.highlightBlock(block)
      }
    })
  }
}

/**
 * Add markdown editor toolbar
 */
function addToolbar() {
  const toolbar = document.createElement('div')
  toolbar.className = 'editor-toolbar'

  // Define toolbar buttons
  const buttons = [
    { icon: 'format_bold', title: 'Bold', action: () => wrapText('**', '**') },
    { icon: 'format_italic', title: 'Italic', action: () => wrapText('*', '*') },
    { icon: 'format_quote', title: 'Quote', action: () => prependLine('> ') },
    { icon: 'format_list_bulleted', title: 'Bullet List', action: () => prependLine('- ') },
    { icon: 'format_list_numbered', title: 'Numbered List', action: () => prependLine('1. ') },
    { icon: 'insert_link', title: 'Link', action: insertLink },
    { icon: 'insert_photo', title: 'Image', action: insertImage },
    { icon: 'code', title: 'Code', action: () => wrapText('`', '`') },
    { icon: 'view_headline', title: 'Heading', action: () => prependLine('## ') }
  ]

  // Create buttons
  buttons.forEach(button => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'toolbar-button'
    btn.title = button.title
    btn.innerHTML = `<i class="material-icons">${button.icon}</i>`
    btn.addEventListener('click', button.action)
    toolbar.appendChild(btn)
  })

  // Add toolbar to editor
  const editorContainer = editor.getWrapperElement().parentNode
  editorContainer.insertBefore(toolbar, editor.getWrapperElement())

  // Add toolbar styles if not already present
  if (!document.getElementById('editor-toolbar-styles')) {
    const style = document.createElement('style')
    style.id = 'editor-toolbar-styles'
    style.textContent = `
            .editor-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-bottom: 10px;
                padding: 5px;
                background: #f5f5f5;
                border-radius: 4px;
            }

            .toolbar-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                padding: 0;
                border: none;
                background: transparent;
                border-radius: 4px;
                cursor: pointer;
            }

            .toolbar-button:hover {
                background: #e0e0e0;
            }

            .toolbar-button i {
                font-size: 20px;
                color: #555;
            }
        `
    document.head.appendChild(style)
  }
}

/**
 * Wrap selected text with prefix and suffix
 * @param {string} prefix - Text to add before selection
 * @param {string} suffix - Text to add after selection
 */
function wrapText(prefix, suffix) {
  const selection = editor.getSelection()
  if (selection) {
    editor.replaceSelection(prefix + selection + suffix)
  } else {
    const cursor = editor.getCursor()
    editor.replaceRange(prefix + suffix, cursor)
    editor.setCursor({
      line: cursor.line,
      ch: cursor.ch + prefix.length
    })
  }
  editor.focus()
}

/**
 * Prepend text to the current line or selected lines
 * @param {string} text - Text to prepend
 */
function prependLine(text) {
  const selection = editor.getSelection()
  const cursor = editor.getCursor()

  if (selection) {
    const lines = selection.split('\n')
    const newText = lines.map(line => text + line).join('\n')
    editor.replaceSelection(newText)
  } else {
    const line = editor.getLine(cursor.line)
    editor.replaceRange(text + line, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length })
    editor.setCursor({ line: cursor.line, ch: text.length + cursor.ch })
  }
  editor.focus()
}

/**
 * Insert a link at the cursor or around selected text
 */
function insertLink() {
  const selection = editor.getSelection()
  const url = prompt('Enter URL:', 'https://')

  if (url) {
    if (selection) {
      editor.replaceSelection(`[${selection}](${url})`)
    } else {
      const text = prompt('Enter link text:', 'Link text')
      if (text) {
        editor.replaceSelection(`[${text}](${url})`)
      }
    }
  }
  editor.focus()
}

/**
 * Insert an image at the cursor
 */
function insertImage() {
  const url = prompt('Enter image URL:', 'https://')

  if (url) {
    const alt = prompt('Enter image description:', 'Image')
    if (alt) {
      editor.replaceSelection(`![${alt}](${url})`)
    }
  }
  editor.focus()
}

/**
 * Save current wiki entry
 */
function saveWikiEntry() {
  const titleInput = document.getElementById('wiki-title')
  const tagsInput = document.getElementById('wiki-tags')

  if (!titleInput || !titleInput.value.trim()) {
    showNotification('Please enter a title for your wiki entry', 'error')
    return
  }

  const content = editor.getValue()
  if (!content.trim()) {
    showNotification('Please enter some content for your wiki entry', 'error')
    return
  }

  const tags = tagsInput && tagsInput.value
    ? tagsInput.value.split(',').map(tag => tag.trim())
    : []

  try {
    // Delete existing entry if editing
    if (currentEntryId) {
      rdfModel.deletePost(currentEntryId)
    }

    // Create post data
    const postData = {
      type: 'wiki',
      title: titleInput.value.trim(),
      content: content,
      tags: tags
    }

    // Preserve ID if editing
    if (currentEntryId) {
      postData.customId = currentEntryId
    }

    // Create the post
    const postId = rdfModel.createPost(postData)

    // Sync with endpoint
    rdfModel.syncWithEndpoint()
      .catch(error => {
        console.warn('Wiki entry saved locally but failed to sync with endpoint', error)
      })

    // Reset form
    resetForm()

    // Show success notification
    showNotification(currentEntryId ? 'Wiki entry updated successfully' : 'Wiki entry saved successfully', 'success')

    // Clear current entry ID
    currentEntryId = null

    // Reset UI state
    const saveButton = document.getElementById('save-wiki')
    if (saveButton) {
      saveButton.textContent = 'Save'
    }

    const cancelButton = document.getElementById('cancel-edit')
    if (cancelButton) {
      cancelButton.style.display = 'none'
    }

    // Reload entries
    loadWikiEntries()
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Saving wiki entry'
    })
  }
}

/**
 * Reset the form
 */
function resetForm() {
  const titleInput = document.getElementById('wiki-title')
  const tagsInput = document.getElementById('wiki-tags')

  if (titleInput) {
    titleInput.value = ''
  }

  if (editor) {
    editor.setValue('')
  }

  if (tagsInput) {
    tagsInput.value = ''
  }
}

/**
 * Load wiki entries from the RDF store
 */
function loadWikiEntries() {
  const entriesContainer = document.querySelector('.wiki-entries')
  if (!entriesContainer) return

  // Reset container
  entriesContainer.innerHTML = '<h3>Recent Entries</h3>'

  try {
    // Get wiki posts from RDF model
    const entries = rdfModel.getPosts({
      type: 'wiki',
      limit: 10
    })

    if (entries.length === 0) {
      entriesContainer.innerHTML += '<p>No wiki entries found.</p>'
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

      // Add event listeners
      item.querySelector('.view-entry').addEventListener('click', () => viewEntry(entry.id))
      item.querySelector('.edit-entry').addEventListener('click', () => editEntry(entry.id))
      item.querySelector('.delete-entry').addEventListener('click', () => deleteEntry(entry.id))

      list.appendChild(item)
    })

    entriesContainer.appendChild(list)
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Loading wiki entries'
    })
    entriesContainer.innerHTML += `<p class="error">Error loading entries: ${error.message}</p>`
  }
}

/**
 * View wiki entry
 * @param {string} id - Entry ID to view
 */
function viewEntry(id) {
  try {
    // Get container
    const entriesContainer = document.querySelector('.wiki-entries')
    if (!entriesContainer) return

    // Find post by ID
    const posts = rdfModel.getPosts()
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
            <div class="entry-content">${marked(post.content)}</div>
        `

    // Replace entries with entry detail
    entriesContainer.innerHTML = ''
    entriesContainer.appendChild(entryView)

    // Add back button handler
    entryView.querySelector('.back-button').addEventListener('click', loadWikiEntries)

    // Add edit button handler
    entryView.querySelector('.edit-entry').addEventListener('click', () => editEntry(post.id))

    // Highlight code blocks
    entryView.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) {
        window.hljs.highlightBlock(block)
      }
    })
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Viewing wiki entry'
    })
  }
}

/**
 * Edit wiki entry
 * @param {string} id - Entry ID to edit
 */
function editEntry(id) {
  try {
    // Find post by ID
    const posts = rdfModel.getPosts()
    const post = posts.find(p => p.id === id)

    if (!post) {
      showNotification('Entry not found', 'error')
      return
    }

    // Set current entry ID
    currentEntryId = id

    // Update form fields
    const titleInput = document.getElementById('wiki-title')
    const tagsInput = document.getElementById('wiki-tags')

    if (titleInput) {
      titleInput.value = post.title || ''
    }

    if (tagsInput) {
      tagsInput.value = post.tags.join(', ')
    }

    if (editor) {
      editor.setValue(post.content || '')
    }

    // Update save button text
    const saveButton = document.getElementById('save-wiki')
    if (saveButton) {
      saveButton.textContent = 'Update'
    }

    // Show cancel button
    const cancelButton = document.getElementById('cancel-edit')
    if (cancelButton) {
      cancelButton.style.display = 'inline-block'
    }

    // Scroll to editor
    const editorContainer = document.querySelector('.wiki-editor')
    if (editorContainer) {
      editorContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }

    showNotification('Editing entry: ' + post.title, 'info')
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Editing wiki entry'
    })
  }
}

/**
 * Delete wiki entry
 * @param {string} id - Entry ID to delete
 */
function deleteEntry(id) {
  if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
    return
  }

  try {
    // Delete the post
    const success = rdfModel.deletePost(id)

    if (success) {
      showNotification('Entry deleted successfully', 'success')

      // Reload entries
      loadWikiEntries()

      // Reset form if currently editing this entry
      if (currentEntryId === id) {
        resetForm()
        currentEntryId = null

        // Reset UI state
        const saveButton = document.getElementById('save-wiki')
        if (saveButton) {
          saveButton.textContent = 'Save'
        }

        const cancelButton = document.getElementById('cancel-edit')
        if (cancelButton) {
          cancelButton.style.display = 'none'
        }
      }
    } else {
      showNotification('Failed to delete entry', 'error')
    }
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Deleting wiki entry'
    })
  }
}

// Listen for route changes
document.addEventListener('routeChange', (e) => {
  if (e.detail.to === 'wiki-view') {
    setTimeout(() => {
      if (!editor) {
        initializeWikiEditor()
      }
      loadWikiEntries()
    }, 100)
  }
})