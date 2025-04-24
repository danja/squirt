import { combineReducers } from './utils.js'
import { ENDPOINTS, POSTS, UI } from './action-types.js'

export function endpointsReducer(state = [], action) {
    switch (action.type) {
        case ENDPOINTS.SET:
            return action.payload

        case ENDPOINTS.ADD:
            // Avoid duplicates
            if (state.some(e => e.url === action.payload.url)) {
                return state
            }
            return [...state, action.payload]

        case ENDPOINTS.REMOVE:
            return state.filter(endpoint => endpoint.url !== action.payload)

        case ENDPOINTS.UPDATE:
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
        case POSTS.SET:
            return action.payload

        case POSTS.ADD:
            return [...state, action.payload]

        case POSTS.UPDATE:
            return state.map(post =>
                post.id === action.payload.id
                    ? { ...post, ...action.payload.updates }
                    : post
            )

        case POSTS.REMOVE:
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
        case UI.SET_CURRENT_VIEW:
            return {
                ...state,
                previousView: state.currentView,
                currentView: action.payload
            }

        case UI.SET_THEME:
            return {
                ...state,
                theme: action.payload
            }

        case UI.SHOW_NOTIFICATION:
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

        case UI.HIDE_NOTIFICATION:
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