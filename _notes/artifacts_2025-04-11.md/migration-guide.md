# Migration Guide: StateManager to Redux Store

This guide explains how to migrate from the deprecated `StateManager` to the Redux-style store implementation in the application.

## Overview of Changes

The application has been updated to use a Redux-style state management pattern instead of the custom `StateManager`. This provides several benefits:

- More predictable state updates through reducers
- Centralized state management
- Better debugging capabilities
- Clearer separation of concerns

## Key Concepts

### Store

The central storage for application state. It's accessible via:

```javascript
import { store } from './core/state/index.js';
```

### Actions

Actions are plain objects describing state changes. Action creators are functions that create and return actions:

```javascript
import * as actions from './core/state/actions.js';

// Use action creators to dispatch actions
store.dispatch(actions.setCurrentView('post-view'));
```

### Reducers

Reducers are pure functions that take the current state and an action, and return a new state. They're already implemented in `src/core/state/reducers.js`.

### Selectors

Selectors are functions that extract specific pieces of state:

```javascript
import { getCurrentView, getEndpoints } from './core/state/selectors.js';

// Get current view from state
const currentView = getCurrentView(store.getState());
```

## Migration Steps

### 1. Import the Redux Store and Actions

Replace:
```javascript
import { state } from './core/state.js';
```

With:
```javascript
import { store } from './core/state/index.js';
import * as actions from './core/state/actions.js';
```

### 2. Replace State Updates

Replace:
```javascript
state.update('currentView', 'post-view');
```

With:
```javascript
store.dispatch(actions.setCurrentView('post-view'));
```

For other state updates, use the corresponding action creators:

- `state.update('endpoints', endpoints)` → `store.dispatch(actions.setEndpoints(endpoints))`
- `state.update('posts', posts)` → `store.dispatch(actions.setPosts(posts))`

### 3. Replace State Access

Replace:
```javascript
const currentView = state.get('currentView');
```

With:
```javascript
import { getCurrentView } from './core/state/selectors.js';
const currentView = getCurrentView(store.getState());
```

For other state access, use the corresponding selectors:

- `state.get('endpoints')` → `getEndpoints(store.getState())`
- `state.get('posts')` → `getPosts(store.getState())`

### 4. Replace State Subscriptions

Replace:
```javascript
state.subscribe('currentView', (newValue) => {
  // Handle change
});
```

With:
```javascript
import { getCurrentView } from './core/state/selectors.js';

let previousView = getCurrentView(store.getState());
store.subscribe(() => {
  const currentView = getCurrentView(store.getState());
  if (currentView !== previousView) {
    // Handle change
    previousView = currentView;
  }
});
```

## Available Actions

Here are the available actions you can dispatch:

- `setEndpoints(endpoints)` - Set all endpoints
- `addEndpoint(endpoint)` - Add a new endpoint
- `removeEndpoint(url)` - Remove an endpoint by URL
- `updateEndpoint({ url, updates })` - Update an endpoint

- `setPosts(posts)` - Set all posts
- `addPost(post)` - Add a new post
- `updatePost({ id, updates })` - Update a post
- `removePost(id)` - Remove a post by ID

- `setCurrentView(viewId)` - Set the current view
- `setTheme(theme)` - Set the theme
- `showNotification(notification)` - Show a notification
- `hideNotification(id)` - Hide a notification

## Available Selectors

Here are the available selectors to access state:

- `getEndpoints(state)` - Get all endpoints
- `getActiveEndpoints(state)` - Get active endpoints
- `getEndpointByUrl(state, url)` - Get endpoint by URL
- `getActiveEndpoint(state, type)` - Get active endpoint by type

- `getPosts(state)` - Get all posts
- `getPostById(state, id)` - Get post by ID
- `getPostsByType(state, type)` - Get posts by type
- `getPostsByTag(state, tag)` - Get posts by tag

- `getCurrentView(state)` - Get current view
- `getPreviousView(state)` - Get previous view
- `getTheme(state)` - Get theme
- `getNotifications(state)` - Get notifications

## Example Usage

Here's a complete example of using the Redux store:

```javascript
import { store } from './core/state/index.js';
import { setCurrentView } from './core/state/actions.js';
import { getCurrentView } from './core/state/selectors.js';

// Get current view
const currentView = getCurrentView(store.getState());
console.log('Current view:', currentView);

// Change view
store.dispatch(setCurrentView('settings-view'));

// Subscribe to changes
store.subscribe(() => {
  console.log('State updated:', store.getState());
});
```
