import { createStore } from './store.js'
import { rootReducer } from './reducers.js'

// Create the store with the root reducer
const store = createStore(rootReducer)

export { store }

export * from './actions.js'
export * from './selectors.js'

export { createStore } from './store.js'