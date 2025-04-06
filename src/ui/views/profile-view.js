// src/ui/views/profile-view.js
import { eventBus, EVENTS } from '../../core/events/event-bus.js';
import { errorHandler } from '../../core/errors/index.js';
import { store } from '../../core/state/index.js';
import { showNotification } from '../notifications/notifications.js';
import { rdfModel } from '../../domain/rdf/model.js';
import { namespaces } from '../../utils/namespaces.js';

/**
 * Initialize the profile view
 * @returns {Object} View controller with methods for updating and cleaning up
 */
export function initView() {
    try {
        console.log('Initializing Profile view');
        
        const view = document.getElementById('profile-view');
        if (!view) {
            throw new Error('Profile view element not found');
        }
        
        // Create view structure if it doesn't exist
        if (!view.querySelector('#profile-form')) {
            createProfileInterface(view);
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Load existing profile data
        loadProfileData();
        
        return {
            update() {
                console.log('Updating Profile view');
                loadProfileData();
            },
            
            cleanup() {
                console.log('Cleaning up Profile view');
                // Remove any event listeners specific to this view
            }
        };
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing Profile view'
        });
        
        return {};
    }
}

/**
 * Create the profile interface UI elements
 * @param {HTMLElement} container - The view container element
 */
function createProfileInterface(container) {
    container.innerHTML = `
        <h2>Profile</h2>
        <form id="profile-form" class="form-group">
            <div class="profile-image-container">
                <div class="profile-image">
                    <img id="profile-avatar" src="/api/placeholder/150/150" alt="Profile Avatar">
                </div>
                <label for="profile-avatar-upload" class="avatar-upload-button button-primary">
                    Change Avatar
                </label>
                <input type="file" id="profile-avatar-upload" accept="image/*" style="display: none;">
            </div>
            
            <h3>Basic Information</h3>
            <div class="form-field">
                <label for="profile-name">Name</label>
                <input type="text" id="profile-name" name="name" placeholder="Your full name">
            </div>
            
            <div class="form-field">
                <label for="profile-nick">Nickname</label>
                <input type="text" id="profile-nick" name="nick" placeholder="How you want to be called">
            </div>
            
            <div class="form-field">
                <label for="profile-email">Email</label>
                <input type="email" id="profile-email" name="email" placeholder="Your email address">
            </div>
            
            <div class="form-field">
                <label for="profile-homepage">Homepage</label>
                <input type="url" id="profile-homepage" name="homepage" placeholder="Your website URL">
            </div>
            
            <h3>About</h3>
            <div class="form-field">
                <label for="profile-bio">Bio</label>
                <textarea id="profile-bio" name="bio" rows="5" placeholder="Tell us about yourself"></textarea>
            </div>
            
            <h3>Social Profiles</h3>
            <div class="form-field">
                <label for="profile-mastodon">Mastodon</label>
                <input type="url" id="profile-mastodon" name="mastodon" placeholder="Your Mastodon profile URL">
            </div>
            
            <div class="form-field">
                <label for="profile-github">GitHub</label>
                <input type="url" id="profile-github" name="github" placeholder="Your GitHub profile URL">
            </div>
            
            <div class="form-field">
                <label for="profile-linkedin">LinkedIn</label>
                <input type="url" id="profile-linkedin" name="linkedin" placeholder="Your LinkedIn profile URL">
            </div>
            
            <button type="submit" class="button-primary">Save Profile</button>
        </form>
    `;
    
    // Add styles if not already in the document
    if (!document.getElementById('profile-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'profile-styles';
        styleElement.textContent = `
            #profile-form {
                background: var(--card-background);
                padding: var(--spacing-lg);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow);
            }
            
            .profile-image-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: var(--spacing-lg);
            }
            
            .profile-image {
                width: 150px;
                height: 150px;
                border-radius: 50%;
                overflow: hidden;
                margin-bottom: var(--spacing-md);
                background-color: var(--border-color);
            }
            
            .profile-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .avatar-upload-button {
                padding: var(--spacing-xs) var(--spacing-md);
                font-size: 0.9rem;
            }
            
            #profile-form h3 {
                border-bottom: 1px solid var(--border-color);
                padding-bottom: var(--spacing-xs);
                margin-top: var(--spacing-lg);
                margin-bottom: var(--spacing-md);
            }
            
            @media (min-width: 768px) {
                .form-field {
                    margin-bottom: var(--spacing-md);
                }
            }
        `;
        document.head.appendChild(styleElement);
    }
}

/**
 * Set up event listeners for the profile interface
 */
function setupEventListeners() {
    const profileForm = document.getElementById('profile-form');
    const avatarUpload = document.getElementById('profile-avatar-upload');
    
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfileData();
        });
    }
    
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
}

