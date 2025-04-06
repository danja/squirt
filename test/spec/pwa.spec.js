// test/spec/pwa.spec.js
import { registerServiceWorker, askNotificationPermission } from '../../src/app.js';

describe('PWA Functionality', () => {
  let originalServiceWorker;
  let mockRegistration;
  let mockSync;
  
  beforeEach(() => {
    // Save original navigator.serviceWorker
    originalServiceWorker = global.navigator.serviceWorker;
    
    // Create mocks
    mockSync = {
      register: jest.fn().mockResolvedValue(undefined)
    };
    
    mockRegistration = {
      scope: 'https://example.com/',
      sync: mockSync,
      pushManager: {}
    };
    
    // Mock navigator.serviceWorker
    global.navigator.serviceWorker = {
      register: jest.fn().mockResolvedValue(mockRegistration)
    };
    
    // Mock Notification
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted')
    };
    
    // Mock window
    global.addEventListener = jest.fn();
    
    // Mock console
    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });
  
  afterEach(() => {
    // Restore original navigator.serviceWorker
    global.navigator.serviceWorker = originalServiceWorker;
    
    // Restore global objects
    delete global.Notification;
    
    // Clear mocks
    jest.clearAllMocks();
  });
  
  it('should register service worker when available', async () => {
    // Create a load event listener callback
    let loadCallback;
    global.addEventListener.mockImplementation((event, callback) => {
      if (event === 'load') {
        loadCallback = callback;
      }
    });
    
    // Call registerServiceWorker
    registerServiceWorker();
    
    // Verify addEventListener was called
    expect(global.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    
    // Simulate load event
    await loadCallback();
    
    // Verify service worker registration was called
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/service-worker.js');
    
    // Verify background sync was registered
    expect(mockSync.register).toHaveBeenCalledWith('sync-posts');
    
    // Verify console log
    expect(console.log).toHaveBeenCalledWith('Service Worker registered with scope:', 'https://example.com/');
  });
  
  it('should handle service worker registration error', async () => {
    // Create a load event listener callback
    let loadCallback;
    global.addEventListener.mockImplementation((event, callback) => {
      if (event === 'load') {
        loadCallback = callback;
      }
    });
    
    // Mock registration error
    const mockError = new Error('Registration failed');
    navigator.serviceWorker.register.mockRejectedValue(mockError);
    
    // Call registerServiceWorker
    registerServiceWorker();
    
    // Simulate load event
    await loadCallback();
    
    // Verify service worker registration was called
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/service-worker.js');
    
    // Verify console error
    expect(console.error).toHaveBeenCalledWith('Service Worker registration failed:', mockError);
  });
  
  it('should request notification permission when not already granted', () => {
    // Create a click event listener callback
    let clickCallback;
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'click') {
        clickCallback = callback;
      }
    });
    
    // Call askNotificationPermission
    askNotificationPermission();
    
    // Verify document.addEventListener was called
    expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), { once: false });
    
    // Simulate click event
    clickCallback();
    
    // Verify Notification.requestPermission was called
    expect(Notification.requestPermission).toHaveBeenCalled();
  });
  
  it('should not request notification permission when already granted', () => {
    // Set permission to granted
    Notification.permission = 'granted';
    
    // Call askNotificationPermission
    askNotificationPermission();
    
    // Verify document.addEventListener was not called
    expect(document.addEventListener).not.toHaveBeenCalled();
    
    // Verify console log
    expect(console.log).toHaveBeenCalledWith('Notification permission already granted');
  });
  
  it('should not request notification permission when already denied', () => {
    // Set permission to denied
    Notification.permission = 'denied';
    
    // Call askNotificationPermission
    askNotificationPermission();
    
    // Verify document.addEventListener was not called
    expect(document.addEventListener).not.toHaveBeenCalled();
    
    // Verify console warning
    expect(console.warn).toHaveBeenCalledWith('Notification permission was previously denied');
  });
});
