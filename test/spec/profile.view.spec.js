// test/spec/profile-view.spec.js
import { initView } from '../../src/ui/views/profile-view.js';
import { eventBus } from '../../src/core/events/event-bus.js';
import { rdfModel } from '../../src/domain/rdf/model.js';
import { showNotification } from '../../src/ui/notifications/notifications.js';

// Mock dependencies
jest.mock('../../src/core/events/event-bus.js', () => ({
  eventBus: {
    on: jest.fn(),
    emit: jest.fn()
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

jest.mock('../../src/ui/notifications/notifications.js', () => ({
  showNotification: jest.fn()
}));

jest.mock('../../src/domain/rdf/model.js', () => ({
  rdfModel: {
    createPost: jest.fn().mockReturnValue('test-profile-id'),
    getPost: jest.fn(),
    deletePost: jest.fn(),
    syncWithEndpoint: jest.fn().mockResolvedValue(true)
  }
}));

describe('Profile View', () => {
  const profileId = 'http://purl.org/stuff/squirt/profile_user';
  const mockProfile = {
    id: profileId,
    type: 'profile',
    content: 'This is my bio',
    foafName: 'Test User',
    foafNick: 'tester',
    foafMbox: 'mailto:test@example.com',
    foafHomepage: 'https://example.com',
    foafImg: 'data:image/png;base64,abc123',
    foafAccounts: [
      'https://mastodon.social/@tester',
      'https://github.com/tester',
      'https://linkedin.com/in/tester'
    ]
  };
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="profile-view">
        <form id="profile-form" class="form-group">
          <div class="profile-image-container">
            <div class="profile-image">
              <img id="profile-avatar" src="/api/placeholder/150/150" alt="Profile Avatar">
            </div>
            <input type="file" id="profile-avatar-upload">
          </div>
          
          <div class="form-field">
            <label for="profile-name">Name</label>
            <input type="text" id="profile-name" name="name">
          </div>
          
          <div class="form-field">
            <label for="profile-nick">Nickname</label>
            <input type="text" id="profile-nick" name="nick">
          </div>
          
          <div class="form-field">
            <label for="profile-email">Email</label>
            <input type="email" id="profile-email" name="email">
          </div>
          
          <div class="form-field">
            <label for="profile-homepage">Homepage</label>
            <input type="url" id="profile-homepage" name="homepage">
          </div>
          
          <div class="form-field">
            <label for="profile-bio">Bio</label>
            <textarea id="profile-bio" name="bio"></textarea>
          </div>
          
          <div class="form-field">
            <label for="profile-mastodon">Mastodon</label>
            <input type="url" id="profile-mastodon" name="mastodon">
          </div>
          
          <div class="form-field">
            <label for="profile-github">GitHub</label>
            <input type="url" id="profile-github" name="github">
          </div>
          
          <div class="form-field">
            <label for="profile-linkedin">LinkedIn</label>
            <input type="url" id="profile-linkedin" name="linkedin">
          </div>
          
          <button type="submit">Save Profile</button>
        </form>
      </div>
    `;
    
    // Clear mocks
    jest.clearAllMocks();
  });
  
  it('should initialize the profile view with no existing profile', () => {
    // Mock no existing profile
    rdfModel.getPost.mockReturnValue(null);
    
    const result = initView();
    
    expect(result).toBeDefined();
    expect(result.update).toBeDefined();
    expect(result.cleanup).toBeDefined();
    
    // getPost should be called with the fixed profile ID
    expect(rdfModel.getPost).toHaveBeenCalledWith(profileId);
    
    // Form fields should be empty
    expect(document.getElementById('profile-name').value).toBe('');
    expect(document.getElementById('profile-bio').value).toBe('');
  });
  
  it('should load existing profile data', () => {
    // Mock existing profile
    rdfModel.getPost.mockReturnValue(mockProfile);
    
    initView();
    
    // Form fields should be populated
    expect(document.getElementById('profile-name').value).toBe('Test User');
    expect(document.getElementById('profile-nick').value).toBe('tester');
    expect(document.getElementById('profile-email').value).toBe('test@example.com');
    expect(document.getElementById('profile-homepage').value).toBe('https://example.com');
    expect(document.getElementById('profile-bio').value).toBe('This is my bio');
    expect(document.getElementById('profile-mastodon').value).toBe('https://mastodon.social/@tester');
    expect(document.getElementById('profile-github').value).toBe('https://github.com/tester');
    expect(document.getElementById('profile-linkedin').value).toBe('https://linkedin.com/in/tester');
    expect(document.getElementById('profile-avatar').src).toBe('data:image/png;base64,abc123');
  });
  
  it('should save profile data when form is submitted', () => {
    // Initialize view
    initView();
    
    // Fill form fields
    document.getElementById('profile-name').value = 'New User';
    document.getElementById('profile-nick').value = 'newuser';
    document.getElementById('profile-email').value = 'new@example.com';
    document.getElementById('profile-homepage').value = 'https://newuser.com';
    document.getElementById('profile-bio').value = 'New bio';
    document.getElementById('profile-mastodon').value = 'https://mastodon.social/@newuser';
    document.getElementById('profile-github').value = 'https://github.com/newuser';
    document.getElementById('profile-linkedin').value = 'https://linkedin.com/in/newuser';
    
    // Submit form
    const form = document.getElementById('profile-form');
    const event = new Event('submit');
    event.preventDefault = jest.fn();
    form.dispatchEvent(event);
    
    // Verify preventDefault was called
    expect(event.preventDefault).toHaveBeenCalled();
    
    // Old profile should be deleted
    expect(rdfModel.deletePost).toHaveBeenCalledWith(profileId);
    
    // New profile should be created
    expect(rdfModel.createPost).toHaveBeenCalledWith(expect.objectContaining({
      customId: profileId,
      type: 'profile',
      content: 'New bio',
      foafName: 'New User',
      foafNick: 'newuser',
      foafMbox: 'mailto:new@example.com',
      foafHomepage: 'https://newuser.com',
      foafAccounts: [
        'https://mastodon.social/@newuser',
        'https://github.com/newuser',
        'https://linkedin.com/in/newuser'
      ]
    }));
    
    // Should attempt to sync with endpoint
    expect(rdfModel.syncWithEndpoint).toHaveBeenCalled();
    
    // Notification should be shown
    expect(showNotification).toHaveBeenCalledWith('Profile saved successfully', 'success');
  });
  
  it('should handle avatar upload', () => {
    // Initialize view
    initView();
    
    // Mock FileReader
    const originalFileReader = global.FileReader;
    const mockFileReaderInstance = {
      readAsDataURL: jest.fn(),
      onload: null
    };
    global.FileReader = jest.fn(() => mockFileReaderInstance);
    
    // Create a mock file
    const mockFile = new File([''], 'test-image.png', { type: 'image/png' });
    
    // Trigger file input change
    const fileInput = document.getElementById('profile-avatar-upload');
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    });
    
    const changeEvent = new Event('change');
    fileInput.dispatchEvent(changeEvent);
    
    // FileReader should be instantiated and readAsDataURL called
    expect(global.FileReader).toHaveBeenCalled();
    expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(mockFile);
    
    // Simulate FileReader onload
    const avatarElement = document.getElementById('profile-avatar');
    const originalSrc = avatarElement.src;
    
    mockFileReaderInstance.onload({ target: { result: 'data:image/png;base64,new123' } });
    
    // Avatar src should be updated
    expect(avatarElement.src).toBe('data:image/png;base64,new123');
    expect(avatarElement.src).not.toBe(originalSrc);
    
    // Restore original FileReader
    global.FileReader = originalFileReader;
  });
});
