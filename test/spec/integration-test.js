// test/spec/integration.spec.js
import { services, initializeApp } from '../../src/app.js';
import { store } from '../../src/core/state/index.js';
import { eventBus, EVENTS } from '../../src/core/events/event-bus.js';

// Mock dependencies
jest.mock('../../src/core/state/index.js', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn()
  },
  createStore: jest.fn()
}));

jest.mock('../../src/services/storage/storage-service.js', () => ({
  createStorageService: jest.fn().mockReturnValue({
    getItem: jest.fn(),
    setItem: jest.fn()
  }),
  storageService: {
    getItem: jest.fn(),
    setItem: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    endpoints: [
      { 
        name: 'Test Query',
        type: 'query',
        url: 'http://test-endpoint/query',
        credentials: null
      }
    ]
  })
});

// Mock DOM elements
document.body.innerHTML = `
  <header>
    <nav>
      <a href="#" data-view="post-view">Post</a>
      <a href="#" data-view="settings-view">Settings</a>
    </nav>
  </header>
  <main>
    <div id="post-view" class="view"></div>
    <div id="settings-view" class="view hidden"></div>
  </main>
  <div class="notifications-container"></div>
`;

describe('Application Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset event bus
    for (const key in EVENTS) {
      eventBus.removeAllListeners(EVENTS[key]);
    }
    
    // Mock window.location
    delete window.location;
    window.location = { 
      hash: '#post',
      assign: jest.fn()
    };
  });
  
  it('should initialize the application successfully', async () => {
    // Listen for app initialized event
    const initHandler = jest.fn();
    eventBus.on(EVENTS.APP_INITIALIZED, initHandler);
    
    // Run initialization
    const result = await initializeApp();
    
    // Verify initialization was successful
    expect(result.success).toBe(true);
    
    // Verify event was emitted
    expect(initHandler).toHaveBeenCalled();
    
    // Verify services were initialized
    expect(services.storage).toBeDefined();
  });
  
  it('should create and use RDF service for post management', async () => {
    // Mock successful app initialization
    await initializeApp();
    
    // Mock RDF service
    services.rdf = {
      createPost: jest.fn().mockReturnValue('post-123'),
      getPosts: jest.fn().mockReturnValue([
        { id: 'post-123', title: 'Test Post', content: 'Test content' }
      ])
    };
    
    // Create a post
    const postId = services.rdf.createPost({
      type: 'link',
      title: 'Test Post',
      content: 'Test content',
      url: 'https://example.com'
    });
    
    // Verify post was created
    expect(postId).toBe('post-123');
    expect(services.rdf.createPost).toHaveBeenCalledWith({
      type: 'link',
      title: 'Test Post',
      content: 'Test content',
      url: 'https://example.com'
    });
    
    // Get posts
    const posts = services.rdf.getPosts();
    
    // Verify posts were retrieved
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Test Post');
  });
  
  it('should handle endpoint status changes', async () => {
    // Mock successful app initialization
    await initializeApp();
    
    // Mock endpoints service
    services.endpoints = {
      checkEndpointsHealth: jest.fn().mockResolvedValue({
        success: true,
        anyActive: true,
        results: [
          {
            url: 'http://test-endpoint/query',
            isActive: true,
            type: 'query'
          }
        ]
      }),
      getActiveEndpoint: jest.fn().mockReturnValue({
        url: 'http://test-endpoint/query',
        type: 'query',
        status: 'active'
      })
    };
    
    // Listen for status change event
    const statusHandler = jest.fn();
    eventBus.on(EVENTS.ENDPOINTS_STATUS_CHECKED, statusHandler);
    
    // Check endpoints health
    const result = await services.endpoints.checkEndpointsHealth();
    
    // Verify check was successful
    expect(result.success).toBe(true);
    expect(result.anyActive).toBe(true);
    
    // Request a SPARQL endpoint
    const endpoint = services.endpoints.getActiveEndpoint('query');
    
    // Verify endpoint was returned
    expect(endpoint).toBeDefined();
    expect(endpoint.url).toBe('http://test-endpoint/query');
    expect(endpoint.status).toBe('active');
  });
  
  it('should show notifications', async () => {
    // Mock successful app initialization
    await initializeApp();
    
    // Mock storage service
    services.storage = {
      getItem: jest.fn(),
      setItem: jest.fn()
    };
    
    // Mock notifications container
    const container = document.querySelector('.notifications-container');
    
    // Make window.showNotification available
    window.showNotification = (message, type, duration) => {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      
      // Add to container
      container.appendChild(notification);
      
      // Remove after duration
      if (duration) {
        setTimeout(() => notification.remove(), duration);
      }
      
      return notification;
    };
    
    // Show a notification
    const notification = window.showNotification('Test notification', 'info', 0);
    
    // Verify notification was added to DOM
    expect(container.querySelector('.notification')).not.toBeNull();
    expect(container.querySelector('.notification').textContent).toBe('Test notification');
    
    // Clean up
    notification.remove();
  });
});
