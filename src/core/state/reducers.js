import { combineReducers } from './utils.js'
import {
    SET_ENDPOINTS,
    ADD_ENDPOINT,
    REMOVE_ENDPOINT,
    UPDATE_ENDPOINT,
    SET_POSTS,
    ADD_POST,
    UPDATE_POST,
    REMOVE_POST,
    SET_CURRENT_VIEW,
    SET_THEME,
    SHOW_NOTIFICATION,
    HIDE_NOTIFICATION
} from './action-types.js'

export function endpointsReducer(state = [], action) {
    switch (action.type) {
        case SET_ENDPOINTS:
            return action.payload

        case ADD_ENDPOINT:
            // Avoid duplicates
            if (state.some(e => e.url === action.payload.url)) {
                return state
            }
            return [...state, action.payload]

        case REMOVE_ENDPOINT:
            return state.filter(endpoint => endpoint.url !== action.payload)

        case UPDATE_ENDPOINT:
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
        case SET_POSTS:
            return action.payload

        case ADD_POST:
            return [...state, action.payload]

        case UPDATE_POST:
            return state.map(post =>
                post.id === action.payload.id
                    ? { ...post, ...action.payload.updates }
                    : post
            )

        case REMOVE_POST:
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
        case SET_CURRENT_VIEW:
            return {
                ...state,
                previousView: state.currentView,
                currentView: action.payload
            }

        case SET_THEME:
            return {
                ...state,
                theme: action.payload
            }

        case SHOW_NOTIFICATION:
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

        case HIDE_NOTIFICATION:
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