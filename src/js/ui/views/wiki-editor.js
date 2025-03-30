/**
 * Wiki Editor component using CodeMirror
 */
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/theme/monokai.css';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/display/placeholder';
import { marked } from 'marked';
import { rdfModel } from '../../services/rdf/rdf-model.js';
import { showNotification } from '../components/notifications.js';

let editor = null;
let preview = null;

/**
 * Initialize the Wiki editor component
 */
export function initializeWikiEditor() {
  const wikiContent = document.getElementById('wiki-content');
  const previewContainer = document.querySelector('.wiki-preview');
  const saveButton = document.getElementById('save-wiki');
  
  if (!wikiContent) {
    console.warn('Wiki content element not found');
    return;
  }
  
  // Create preview container if it doesn't exist
  if (!previewContainer) {
    preview = document.createElement('div');
    preview.className = 'wiki-preview';
    preview.innerHTML = '<h3>Preview</h3><div class="preview-content"></div>';
    
    const wikiEditor = document.querySelector('.wiki-editor');
    if (wikiEditor) {
      wikiEditor.appendChild(preview);
    }
  } else {
    preview = previewContainer;
  }
  
  // Initialize CodeMirror editor
  editor = CodeMirror.fromTextArea(wikiContent, {
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
  
  // Add change event listener for live preview
  editor.on('change', updatePreview);
  
  // Add event listener for save button
  if (saveButton) {
    saveButton.addEventListener('click', saveWikiEntry);
  }
  
  // Add custom toolbar
  addToolbar();
  
  // Initial preview update
  updatePreview();
}

/**
 * Update the preview with the current content
 */
function updatePreview() {
  const content = editor.getValue();
  const previewContent = preview.querySelector('.preview-content');
  
  if (previewContent) {
    // Render Markdown to HTML using marked
    previewContent.innerHTML = marked(content);
    
    // Syntax highlighting for code blocks
    previewContent.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) {
        window.hljs.highlightBlock(block);
      }
    });
  }
}

/**
 * Add a toolbar with common markdown formatting buttons
 */
function addToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  
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
  
  // Add toolbar before the editor
  const editorContainer = editor.getWrapperElement().parentNode;
  editorContainer.insertBefore(toolbar, editor.getWrapperElement());
  
  // Add toolbar styles
  if (!document.getElementById('editor-toolbar-styles')) {
    const style = document.createElement('style');
    style.id = 'editor-toolbar-styles';
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
      
      .wiki-preview {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
      }
      
      .preview-content {
        font-family: system-ui, -apple-system, sans-serif;
        line-height: 1.6;
      }
      
      .preview-content h1, 
      .preview-content h2, 
      .preview-content h3 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      
      .preview-content p {
        margin-bottom: 1em;
      }
      
      .preview-content ul, 
      .preview-content ol {
        padding-left: 2em;
        margin-bottom: 1em;
      }
      
      .preview-content blockquote {
        border-left: 3px solid #ddd;
        margin-left: 0;
        padding-left: 1em;
        color: #777;
      }
      
      .preview-content code {
        font-family: monospace;
        background: #f0f0f0;
        padding: 2px 4px;
        border-radius: 3px;
      }
      
      .preview-content pre {
        background: #f0f0f0;
        padding: 1em;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      .preview-content img {
        max-width: 100%;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Wrap selected text with prefix and suffix
 */
function wrapText(prefix, suffix) {
  const selection = editor.getSelection();
  if (selection) {
    editor.replaceSelection(prefix + selection + suffix);
  } else {
    const cursor = editor.getCursor();
    editor.replaceRange(prefix + suffix, cursor);
    editor.setCursor({
      line: cursor.line,
      ch: cursor.ch + prefix.length
    });
  }
  editor.focus();
}

/**
 * Prepend each line in selection with text
 */
function prependLine(text) {
  const selection = editor.getSelection();
  const cursor = editor.getCursor();
  
  if (selection) {
    const lines = selection.split('\n');
    const newText = lines.map(line => text + line).join('\n');
    editor.replaceSelection(newText);
  } else {
    const line = editor.getLine(cursor.line);
    editor.replaceRange(text + line, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    editor.setCursor({ line: cursor.line, ch: text.length + cursor.ch });
  }
  editor.focus();
}

/**
 * Insert a link at cursor position
 */
function insertLink() {
  const selection = editor.getSelection();
  const url = prompt('Enter URL:', 'https://');
  
  if (url) {
    if (selection) {
      editor.replaceSelection(`[${selection}](${url})`);
    } else {
      const text = prompt('Enter link text:', 'Link text');
      if (text) {
        editor.replaceSelection(`[${text}](${url})`);
      }
    }
  }
  editor.focus();
}

/**
 * Insert an image at cursor position
 */
function insertImage() {
  const url = prompt('Enter image URL:', 'https://');
  
  if (url) {
    const alt = prompt('Enter image description:', 'Image');
    if (alt) {
      editor.replaceSelection(`![${alt}](${url})`);
    }
  }
  editor.focus();
}

/**
 * Save the current wiki entry
 */
function saveWikiEntry() {
  const titleInput = document.getElementById('wiki-title');
  const tagsInput = document.getElementById('wiki-tags');
  
  if (!titleInput || !titleInput.value.trim()) {
    showNotification('Please enter a title for your wiki entry', 'error');
    return;
  }
  
  const content = editor.getValue();
  if (!content.trim()) {
    showNotification('Please enter some content for your wiki entry', 'error');
    return;
  }
  
  const tags = tagsInput && tagsInput.value 
    ? tagsInput.value.split(',').map(tag => tag.trim())
    : [];
  
  try {
    // Create wiki post in RDF model
    const postId = rdfModel.createPost({
      type: 'wiki',
      title: titleInput.value.trim(),
      content: content,
      tags: tags
    });
    
    // Try to sync with endpoint
    rdfModel.syncWithEndpoint()
      .catch(error => {
        console.warn('Wiki entry saved locally but failed to sync with endpoint', error);
      });
    
    // Reset form
    titleInput.value = '';
    editor.setValue('');
    if (tagsInput) tagsInput.value = '';
    
    showNotification('Wiki entry saved successfully', 'success');
    
    // Refresh wiki entries list
    loadWikiEntries();
  } catch (error) {
    console.error('Error saving wiki entry:', error);
    showNotification('Failed to save wiki entry: ' + error.message, 'error');
  }
}

/**
 * Load and display wiki entries
 */
function loadWikiEntries() {
  const entriesList = document.querySelector('.wiki-entries');
  if (!entriesList) return;
  
  // Clear existing entries
  entriesList.innerHTML = '<h3>Recent Entries</h3>';
  
  try {
    // Get wiki posts from RDF model
    const entries = rdfModel.getPosts({
      type: 'wiki',
      limit: 10 // Show only the 10 most recent entries
    });
    
    if (entries.length === 0) {
      entriesList.innerHTML += '<p>No wiki entries found.</p>';
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
        <button class="view-entry" data-id="${entry.id}">View</button>
        <button class="edit-entry" data-id="${entry.id}">Edit</button>
      `;
      
      // Add click handlers for buttons
      item.querySelector('.view-entry').addEventListener('click', () => viewEntry(entry.id));
      item.querySelector('.edit-entry').addEventListener('click', () => editEntry(entry.id));
      
      list.appendChild(item);
    });
    
    entriesList.appendChild(list);
    
    // Add entries list styles
    if (!document.getElementById('entries-list-styles')) {
      const style = document.createElement('style');
      style.id = 'entries-list-styles';
      style.textContent = `
        .entries-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .entry-item {
          padding: 15px;
          margin-bottom: 15px;
          border: 1px solid #eee;
          border-radius: 4px;
          background: white;
        }
        
        .entry-title {
          margin: 0 0 10px 0;
          color: var(--primary-color, #3498db);
        }
        
        .entry-preview {
          margin: 0 0 10px 0;
          color: #666;
        }
        
        .entry-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 0.875rem;
          color: #999;
        }
        
        .entry-item button {
          padding: 5px 10px;
          margin-right: 5px;
          background: var(--primary-color, #3498db);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .entry-item button:hover {
          opacity: 0.9;
        }
      `;
      document.head.appendChild(style);
    }
  } catch (error) {
    console.error('Error loading wiki entries:', error);
    entriesList.innerHTML += `<p class="error">Error loading entries: ${error.message}</p>`;
  }
}

/**
 * View a wiki entry in detail
 */
function viewEntry(id) {
  try {
    // Get wiki entries container
    const entriesContainer = document.querySelector('.wiki-entries');
    if (!entriesContainer) return;
    
    // Get post from RDF model
    const posts = rdfModel.getPosts();
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
      <div class="entry-content">${marked(post.content)}</div>
    `;
    
    // Replace entries list with entry view
    entriesContainer.innerHTML = '';
    entriesContainer.appendChild(entryView);
    
    // Add back button handler
    entryView.querySelector('.back-button').addEventListener('click', loadWikiEntries);
    
    // Add edit button handler
    entryView.querySelector('.edit-entry').addEventListener('click', () => editEntry(post.id));
    
    // Syntax highlighting for code blocks
    entryView.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) {
        window.hljs.highlightBlock(block);
      }
    });
    
    // Add entry detail styles
    if (!document.getElementById('entry-detail-styles')) {
      const style = document.createElement('style');
      style.id = 'entry-detail-styles';
      style.textContent = `
        .entry-detail {
          padding: 20px;
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .entry-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .entry-toolbar button {
          padding: 5px 10px;
          background: var(--primary-color, #3498db);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .entry-detail .entry-title {
          margin: 0 0 10px 0;
          font-size: 2rem;
          color: var(--text-color, #2c3e50);
        }
        
        .entry-detail .entry-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
          color: #777;
        }
        
        .entry-detail .entry-content {
          line-height: 1.6;
          font-size: 1.1rem;
        }
        
        .entry-detail .entry-content h1,
        .entry-detail .entry-content h2,
        .entry-detail .entry-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .entry-detail .entry-content p {
          margin-bottom: 1em;
        }
        
        .entry-detail .entry-content img {
          max-width: 100%;
        }
        
        .entry-detail .entry-content blockquote {
          border-left: 3px solid #ddd;
          margin-left: 0;
          padding-left: 1em;
          color: #777;
        }
      `;
      document.head.appendChild(style);
    }
  } catch (error) {
    console.error('Error viewing wiki entry:', error);
    showNotification('Error viewing entry: ' + error.message, 'error');
  }
}

/**
 * Edit an existing wiki entry
 */
function editEntry(id) {
  try {
    // Get post from RDF model
    const posts = rdfModel.getPosts();
    const post = posts.find(p => p.id === id);
    
    if (!post) {
      showNotification('Entry not found', 'error');
      return;
    }
    
    // Get form elements
    const titleInput = document.getElementById('wiki-title');
    const tagsInput = document.getElementById('wiki-tags');
    
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
    editor.setValue(post.content || '');
    
    // Scroll to editor
    document.querySelector('.wiki-editor').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    // Update save button to handle updates
    const saveButton = document.getElementById('save-wiki');
    if (saveButton) {
      // Remove existing click listeners
      const newSaveButton = saveButton.cloneNode(true);
      saveButton.parentNode.replaceChild(newSaveButton, saveButton);
      
      // Add new click listener for updating
      newSaveButton.addEventListener('click', () => updateWikiEntry(id));
    }
    
    showNotification('Editing entry: ' + post.title, 'info');
  } catch (error) {
    console.error('Error editing wiki entry:', error);
    showNotification('Error editing entry: ' + error.message, 'error');
  }
}

/**
 * Update an existing wiki entry
 */
function updateWikiEntry(id) {
  const titleInput = document.getElementById('wiki-title');
  const tagsInput = document.getElementById('wiki-tags');
  
  if (!titleInput || !titleInput.value.trim()) {
    showNotification('Please enter a title for your wiki entry', 'error');
    return;
  }
  
  const content = editor.getValue();
  if (!content.trim()) {
    showNotification('Please enter some content for your wiki entry', 'error');
    return;
  }
  
  const tags = tagsInput && tagsInput.value 
    ? tagsInput.value.split(',').map(tag => tag.trim())
    : [];
  
  try {
    // First delete the existing post
    rdfModel.deletePost(id);
    
    // Then create a new post with the same ID (simulating an update)
    const postData = {
      type: 'wiki',
      title: titleInput.value.trim(),
      content: content,
      tags: tags
    };
    
    // Add custom ID field for the RDF model to use
    postData.customId = id;
    
    // Create updated wiki post
    rdfModel.createPost(postData);
    
    // Try to sync with endpoint
    rdfModel.syncWithEndpoint()
      .catch(error => {
        console.warn('Wiki entry updated locally but failed to sync with endpoint', error);
      });
    
    // Reset form
    titleInput.value = '';
    editor.setValue('');
    if (tagsInput) tagsInput.value = '';
    
    // Reset save button to handle new entries
    const saveButton = document.getElementById('save-wiki');
    if (saveButton) {
      // Remove existing click listeners
      const newSaveButton = saveButton.cloneNode(true);
      saveButton.parentNode.replaceChild(newSaveButton, saveButton);
      
      // Add new click listener for saving
      newSaveButton.addEventListener('click', saveWikiEntry);
    }
    
    showNotification('Wiki entry updated successfully', 'success');
    
    // Refresh wiki entries list
    loadWikiEntries();
  } catch (error) {
    console.error('Error updating wiki entry:', error);
    showNotification('Failed to update wiki entry: ' + error.message, 'error');
  }
}

// Initialize wiki editor when the view is shown
document.addEventListener('routeChange', (e) => {
  if (e.detail.to === 'wiki-view') {
    setTimeout(() => {
      initializeWikiEditor();
      loadWikiEntries();
    }, 100);
  }
});