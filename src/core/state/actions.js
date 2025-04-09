import * as types from './action-types.js'
import { createAction } from './utils.js'

export const setEndpoints = createAction(types.SET_ENDPOINTS)
export const addEndpoint = createAction(types.ADD_ENDPOINT)
export const removeEndpoint = createAction(types.REMOVE_ENDPOINT)
export const updateEndpoint = createAction(types.UPDATE_ENDPOINT)

export const setPosts = createAction(types.SET_POSTS)
export const addPost = createAction(types.ADD_POST)
export const updatePost = createAction(types.UPDATE_POST)
export const removePost = createAction(types.REMOVE_POST)

export const setCurrentView = createAction(types.SET_CURRENT_VIEW)
export const setTheme = createAction(types.SET_THEME)
export const showNotification = createAction(types.SHOW_NOTIFICATION)
export const hideNotification = createAction(types.HIDE_NOTIFICATION)