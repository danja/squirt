// test/spec/pwa.spec.js
import { registerServiceWorker, askNotificationPermission } from '../../src/app.js';
import fs from 'fs';
import path from 'path';

describe('PWA Runtime Functionality', () => {
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

// New describe block for PWA build artifacts
describe('PWA Build Artifacts', () => {
  const distDir = './dist';
  let manifestContent;
  let htmlContent;

  beforeAll(() => {
    const manifestPath = path.join(distDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`manifest.json not found at ${manifestPath}. Run build first.`);
    }
    manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const htmlPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`index.html not found at ${htmlPath}. Run build first.`);
    }
    htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  });

  it('should have a valid manifest.json with expected properties', () => {
    expect(manifestContent.name).toBe('Squirt');
    expect(manifestContent.short_name).toBe('Squirt');
    expect(manifestContent.start_url).toBe('/index.html');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.background_color).toBeDefined();
    expect(manifestContent.theme_color).toBeDefined();
    expect(manifestContent.description).toBeDefined();
  });

  it('should have a non-empty icons array in manifest.json', () => {
    expect(manifestContent.icons).toBeInstanceOf(Array);
    expect(manifestContent.icons.length).toBeGreaterThan(0);
  });

  it('should have all icons specified in manifest.json present in dist directory', () => {
    manifestContent.icons.forEach(icon => {
      expect(icon.src).toBeDefined('Icon src path is not defined');
      expect(icon.sizes).toBeDefined(`Icon sizes not defined for ${icon.src}`);
      expect(icon.type).toBeDefined(`Icon type not defined for ${icon.src}`);
      
      // icon.src is like '/icons/icon-192x192.png'.
      // path.join will correctly handle the leading '/' if distDir is relative like './dist'
      // resulting in './dist/icons/icon-192x192.png'
      const iconPath = path.join(distDir, icon.src);
      expect(fs.existsSync(iconPath)).toBe(true, `Icon file not found: ${iconPath}`);
    });
  });

  it('should link manifest.json in index.html', () => {
    // The problem description specified href="/manifest.json"
    // Webpack's HtmlWebpackPlugin might generate just "manifest.json" if index.html is also in dist root.
    // Let's check for either, or a more robust check if the path is absolute.
    // Given manifest.json is at dist/manifest.json and index.html is at dist/index.html,
    // a relative path "manifest.json" or absolute "/manifest.json" are common.
    // The previous verification step confirmed "/manifest.json".
    expect(htmlContent).toContain('<link rel="manifest" href="/manifest.json">');
  });

  it('should have a service-worker.js file in dist directory', () => {
    const swPath = path.join(distDir, 'service-worker.js');
    expect(fs.existsSync(swPath)).toBe(true, `service-worker.js not found at ${swPath}`);
  });
});
