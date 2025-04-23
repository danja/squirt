import { eventBus, EVENTS } from 'evb'

// Redux-like store implementation
export function createStore(reducer, initialState = {}) {
  let state = initialState
  let listeners = new Set()

  const getState = () => state

  const dispatch = (action) => {
    state = reducer(state, action)
    listeners.forEach(listener => listener(state))
    eventBus.emit(EVENTS.STATE_CHANGED, { action, state })
    return action
  }

  const subscribe = (listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  // Initialize store with an action to establish initial state
  dispatch({ type: '@@INIT' })

  return {
    getState,
    dispatch,
    subscribe
  }
}