/**
 * Handle avatar image upload
 * @param {Event} e - Change event
 */
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    // Simple size check
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Image is too large. Maximum size is 5MB', 'error');
        return;
    }
    
    // Display the image
    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Save profile data to RDF store
 */
function saveProfileData() {
    try {
        // Get form data
        const profileData = {
            type: 'profile',
            name: document.getElementById('profile-name')?.value || '',
            nick: document.getElementById('profile-nick')?.value || '',
            email: document.getElementById('profile-email')?.value || '',
            homepage: document.getElementById('profile-homepage')?.value || '',
            bio: document.getElementById('profile-bio')?.value || '',
            mastodon: document.getElementById('profile-mastodon')?.value || '',
            github: document.getElementById('profile-github')?.value || '',
            linkedin: document.getElementById('profile-linkedin')?.value || '',
            avatar: document.getElementById('profile-avatar')?.src || ''
        };
        
        // Use a fixed ID for the profile - we only want one profile per user
        const profileId = 'http://purl.org/stuff/squirt/profile_user';
        
        // First try to delete any existing profile
        try {
            rdfModel.deletePost(profileId);
        } catch (err) {
            // Ignore error if profile doesn't exist yet
            console.log('No existing profile found, creating new one');
        }
        
        // Create profile with FOAF vocabulary
        const foafProfile = {
            customId: profileId,
            type: 'profile',
            content: profileData.bio,
            foafName: profileData.name,
            foafNick: profileData.nick,
            foafMbox: profileData.email ? `mailto:${profileData.email}` : '',
            foafHomepage: profileData.homepage,
            foafImg: profileData.avatar,
            foafAccounts: [
                profileData.mastodon,
                profileData.github, 
                profileData.linkedin
            ].filter(Boolean)
        };
        
        // Save to RDF store with FOAF vocabulary
        const postId = rdfModel.createPost(foafProfile);
        
        // Try to sync with endpoint
        rdfModel.syncWithEndpoint().catch(error => {
            console.warn('Profile saved locally but failed to sync with endpoint', error);
        });
        
        showNotification('Profile saved successfully', 'success');
        
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Saving profile data'
        });
    }
}

/**
 * Load existing profile data from the store
 */
function loadProfileData() {
    try {
        // Use the fixed profile ID
        const profileId = 'http://purl.org/stuff/squirt/profile_user';
        
        // Get profile from RDF store
        const profile = rdfModel.getPost(profileId);
        
        if (!profile) {
            console.log('No profile found');
            return;
        }
        
        // Populate form fields
        document.getElementById('profile-name').value = profile.foafName || '';
        document.getElementById('profile-nick').value = profile.foafNick || '';
        document.getElementById('profile-email').value = profile.foafMbox ? profile.foafMbox.replace('mailto:', '') : '';
        document.getElementById('profile-homepage').value = profile.foafHomepage || '';
        document.getElementById('profile-bio').value = profile.content || '';
        
        // Set avatar if available
        if (profile.foafImg) {
            document.getElementById('profile-avatar').src = profile.foafImg;
        }
        
        // Set social profiles if available
        if (profile.foafAccounts && Array.isArray(profile.foafAccounts)) {
            profile.foafAccounts.forEach(account => {
                if (account.includes('mastodon')) {
                    document.getElementById('profile-mastodon').value = account;
                } else if (account.includes('github')) {
                    document.getElementById('profile-github').value = account;
                } else if (account.includes('linkedin')) {
                    document.getElementById('profile-linkedin').value = account;
                }
            });
        }
        
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Loading profile data'
        });
    }
}
