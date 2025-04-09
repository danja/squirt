import { createStore } from './store.js'
import { rootReducer } from './reducers.js'

export const store = createStore(rootReducer)

export * from './actions.js'
export * from './selectors.js'

export { createStore } from './store.js'