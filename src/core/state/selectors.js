export const getEndpoints = state => Array.isArray(state.endpoints) ? state.endpoints : []
export const getActiveEndpoints = state => state.endpoints.filter(e => e.status === 'active')
export const getEndpointByUrl = (state, url) => state.endpoints.find(e => e.url === url)
export const getActiveEndpoint = (state, type) => {
    const endpoints = Array.isArray(state.endpoints) ? state.endpoints : []
    return endpoints.find(e => e.type === type && e.status === 'active')
}

export const getPosts = state => state.posts
export const getPostById = (state, id) => state.posts.find(p => p.id === id)
export const getPostsByType = (state, type) => state.posts.filter(p => p.type === type)
export const getPostsByTag = (state, tag) => state.posts.filter(p => p.tags.includes(tag))

export const getCurrentView = state => state.ui.currentView
export const getPreviousView = state => state.ui.previousView
export const getTheme = state => state.ui.theme
export const getNotifications = state => state.ui.notifications