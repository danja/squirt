// src/js/plugins/wiki-plugin.js
import { PluginBase } from '../core/plugin-base.js';
import { ErrorHandler } from '../core/errors.js';
import { showNotification } from '../ui/components/notifications.js';

/**
 * Wiki Editor Plugin implementation
 */
class WikiPlugin extends PluginBase {
  constructor() {
    super('wiki-plugin', {
      title: 'Wiki Editor',
      settings: {
        autoSave: true,
        autoSaveInterval: 60000, // 1 minute
        defaultContent: '# New Wiki Page\n\nStart writing your content here...'
      }
    });
    
    this.editor = null;
    this.marked = null;
    this.rdfModel = null;
    this.autoSaveTimer = null;
  }

  /**
   * Initialize the plugin
   * @param {HTMLElement} container - The container element
   * @returns {WikiPlugin} Plugin instance
   */
  async initialize(container) {
    await super.initialize(container);
    
    // Prepare the container with loading message
    this.container.innerHTML = `
      <div class="wiki-container">
        <div class="wiki-loading">
          <div class="loading-spinner"></div>
          <p>Loading Wiki Editor...</p>
        </div>
      </div>
    `;
    
    return this;
  }

  /**
   * Mount the plugin
   * @param {HTMLElement} container - The container element
   * @returns {WikiPlugin} Plugin instance
   */
  async mount(container) {
    await super.mount(container);
    
    // If editor is already loaded, just show it
    if (this.editor) {
      this.container.style.display = 'block';
      return this;
    }
    
    // Otherwise, load the editor
    await this.loadEditor();
    return this;
  }

