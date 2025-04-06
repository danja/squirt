// test/spec/chat-view.spec.js
import { initView } from '../../src/ui/views/chat-view.js';
import { eventBus, EVENTS } from '../../src/core/events/event-bus.js';
import { rdfModel } from '../../src/domain/rdf/model.js';

// Mock dependencies
jest.mock('../../src/core/events/event-bus.js', () => ({
  eventBus: {
    on: jest.fn(),
    emit: jest.fn()
  },
  EVENTS: {
    POST_CREATED: 'rdf:post:created'
  }
}));

jest.mock('../../src/core/errors/index.js', () => ({
  errorHandler: {
    handle: jest.fn()
  }
}));

jest.mock('../../src/core/state/index.js', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn()
  }
}));

jest.mock('../../src/domain/rdf/model.js', () => ({
  rdfModel: {
    createPost: jest.fn().mockReturnValue('test-post-id'),
    getPosts: jest.fn().mockReturnValue([
      {
        id: 'post-1',
        type: 'chat',
        content: 'Test message 1',
        created: '2023-01-01T12:00:00.000Z'
      },
      {
        id: 'post-2',
        type: 'chat',
        content: 'Test message 2',
        created: '2023-01-01T12:01:00.000Z'
      }
    ]),
    syncWithEndpoint: jest.fn().mockResolvedValue(true)
  }
}));

describe('Chat View', () => {
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="chat-view">
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-container">
          <textarea id="chat-input"></textarea>
          <button id="send-message">Send</button>
        </div>
      </div>
    `;
    
    // Clear mocks
    jest.clearAllMocks();
  });
  
  it('should initialize the chat view', () => {
    const result = initView();
    
    expect(result).toBeDefined();
    expect(result.update).toBeDefined();
    expect(result.cleanup).toBeDefined();
    
    // Event listener should be registered
    expect(eventBus.on).toHaveBeenCalledWith(EVENTS.POST_CREATED, expect.any(Function));
    
    // Messages should be loaded
    expect(rdfModel.getPosts).toHaveBeenCalledWith({
      type: 'chat',
      limit: 50
    });
    
    // Check if messages are rendered
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.children.length).toBe(2);
  });
  
  it('should send a message when the send button is clicked', () => {
    // Initialize view
    initView();
    
    // Set input value
    const chatInput = document.getElementById('chat-input');
    chatInput.value = 'New test message';
    
    // Click send button
    const sendButton = document.getElementById('send-message');
    sendButton.click();
    
    // Check if createPost was called with correct data
    expect(rdfModel.createPost).toHaveBeenCalledWith({
      type: 'chat',
      content: 'New test message',
      tags: ['chat'],
      created: expect.any(String)
    });
    
    // Input should be cleared
    expect(chatInput.value).toBe('');
    
    // Should attempt to sync with endpoint
    expect(rdfModel.syncWithEndpoint).toHaveBeenCalled();
    
    // Message should be added to UI
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.children.length).toBe(3);
  });
  
  it('should not send empty messages', () => {
    // Initialize view
    initView();
    
    // Set empty input value
    const chatInput = document.getElementById('chat-input');
    chatInput.value = '   ';
    
    // Click send button
    const sendButton = document.getElementById('send-message');
    sendButton.click();
    
    // createPost should not be called
    expect(rdfModel.createPost).not.toHaveBeenCalled();
    
    // No new messages should be added
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.children.length).toBe(2);
  });
  
  it('should add a new message when event is received', () => {
    // Initialize view
    initView();
    
    // Get the callback function registered with the event bus
    const postCreatedCallback = eventBus.on.mock.calls.find(
      call => call[0] === EVENTS.POST_CREATED
    )[1];
    
    // Simulate a new post event
    postCreatedCallback({
      id: 'post-3',
      type: 'chat',
      content: 'New message from event',
      created: '2023-01-01T12:02:00.000Z'
    });
    
    // Message should be added to UI
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.children.length).toBe(3);
    
    // Check the content of the new message
    const lastMessage = chatMessages.lastChild;
    expect(lastMessage.querySelector('.chat-message-content').textContent).toBe('New message from event');
  });
});
