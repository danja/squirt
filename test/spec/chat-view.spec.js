// test/spec/chat-view.spec.js
import { initView } from '../../src/ui/views/chat-view.js'
import { eventBus, EVENTS } from '../../src/core/events/event-bus.js'
import { rdfModel } from '../../src/domain/rdf/model.js'
import { errorHandler } from '../../src/core/errors/index.js'
import { store } from '../../src/core/state/index.js'
import { addPost } from '../../src/core/state/actions.js' // Import addPost action
import rdf from 'rdf-ext'

describe('Chat View', () => {
  let mockEventBusOnSpy
  let mockEventBusEmitSpy
  let mockErrorHandlerHandleSpy
  let mockStoreGetStateSpy
  let mockStoreDispatchSpy
  // let mockRdfModelCreatePostDataSpy // No longer needed here

  const initialMockPosts = [
    { id: 'post-1', type: 'chat', content: 'Test message 1', created: '2023-01-01T12:00:00.000Z', author: 'other' },
    { id: 'post-2', type: 'chat', content: 'Test message 2', created: '2023-01-01T12:01:00.000Z', author: 'currentUser' } // Added author for test
  ]

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chat-view">
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-container">
          <textarea id="chat-input"></textarea>
          <button id="send-message">Send</button>
        </div>
      </div>
    `
    mockEventBusOnSpy = spyOn(eventBus, 'on')
    mockEventBusEmitSpy = spyOn(eventBus, 'emit')
    mockErrorHandlerHandleSpy = spyOn(errorHandler, 'handle')
    // Mock store methods
    mockStoreGetStateSpy = spyOn(store, 'getState').and.returnValue({ posts: initialMockPosts }) // Provide initial state
    mockStoreDispatchSpy = spyOn(store, 'dispatch')
    // Don't spy on rdfModel methods here unless specifically testing data creation
  })

  it('should initialize the chat view and load messages from store', () => {
    const result = initView()
    expect(result).toBeDefined()
    expect(mockStoreGetStateSpy).toHaveBeenCalled() // loadMessages calls getState

    // Check rendering based on mock state
    const chatMessages = document.getElementById('chat-messages')
    expect(chatMessages.children.length).toBe(2) // Expect 2 messages from initial state
    // Optional: Check if classes (incoming/outgoing) match mock authors
    expect(chatMessages.children[0].classList.contains('incoming')).toBe(true)
    expect(chatMessages.children[1].classList.contains('outgoing')).toBe(true)

    expect(mockEventBusOnSpy).toHaveBeenCalledWith(EVENTS.POST_CREATED, jasmine.any(Function)) // Check event listener still attached
    // Check subscribe was called
    expect(store.subscribe).toHaveBeenCalledWith(jasmine.any(Function)) // Check subscribe called
  })

  it('should dispatch addPost action when sending a message', async () => {
    initView()
    const chatInput = document.getElementById('chat-input')
    const sendButton = document.getElementById('send-message')
    chatInput.value = 'New test message'
    sendButton.click()

    // Check if addPost action was dispatched
    expect(mockStoreDispatchSpy).toHaveBeenCalledWith(addPost(jasmine.objectContaining({
      // id: jasmine.stringMatching(/^temp-/), // Check temporary ID format
      type: 'chat',
      content: 'New test message',
      tags: ['chat'],
      created: jasmine.any(String)
    })))

    expect(chatInput.value).toBe('') // Input cleared

    // Check optimistic UI update (addMessageToUI called by sendMessage)
    const chatMessagesAfterSend = document.getElementById('chat-messages')
    expect(chatMessagesAfterSend.children.length).toBe(3) // 2 initial + 1 optimistic
    expect(chatMessagesAfterSend.lastChild.classList.contains('outgoing')).toBe(true)
    expect(chatMessagesAfterSend.lastChild.querySelector('.chat-message-content').textContent).toBe('New test message')
  })

  it('should not dispatch addPost for empty messages', () => {
    initView()
    const chatInput = document.getElementById('chat-input')
    const sendButton = document.getElementById('send-message')
    chatInput.value = '   '
    sendButton.click()

    expect(mockStoreDispatchSpy).not.toHaveBeenCalled() // Dispatch should NOT be called
    expect(document.getElementById('chat-messages').children.length).toBe(2) // Only initial messages
  })

  // Test for event handling might need rework depending on whether it uses eventBus or store subscription
  // If relying on store subscription, this test might be redundant or needs to simulate a state change
  // it('should add a new message when event is received', () => { ... }); 

})
