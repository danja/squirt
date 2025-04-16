// test/spec/profile-view.spec.js
import { initView } from '../../src/ui/views/profile-view.js'
import { eventBus } from '../../src/core/events/event-bus.js'
import { rdfModel } from '../../src/domain/rdf/model.js'
import * as notifications from '../../src/ui/notifications/notifications.js' // Import module as namespace
import { errorHandler } from '../../src/core/errors/index.js' // Import needed mocks
import { store } from '../../src/core/state/index.js'
// Import actions needed for dispatch checks
import { addPost, removePost, showNotification as showNotificationAction } from '../../core/state/actions.js'
import rdf from 'rdf-ext' // Import rdf

// Mock dependencies using Jasmine spies

describe('Profile View', () => {
  const profileId = 'http://purl.org/stuff/squirt/profile_user'
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
  }

  let mockEventBusOnSpy, mockEventBusEmitSpy
  let mockErrorHandlerHandleSpy
  let mockStoreGetStateSpy, mockStoreDispatchSpy
  let mockRdfModelCreatePostDataSpy
  let mockFileReaderInstance
  let originalFileReader

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
    `

    // Create spies
    mockEventBusOnSpy = spyOn(eventBus, 'on')
    mockEventBusEmitSpy = spyOn(eventBus, 'emit')
    mockErrorHandlerHandleSpy = spyOn(errorHandler, 'handle')
    mockStoreGetStateSpy = spyOn(store, 'getState')
    mockStoreDispatchSpy = spyOn(store, 'dispatch')
    mockRdfModelCreatePostDataSpy = spyOn(rdfModel, 'createPostData').and.returnValue({ id: profileId, dataset: rdf.dataset() })

    // Mock FileReader for avatar upload test
    originalFileReader = global.FileReader
    mockFileReaderInstance = {
      readAsDataURL: jasmine.createSpy('readAsDataURL'),
      onload: null
    }
    global.FileReader = jasmine.createSpy('FileReader').and.returnValue(mockFileReaderInstance)

  })

  afterEach(() => {
    // Restore original FileReader if it was mocked
    if (originalFileReader) {
      global.FileReader = originalFileReader
    }
  })

  it('should initialize the profile view with no existing profile', () => {
    // Mock store state for initialization
    mockStoreGetStateSpy.and.returnValue({ posts: [] }) // No profile post initially
    const result = initView()
    expect(result).toBeDefined()
    expect(mockStoreGetStateSpy).toHaveBeenCalled() // Check if state was read
    // Form fields should be empty (check a few)
    expect(document.getElementById('profile-name').value).toBe('')
    expect(document.getElementById('profile-bio').value).toBe('')
  })

  it('should load existing profile data from store', () => {
    // Mock store state with existing profile
    mockStoreGetStateSpy.and.returnValue({ posts: [mockProfile] })
    initView()
    // Form fields should be populated
    expect(document.getElementById('profile-name').value).toBe('Test User')
    expect(document.getElementById('profile-nick').value).toBe('tester')
    expect(document.getElementById('profile-email').value).toBe('test@example.com')
    expect(document.getElementById('profile-homepage').value).toBe('https://example.com')
    expect(document.getElementById('profile-bio').value).toBe('This is my bio')
    expect(document.getElementById('profile-mastodon').value).toBe('https://mastodon.social/@tester')
    expect(document.getElementById('profile-github').value).toBe('https://github.com/tester')
    expect(document.getElementById('profile-linkedin').value).toBe('https://linkedin.com/in/tester')
    expect(document.getElementById('profile-avatar').src).toContain('data:image/png;base64,abc123') // Use toContain for data URLs
  })

  it('should dispatch actions to save profile data when form is submitted', async () => {
    mockStoreGetStateSpy.and.returnValue({ posts: [mockProfile] }) // Start with existing profile
    initView()
    // ... Fill form fields ...
    const form = document.getElementById('profile-form')
    const event = new Event('submit', { bubbles: true, cancelable: true })
    const preventDefaultSpy = spyOn(event, 'preventDefault')
    form.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()

    // Check removePost action for old profile
    expect(mockStoreDispatchSpy).toHaveBeenCalledWith(removePost(profileId))

    // Check createPostData call
    expect(mockRdfModelCreatePostDataSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      customId: profileId, // Ensure correct ID is passed
      type: 'profile',
      foafName: 'New User' // Check one or two key fields
      // ... other foaf properties ...
    }))

    // Check addPost action with NEW profile data
    expect(mockStoreDispatchSpy).toHaveBeenCalledWith(addPost(jasmine.objectContaining({
      id: profileId, // Expecting the same ID to be used
      type: 'profile',
      foafName: 'New User'
      // ... other foaf properties from form ...
    })))

    // Check notification action dispatch
    expect(mockStoreDispatchSpy).toHaveBeenCalledWith(showNotificationAction({
      id: jasmine.any(Number),
      message: 'Profile saved successfully',
      type: 'success',
      duration: 5000,
      timestamp: jasmine.any(String)
    }))
  })

  it('should handle avatar upload', () => {
    // Initialize view
    initView()

    // Mock FileReader already set up in beforeEach

    // Create a mock file
    const mockFile = new File(['content'], 'test-image.png', { type: 'image/png' })

    // Trigger file input change
    const fileInput = document.getElementById('profile-avatar-upload')
    // Need to simulate user selecting a file
    // Directly setting files might not trigger event listeners in some test environments (like JSDOM)
    // A more robust way might involve directly calling the event handler if possible, or using a testing library helper
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: true // Make it writable for the test
    })

    const changeEvent = new Event('change')
    fileInput.dispatchEvent(changeEvent)

    // FileReader should be instantiated and readAsDataURL called
    expect(global.FileReader).toHaveBeenCalled()
    expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(mockFile)

    // Simulate FileReader onload
    const avatarElement = document.getElementById('profile-avatar')
    const originalSrc = avatarElement.src

    // Check if the handler was attached
    expect(mockFileReaderInstance.onload).toEqual(jasmine.any(Function))

    // Manually trigger the onload handler
    mockFileReaderInstance.onload({ target: { result: 'data:image/png;base64,new123' } })

    // Avatar src should be updated
    expect(avatarElement.src).toContain('data:image/png;base64,new123')
    expect(avatarElement.src).not.toBe(originalSrc)
  })
})
