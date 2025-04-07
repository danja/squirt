// Action types
export const SET_ENDPOINTS = 'endpoints/SET_ENDPOINTS'
export const ADD_ENDPOINT = 'endpoints/ADD_ENDPOINT'
export const REMOVE_ENDPOINT = 'endpoints/REMOVE_ENDPOINT'
export const UPDATE_ENDPOINT = 'endpoints/UPDATE_ENDPOINT'

export const SET_POSTS = 'posts/SET_POSTS'
export const ADD_POST = 'posts/ADD_POST'
export const UPDATE_POST = 'posts/UPDATE_POST'
export const REMOVE_POST = 'posts/REMOVE_POST'

export const SET_CURRENT_VIEW = 'ui/SET_CURRENT_VIEW'
export const SET_THEME = 'ui/SET_THEME'
export const SHOW_NOTIFICATION = 'ui/SHOW_NOTIFICATION'
export const HIDE_NOTIFICATION = 'ui/HIDE_NOTIFICATION'

// Action creators
export const setEndpoints = (endpoints) => ({
    type: SET_ENDPOINTS,
    payload: endpoints
})

export const addEndpoint = (endpoint) => ({
    type: ADD_ENDPOINT,
    payload: endpoint
})

export const removeEndpoint = (url) => ({
    type: REMOVE_ENDPOINT,
    payload: url
})

export const updateEndpoint = (data) => ({
    type: UPDATE_ENDPOINT,
    payload: data
})

export const setPosts = (posts) => ({
    type: SET_POSTS,
    payload: posts
})

export const addPost = (post) => ({
    type: ADD_POST,
    payload: post
})

export const updatePost = (data) => ({
    type: UPDATE_POST,
    payload: data
})

export const removePost = (id) => ({
    type: REMOVE_POST,
    payload: id
})

export const setCurrentView = (viewId) => ({
    type: SET_CURRENT_VIEW,
    payload: viewId
})

export const setTheme = (theme) => ({
    type: SET_THEME,
    payload: theme
})

export const showNotification = (notification) => ({
    type: SHOW_NOTIFICATION,
    payload: notification
})

export const hideNotification = (id) => ({
    type: HIDE_NOTIFICATION,
    payload: id
})