  /**
   * Dynamically load the Wiki editor
   * @returns {Promise<Object>} Editor instance
   */
  async loadEditor() {
    try {
      // Show loading indicator
      this.container.innerHTML = `
        <div class="wiki-loading">
          <div class="loading-spinner"></div>
          <p>Loading Wiki Editor...</p>
        </div>
      `;
      
      // Dynamically import dependencies
      const [CodeMirror, marked, rdfModelModule] = await Promise.all([
        import(/* webpackChunkName: "codemirror" */ 'codemirror'),
        import(/* webpackChunkName: "marked" */ 'marked'),
        import(/* webpackChunkName: "rdf-model" */ '../services/rdf/rdf-model.js')
      ]);
      
      // Load additional CodeMirror modes and addons
      await Promise.all([
        import(/* webpackChunkName: "codemirror-markdown" */ 'codemirror/mode/markdown/markdown'),
        import(/* webpackChunkName: "codemirror-css" */ 'codemirror/lib/codemirror.css'),
        import(/* webpackChunkName: "codemirror-theme" */ 'codemirror/theme/monokai.css'),
        import(/* webpackChunkName: "codemirror-continuelist" */ 'codemirror/addon/edit/continuelist'),
        import(/* webpackChunkName: "codemirror-placeholder" */ 'codemirror/addon/display/placeholder')
      ]);
      
      // Save references
      this.marked = marked.marked;
      this.rdfModel = rdfModelModule.rdfModel;
      
      // Render the editor UI
      this.renderEditorUI();
      
      // Initialize CodeMirror editor
      const editorTextarea = this.container.querySelector('#wiki-content');
      if (!editorTextarea) {
        throw new Error('Editor textarea element not found');
      }
      
      this.editor = CodeMirror.default.fromTextArea(editorTextarea, {
        mode: 'markdown',
        theme: 'monokai',
        lineNumbers: true,
        lineWrapping: true,
        viewportMargin: Infinity,
        placeholder: 'Enter markdown content here...',
        extraKeys: {
          'Enter': 'newlineAndIndentContinueMarkdownList'
        }
      });
      
      // Add event listener for changes (for preview)
      this.editor.on('change', () => this.updatePreview());
      
      // Add editor toolbar
      this.addEditorToolbar();
      
      // Load wiki entries
      this.loadWikiEntries();
      
      // Initial preview update
      this.updatePreview();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup auto-save if enabled
      if (this.settings.autoSave) {
        this.setupAutoSave();
      }
      
      return this.editor;
      
    } catch (error) {
      console.error('Failed to load Wiki editor:', error);
      ErrorHandler.handle(error);
      
      this.container.innerHTML = `
        <div class="plugin-error">
          <h3>Failed to load Wiki Editor</h3>
          <p>${error.message}</p>
          <button class="retry-button button-primary">Retry</button>
        </div>
      `;
      
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadEditor();
        });
      }
      
      throw error;
    }
  }

  /**
   * Render the editor UI
   */
  renderEditorUI() {
    this.container.innerHTML = `
      <div class="wiki-container">
        <h2>Wiki</h2>
        
        <div class="wiki-editor">
          <div class="form-field">
            <label for="wiki-title">Title</label>
            <input type="text" id="wiki-title" name="title" required>
          </div>
          <div class="editor-toolbar-container"></div>
          <div class="form-field">
            <label for="wiki-content">Content (Markdown supported)</label>
            <textarea id="wiki-content" name="content" rows="10" required></textarea>
          </div>
          <div class="form-field">
            <label for="wiki-tags">Tags (comma separated)</label>
            <input type="text" id="wiki-tags" name="tags" placeholder="tag1, tag2, tag3">
          </div>
          <div class="wiki-actions">
            <button type="button" id="save-wiki" class="button-primary">Save</button>
            <button type="button" id="preview-wiki" class="button-secondary">Preview</button>
            <button type="button" id="clear-wiki" class="button-secondary">Clear</button>
          </div>
        </div>
        
        <div class="wiki-preview">
          <h3>Preview</h3>
          <div class="preview-content"></div>
        </div>
        
        <div class="wiki-entries">
          <h3>Recent Entries</h3>
          <div class="entries-list"></div>
        </div>
      </div>
    `;
  }

  /**
   * Add a toolbar with markdown formatting options
   */
  addEditorToolbar() {
    const toolbarContainer = this.container.querySelector('.editor-toolbar-container');
    if (!toolbarContainer) return;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';
    
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
    ];
    
    // Add Material Icons stylesheet if not already present
    if (!document.querySelector('link[href*="material-icons"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
      document.head.appendChild(link);
    }
    
    // Create buttons
    buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toolbar-button';
      btn.title = button.title;
      btn.innerHTML = `<i class="material-icons">${button.icon}</i>`;
      btn.addEventListener('click', button.action);
      toolbar.appendChild(btn);
    });
    
    // Add to container
    toolbarContainer.appendChild(toolbar);
  }

  /**
   * Setup event listeners for buttons and other interactive elements
   */
  setupEventListeners() {
    // Save button
    const saveButton = this.container.querySelector('#save-wiki');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveWikiEntry());
    }
    
    // Preview button
    const previewButton = this.container.querySelector('#preview-wiki');
    if (previewButton) {
      previewButton.addEventListener('click', () => this.updatePreview());
    }
    
    // Clear button
    const clearButton = this.container.querySelector('#clear-wiki');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearEditor());
    }
  }

  /**
   * Set up auto-save functionality
   */
  setupAutoSave() {
    // Clear any existing timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // Set up new timer
    this.autoSaveTimer = setInterval(() => {
      const content = this.editor.getValue();
      const title = this.container.querySelector('#wiki-title').value;
      
      // Only auto-save if there's actual content and a title
      if (content && title) {
        this.saveWikiEntry(true); // true indicates this is an auto-save
      }
    }, this.settings.autoSaveInterval);
  }

  /**
   * Update the preview with the current editor content
   */
  updatePreview() {
    const previewContent = this.container.querySelector('.preview-content');
    if (!previewContent || !this.editor || !this.marked) return;
    
    const content = this.editor.getValue();
    previewContent.innerHTML = this.marked(content);
  }

  /**
   * Save the current wiki entry
   * @param {boolean} isAutoSave - Whether this is an auto-save
   */
  saveWikiEntry(isAutoSave = false) {
    try {
      const titleInput = this.container.querySelector('#wiki-title');
      const tagsInput = this.container.querySelector('#wiki-tags');
      
      if (!titleInput || !titleInput.value.trim()) {
        showNotification('Please enter a title for your wiki entry', 'error');
        return;
      }
      
      const content = this.editor.getValue();
      if (!content.trim()) {
        showNotification('Please enter some content for your wiki entry', 'error');
        return;
      }
      
      const tags = tagsInput && tagsInput.value 
        ? tagsInput.value.split(',').map(tag => tag.trim())
        : [];
      
      // Get the active entry ID if editing
      const activeEntryId = this.container.dataset.activeEntryId;
      
      // Prepare post data
      const postData = {
        type: 'wiki',
        title: titleInput.value.trim(),
        content: content,
        tags: tags
      };
      
      // If editing, add the custom ID
      if (activeEntryId) {
        postData.customId = activeEntryId;
        
        // First delete the existing post
        this.rdfModel.deletePost(activeEntryId);
      }
      
      // Create post in RDF model
      const postId = this.rdfModel.createPost(postData);
      
      // Try to sync with endpoint
      this.rdfModel.syncWithEndpoint()
        .catch(error => {
          console.warn('Wiki entry saved locally but failed to sync with endpoint', error);
        });
      
      if (!isAutoSave) {
        // Reset form
        titleInput.value = '';
        this.editor.setValue('');
        if (tagsInput) tagsInput.value = '';
        
        // Clear active entry ID
        delete this.container.dataset.activeEntryId;
        
        showNotification('Wiki entry saved successfully', 'success');
      } else {
        showNotification('Wiki entry auto-saved', 'info');
      }
      
      // Refresh wiki entries list
      this.loadWikiEntries();
      
    } catch (error) {
      console.error('Error saving wiki entry:', error);
      showNotification('Failed to save wiki entry: ' + error.message, 'error');
    }
  }

  /**
   * Load and display wiki entries
   */
  loadWikiEntries() {
    const entriesList = this.container.querySelector('.entries-list');
    if (!entriesList || !this.rdfModel) return;
    
    // Clear existing entries
    entriesList.innerHTML = '';
    
    try {
      // Get wiki posts from RDF model
      const entries = this.rdfModel.getPosts({
        type: 'wiki',
        limit: 10 // Show only the 10 most recent entries
      });
      
      if (entries.length === 0) {
        entriesList.innerHTML = '<p>No wiki entries found.</p>';
        return;
      }
      
      // Create entries list
      const list = document.createElement('ul');
      list.className = 'entries-list';
      
      entries.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'entry-item';
        
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
        `;
        
        // Add click handlers for buttons
        const viewButton = item.querySelector('.view-entry');
        if (viewButton) {
          viewButton.addEventListener('click', () => this.viewEntry(entry.id));
        }
        
        const editButton = item.querySelector('.edit-entry');
        if (editButton) {
          editButton.addEventListener('click', () => this.editEntry(entry.id));
        }
        
        const deleteButton = item.querySelector('.delete-entry');
        if (deleteButton) {
          deleteButton.addEventListener('click', () => this.deleteEntry(entry.id));
        }
        
        list.appendChild(item);
      });
      
      entriesList.appendChild(list);
      
    } catch (error) {
      console.error('Error loading wiki entries:', error);
      entriesList.innerHTML = `<p class="error">Error loading entries: ${error.message}</p>`;
    }
  }

  /**
   * View a wiki entry in detail
   * @param {string} id - Entry ID to view
   */
  viewEntry(id) {
    try {
      // Get post from RDF model
      const posts = this.rdfModel.getPosts();
      const post = posts.find(p => p.id === id);
      
      if (!post) {
        showNotification('Entry not found', 'error');
        return;
      }
      
      // Create entry view
      const entryView = document.createElement('div');
      entryView.className = 'entry-detail';
      
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
      `;
      
      // Replace entries list with entry view
      const entriesContainer = this.container.querySelector('.wiki-entries');
      if (entriesContainer) {
        entriesContainer.innerHTML = '';
        entriesContainer.appendChild(entryView);
      }
      
      // Add back button handler
      entryView.querySelector('.back-button').addEventListener('click', () => {
        this.loadWikiEntries();
      });
      
      // Add edit button handler
      entryView.querySelector('.edit-entry').addEventListener('click', () => {
        this.editEntry(post.id);
      });
      
    } catch (error) {
      console.error('Error viewing wiki entry:', error);
      showNotification('Error viewing entry: ' + error.message, 'error');
    }
  }

  /**
   * Edit an existing wiki entry
   * @param {string} id - Entry ID to edit
   */
  editEntry(id) {
    try {
      // Get post from RDF model
      const posts = this.rdfModel.getPosts();
      const post = posts.find(p => p.id === id);
      
      if (!post) {
        showNotification('Entry not found', 'error');
        return;
      }
      
      // Get form elements
      const titleInput = this.container.querySelector('#wiki-title');
      const tagsInput = this.container.querySelector('#wiki-tags');
      
      if (!titleInput) {
        showNotification('Editor not found', 'error');
        return;
      }
      
      // Populate form with post data
      titleInput.value = post.title || '';
      if (tagsInput) {
        tagsInput.value = post.tags.join(', ');
      }
      
      // Set editor content
      this.editor.setValue(post.content || '');
      
      // Set active entry ID
      this.container.dataset.activeEntryId = post.id;
      
      // Scroll to editor
      this.container.querySelector('.wiki-editor').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      showNotification('Editing entry: ' + post.title, 'info');
      
    } catch (error) {
      console.error('Error editing wiki entry:', error);
      showNotification('Error editing entry: ' + error.message, 'error');
    }
  }

  /**
   * Delete a wiki entry
   * @param {string} id - Entry ID to delete
   */
  deleteEntry(id) {
    try {
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
        return;
      }
      
      // Delete from RDF model
      const success = this.rdfModel.deletePost(id);
      
      if (success) {
        showNotification('Entry deleted successfully', 'success');
        
        // Refresh entries list
        this.loadWikiEntries();
        
        // Clear form if editing this entry
        if (this.container.dataset.activeEntryId === id) {
          this.clearEditor();
        }
      } else {
        showNotification('Failed to delete entry', 'error');
      }
      
    } catch (error) {
      console.error('Error deleting wiki entry:', error);
      showNotification('Error deleting entry: ' + error.message, 'error');
    }
  }

  /**
   * Clear the editor form
   */
  clearEditor() {
    const titleInput = this.container.querySelector('#wiki-title');
    const tagsInput = this.container.querySelector('#wiki-tags');
    
    if (titleInput) {
      titleInput.value = '';
    }
    
    if (this.editor) {
      this.editor.setValue('');
    }
    
    if (tagsInput) {
      tagsInput.value = '';
    }
    
    // Clear active entry ID
    delete this.container.dataset.activeEntryId;
  }

  /**
   * Wrap selected text with prefix and suffix
   * @param {string} prefix - Text to add before selection
   * @param {string} suffix - Text to add after selection
   */
  wrapText(prefix, suffix) {
    if (!this.editor) return;
    
    const selection = this.editor.getSelection();
    if (selection) {
      this.editor.replaceSelection(prefix + selection + suffix);
    } else {
      const cursor = this.editor.getCursor();
      this.editor.replaceRange(prefix + suffix, cursor);
      this.editor.setCursor({
        line: cursor.line,
        ch: cursor.ch + prefix.length
      });
    }
    this.editor.focus();
  }

  /**
   * Prepend each line in selection with text
   * @param {string} text - Text to prepend
   */
  prependLine(text) {
    if (!this.editor) return;
    
    const selection = this.editor.getSelection();
    const cursor = this.editor.getCursor();
    
    if (selection) {
      const lines = selection.split('\n');
      const newText = lines.map(line => text + line).join('\n');
      this.editor.replaceSelection(newText);
    } else {
      const line = this.editor.getLine(cursor.line) || '';
      this.editor.replaceRange(text + line, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
      this.editor.setCursor({ line: cursor.line, ch: text.length + cursor.ch });
    }
    this.editor.focus();
  }

  /**
   * Insert a link at cursor position
   */
  insertLink() {
    if (!this.editor) return;
    
    const selection = this.editor.getSelection();
    const url = prompt('Enter URL:', 'https://');
    
    if (url) {
      if (selection) {
        this.editor.replaceSelection(`[${selection}](${url})`);
      } else {
        const text = prompt('Enter link text:', 'Link text');
        if (text) {
          this.editor.replaceSelection(`[${text}](${url})`);
        }
      }
    }
    this.editor.focus();
  }

  /**
   * Insert an image at cursor position
   */
  insertImage() {
    if (!this.editor) return;
    
    const url = prompt('Enter image URL:', 'https://');
    
    if (url) {
      const alt = prompt('Enter image description:', 'Image');
      if (alt) {
        this.editor.replaceSelection(`![${alt}](${url})`);
      }
    }
    this.editor.focus();
  }

  /**
   * Unmount the plugin
   * @returns {WikiPlugin} Plugin instance
   */
  async unmount() {
    await super.unmount();
    
    // Save any unsaved changes
    const titleInput = this.container.querySelector('#wiki-title');
    if (titleInput && titleInput.value && this.editor && this.editor.getValue()) {
      this.saveWikiEntry(true);
    }
    
    // Hide the container
    if (this.container) {
      this.container.style.display = 'none';
    }
    
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    return this;
  }

  /**
   * Destroy the plugin
   * @returns {boolean} Success status
   */
  async destroy() {
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    return super.destroy();
  }
}

// Export the plugin instance
export default new WikiPlugin();
