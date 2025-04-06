// src/core/state/store.js
import { eventBus, EVENTS } from '../events/event-bus.js';

/**
 * Create a new store with the given reducer
 * @param {Function} reducer - A function that takes state and action and returns new state
 * @param {Object} initialState - Initial state
 * @returns {Object} Store object
 */
export function createStore(reducer, initialState = {}) {
  let state = initialState;
  let listeners = new Set();
  
  const getState = () => state;
  
  const dispatch = (action) => {
    state = reducer(state, action);
    listeners.forEach(listener => listener(state));
    eventBus.emit(EVENTS.STATE_CHANGED, { action, state });
    return action;
  };
  
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  
  // Initialize store with initial state
  dispatch({ type: '@@INIT' });
  
  return {
    getState,
    dispatch,
    subscribe
  };
}

// src/core/state/reducer.js
import { combineReducers } from './utils.js';
import { endpointsReducer } from './endpoints-reducer.js';
import { postsReducer } from './posts-reducer.js';
import { uiReducer } from './ui-reducer.js';

export const stateReducer = combineReducers({
  endpoints: endpointsReducer,
  posts: postsReducer,
  ui: uiReducer
});

// src/core/state/utils.js
/**
 * Combine multiple reducers into a single reducer
 * @param {Object} reducers - Object with reducers as values
 * @returns {Function} Combined reducer
 */
export function combineReducers(reducers) {
  return (state = {}, action) => {
    const nextState = {};
    let hasChanged = false;
    
    for (const key in reducers) {
      const reducer = reducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    
    return hasChanged ? nextState : state;
  };
}

/**
 * Create action creator function
 * @param {string} type - Action type
 * @returns {Function} Action creator
 */
export function createAction(type) {
  return (payload) => ({
    type,
    payload
  });
}

// src/core/state/endpoints-reducer.js
import { 
  ADD_ENDPOINT, 
  REMOVE_ENDPOINT, 
  UPDATE_ENDPOINT, 
  SET_ENDPOINTS 
} from './action-types.js';

const initialState = [];

export function endpointsReducer(state = initialState, action) {
  switch (action.type) {
    case SET_ENDPOINTS:
      return action.payload;
      
    case ADD_ENDPOINT:
      // Avoid duplicates
      if (state.some(e => e.url === action.payload.url)) {
        return state;
      }
      return [...state, action.payload];
      
    case REMOVE_ENDPOINT:
      return state.filter(endpoint => endpoint.url !== action.payload);
      
    case UPDATE_ENDPOINT:
      return state.map(endpoint => 
        endpoint.url === action.payload.url 
          ? { ...endpoint, ...action.payload.updates } 
          : endpoint
      );
      
    default:
      return state;
  }
}

// src/core/state/posts-reducer.js
import {
  ADD_POST,
  UPDATE_POST,
  REMOVE_POST,
  SET_POSTS
} from './action-types.js';

const initialState = [];

export function postsReducer(state = initialState, action) {
  switch (action.type) {
    case SET_POSTS:
      return action.payload;
      
    case ADD_POST:
      return [...state, action.payload];
      
    case UPDATE_POST:
      return state.map(post => 
        post.id === action.payload.id 
          ? { ...post, ...action.payload.updates } 
          : post
      );
      
    case REMOVE_POST:
      return state.filter(post => post.id !== action.payload);
      
    default:
      return state;
  }
}

// src/core/state/ui-reducer.js
import {
  SET_CURRENT_VIEW,
  SET_THEME,
  SHOW_NOTIFICATION,
  HIDE_NOTIFICATION
} from './action-types.js';

const initialState = {
  currentView: 'post-view',
  previousView: null,
  theme: 'light',
  notifications: []
};

export function uiReducer(state = initialState, action) {
  switch (action.type) {
    case SET_CURRENT_VIEW:
      return {
        ...state,
        previousView: state.currentView,
        currentView: action.payload
      };
      
    case SET_THEME:
      return {
        ...state,
        theme: action.payload
      };
      
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
      };
      
    case HIDE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
      
    default:
      return state;
  }
}

// src/core/state/action-types.js
// Endpoint actions
export const SET_ENDPOINTS = 'endpoints/SET_ENDPOINTS';
export const ADD_ENDPOINT = 'endpoints/ADD_ENDPOINT';
export const REMOVE_ENDPOINT = 'endpoints/REMOVE_ENDPOINT';
export const UPDATE_ENDPOINT = 'endpoints/UPDATE_ENDPOINT';

// Post actions
export const SET_POSTS = 'posts/SET_POSTS';
export const ADD_POST = 'posts/ADD_POST';
export const UPDATE_POST = 'posts/UPDATE_POST';
export const REMOVE_POST = 'posts/REMOVE_POST';

// UI actions
export const SET_CURRENT_VIEW = 'ui/SET_CURRENT_VIEW';
export const SET_THEME = 'ui/SET_THEME';
export const SHOW_NOTIFICATION = 'ui/SHOW_NOTIFICATION';
export const HIDE_NOTIFICATION = 'ui/HIDE_NOTIFICATION';

// src/core/state/actions.js
import * as types from './action-types.js';
import { createAction } from './utils.js';

// Endpoint actions
export const setEndpoints = createAction(types.SET_ENDPOINTS);
export const addEndpoint = createAction(types.ADD_ENDPOINT);
export const removeEndpoint = createAction(types.REMOVE_ENDPOINT);
export const updateEndpoint = createAction(types.UPDATE_ENDPOINT);

// Post actions
export const setPosts = createAction(types.SET_POSTS);
export const addPost = createAction(types.ADD_POST);
export const updatePost = createAction(types.UPDATE_POST);
export const removePost = createAction(types.REMOVE_POST);

// UI actions
export const setCurrentView = createAction(types.SET_CURRENT_VIEW);
export const setTheme = createAction(types.SET_THEME);
export const showNotification = createAction(types.SHOW_NOTIFICATION);
export const hideNotification = createAction(types.HIDE_NOTIFICATION);

// src/core/state/index.js
export { createStore } from './store.js';
export { stateReducer } from './reducer.js';
export * from './actions.js';
export * from './selectors.js';

// Create and export the store
import { createStore } from './store.js';
import { stateReducer } from './reducer.js';

export const store = createStore(stateReducer);

// src/core/state/selectors.js
// Endpoint selectors
export const getEndpoints = state => state.endpoints;
export const getActiveEndpoints = state => state.endpoints.filter(e => e.status === 'active');
export const getEndpointByUrl = (state, url) => state.endpoints.find(e => e.url === url);
export const getActiveEndpointByType = (state, type) => state.endpoints.find(e => e.type === type && e.status === 'active');

// Post selectors
export const getPosts = state => state.posts;
export const getPostById = (state, id) => state.posts.find(p => p.id === id);
export const getPostsByType = (state, type) => state.posts.filter(p => p.type === type);
export const getPostsByTag = (state, tag) => state.posts.filter(p => p.tags.includes(tag));

// UI selectors
export const getCurrentView = state => state.ui.currentView;
export const getPreviousView = state => state.ui.previousView;
export const getTheme = state => state.ui.theme;
export const getNotifications = state => state.ui.notifications;
