import { eventBus, EVENTS } from 'evb'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { showNotification } from '../notifications/notifications.js'
import { RDFModel } from '../../domain/rdf/model.js'

/**
 * Initialize the Chat view
 * @returns {Object} View handler with update and cleanup methods
 */
export function initView() {
    try {
        console.log('Initializing Chat view')

        const view = document.getElementById('chat-view')
        if (!view) {
            throw new Error('Chat view element not found')
        }

        // Create chat interface if not already present
        if (!view.querySelector('.chat-container')) {
            createChatInterface(view)
        }

        // Set up event listeners for the chat view
        setupEventListeners()

        // Load existing messages
        loadMessages()

        return {
            update() {
                console.log('Updating Chat view')
                loadMessages()
            },

            cleanup() {
                console.log('Cleaning up Chat view')
                // Remove any event listeners if needed
            }
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing Chat view'
        })

        return {}
    }
}

/**
 * Create the chat interface elements
 * @param {HTMLElement} container - The container element
 */
function createChatInterface(container) {
    container.innerHTML = `
        <h2>Chat</h2>
        <div class="chat-container">
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-container">
                <textarea id="chat-input" placeholder="Type a message..."></textarea>
                <button id="send-message" class="button-primary">Send</button>
            </div>
        </div>
    `

    // Add styles for the chat interface if not already present
    if (!document.getElementById('chat-styles')) {
        const styleElement = document.createElement('style')
        styleElement.id = 'chat-styles'
        styleElement.textContent = `
            .chat-container {
                display: flex;
                flex-direction: column;
                height: 500px;
                background: var(--card-background);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow);
                overflow: hidden;
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: var(--spacing-md);
                display: flex;
                flex-direction: column;
            }

            .chat-message {
                margin-bottom: var(--spacing-md);
                padding: var(--spacing-sm) var(--spacing-md);
                border-radius: var(--border-radius);
                max-width: 80%;
            }

            .chat-message.outgoing {
                align-self: flex-end;
                background-color: var(--primary-color);
                color: white;
            }

            .chat-message.incoming {
                align-self: flex-start;
                background-color: var(--card-background);
                border: 1px solid var(--border-color);
            }

            .chat-message-content {
                word-break: break-word;
            }

            .chat-message-time {
                font-size: 0.75rem;
                opacity: 0.7;
                margin-top: var(--spacing-xs);
                text-align: right;
            }

            .chat-input-container {
                display: flex;
                padding: var(--spacing-md);
                border-top: 1px solid var(--border-color);
            }

            #chat-input {
                flex: 1;
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: var(--spacing-sm);
                resize: none;
                min-height: 3rem;
            }

            #send-message {
                margin-left: var(--spacing-md);
                align-self: flex-end;
            }

            @media (max-width: 768px) {
                .chat-container {
                    height: calc(100vh - 200px);
                }

                .chat-message {
                    max-width: 90%;
                }
            }
        `
        document.head.appendChild(styleElement)
    }
}

/**
 * Set up event listeners for the chat view
 */
function setupEventListeners() {
    const sendButton = document.getElementById('send-message')
    const chatInput = document.getElementById('chat-input')

    if (sendButton && chatInput) {
        // Send message on button click
        sendButton.addEventListener('click', () => {
            sendMessage(chatInput.value)
        })

        // Send message on Enter key (without Shift)
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(chatInput.value)
            }
        })
    }

    // Listen for new posts from other components
    eventBus.on(EVENTS.POST_CREATED, (post) => {
        if (post.type === 'chat') {
            addMessageToUI(post, false)
        }
    })
}

/**
 * Send a new chat message
 * @param {string} content - The message content
 */
function sendMessage(content) {
    if (!content || !content.trim()) {
        return
    }

    try {
        const chatInput = document.getElementById('chat-input')

        // Create post data for the message
        const postData = {
            type: 'chat',
            content: content.trim(),
            tags: ['chat'],
            created: new Date().toISOString()
        }

        // Create the post in the RDF model
        const postId = RDFModel.createPost(postData)

        // Clear the input field
        if (chatInput) {
            chatInput.value = ''
        }

        // Add message to UI
        addMessageToUI({
            id: postId,
            ...postData
        }, true)

        // Try to sync with endpoint
        RDFModel.syncWithEndpoint().catch(error => {
            console.warn('Message saved locally but failed to sync with endpoint', error)
        })

    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Sending chat message'
        })
    }
}

/**
 * Add a message to the UI
 * @param {Object} message - The message object
 * @param {boolean} outgoing - Whether the message is outgoing (from the current user)
 */
function addMessageToUI(message, outgoing = false) {
    const chatMessages = document.getElementById('chat-messages')
    if (!chatMessages) return

    const messageElement = document.createElement('div')
    messageElement.className = `chat-message ${outgoing ? 'outgoing' : 'incoming'}`
    messageElement.dataset.id = message.id

    const content = document.createElement('div')
    content.className = 'chat-message-content'
    content.textContent = message.content

    const time = document.createElement('div')
    time.className = 'chat-message-time'
    time.textContent = new Date(message.created).toLocaleTimeString()

    messageElement.appendChild(content)
    messageElement.appendChild(time)

    chatMessages.appendChild(messageElement)

    // Scroll to the bottom to show the new message
    chatMessages.scrollTop = chatMessages.scrollHeight
}

/**
 * Load existing messages from the RDF store
 */
function loadMessages() {
    try {
        const chatMessages = document.getElementById('chat-messages')
        if (!chatMessages) return

        // Clear existing messages
        chatMessages.innerHTML = ''

        // Get chat posts from RDF store
        const messages = RDFModel.getPosts({
            type: 'chat',
            limit: 50
        })

        // Sort messages by creation time
        messages.sort((a, b) => new Date(a.created) - new Date(b.created))

        // Add messages to UI
        messages.forEach(message => {
            // For demo purposes, alternate between incoming and outgoing messages
            // In a real app, you would check the message sender
            const isOutgoing = message.created % 2 === 0
            addMessageToUI(message, isOutgoing)
        })

    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Loading chat messages'
        })
    }
}