import { combineReducers } from './utils.js'
import * as types from './action-types.js'

export function endpointsReducer(state = [], action) {
    switch (action.type) {
        case types.ENDPOINTS.SET:
            return action.payload

        case types.ENDPOINTS.ADD:
            // Avoid duplicates
            if (state.some(e => e.url === action.payload.url)) {
                return state
            }
            return [...state, action.payload]

        case types.ENDPOINTS.REMOVE:
            return state.filter(endpoint => endpoint.url !== action.payload)

        case types.ENDPOINTS.UPDATE:
            return state.map(endpoint =>
                endpoint.url === action.payload.url
                    ? { ...endpoint, ...action.payload.updates }
                    : endpoint
            )

        default:
            return state
    }
}

export function postsReducer(state = [], action) {
    switch (action.type) {
        case types.POSTS.SET:
            return action.payload

        case types.POSTS.ADD:
            return [...state, action.payload]

        case types.POSTS.UPDATE:
            return state.map(post =>
                post.id === action.payload.id
                    ? { ...post, ...action.payload.updates }
                    : post
            )

        case types.POSTS.REMOVE:
            return state.filter(post => post.id !== action.payload)

        default:
            return state
    }
}

export function uiReducer(state = {
    currentView: 'post-view',
    previousView: null,
    theme: 'light',
    notifications: []
}, action) {
    switch (action.type) {
        case types.UI.SET_CURRENT_VIEW:
            return {
                ...state,
                previousView: state.currentView,
                currentView: action.payload
            }

        case types.UI.SET_THEME:
            return {
                ...state,
                theme: action.payload
            }

        case types.UI.SHOW_NOTIFICATION:
            return {
                ...state,
                notifications: [
                    ...state.notifications,
                    {
                        id: Date.now(),
                        ...action.payload
                    }
                ]
            }

        case types.UI.HIDE_NOTIFICATION:
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload)
            }

        default:
            return state
    }
}

export const rootReducer = combineReducers({
    endpoints: endpointsReducer,
    posts: postsReducer,
    ui: uiReducer
})