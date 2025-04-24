import * as types from './action-types.js'
import { createAction } from './utils.js'

export const setEndpoints = createAction(types.ENDPOINTS.SET)
export const addEndpoint = createAction(types.ENDPOINTS.ADD)
export const removeEndpoint = createAction(types.ENDPOINTS.REMOVE)
export const updateEndpoint = createAction(types.ENDPOINTS.UPDATE)

export const setPosts = createAction(types.POSTS.SET)
export const addPost = createAction(types.POSTS.ADD)
export const updatePost = createAction(types.POSTS.UPDATE)
export const removePost = createAction(types.POSTS.REMOVE)

export const setCurrentView = createAction(types.UI.SET_CURRENT_VIEW)
export const setTheme = createAction(types.UI.SET_THEME)
export const showNotification = createAction(types.UI.SHOW_NOTIFICATION)
export const hideNotification = createAction(types.UI.HIDE_NOTIFICATION)