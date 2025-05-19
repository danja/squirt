/// <reference path="./index.d.ts" />
// Type definitions for evb
// Project: evb (Event Bus)
// Definitions by: Squirt Project

/**
 * Event bus for pub/sub communication
 */
export class EventBus {
  /**
   * Subscribe to an event
   * @param event Event name
   * @param callback Event handler function
   * @returns Unsubscribe function
   */
  on(event: string, callback: (data: any) => void): () => void

  /**
   * Emit an event
   * @param event Event name
   * @param data Event data
   */
  emit(event: string, data?: any): void

  /**
   * Remove all listeners for an event or all events
   * @param event Event name (optional, removes all if not specified)
   */
  removeAllListeners(event?: string): void
}

/**
 * Singleton event bus instance
 */
export const eventBus: EventBus

/**
 * General-purpose event constants
 */
export const EVENTS: {
  ERROR_OCCURRED: string
  APP_INITIALIZED: string
  SHARE_RECEIVED: string
  STATE_CHANGED: string
  GRAPH_CREATED: string
  GRAPH_UPDATED: string
  GRAPH_DELETED: string
  QUAD_CREATED: string
  QUAD_UPDATED: string
  QUAD_DELETED: string
  DATASET_SYNCED: string
  POST_CREATED: string
  POST_UPDATED: string
  POST_DELETED: string
  MODEL_SYNCED: string
  ENDPOINT_ADDED: string
  ENDPOINT_REMOVED: string
  ENDPOINT_UPDATED: string
  ENDPOINT_STATUS_CHANGED: string
  ENDPOINTS_STATUS_CHECKED: string
  ENDPOINT_CHECK_REQUESTED: string
  SPARQL_QUERY_STARTED: string
  SPARQL_QUERY_COMPLETED: string
  SPARQL_QUERY_FAILED: string
  SPARQL_UPDATE_STARTED: string
  SPARQL_UPDATE_COMPLETED: string
  SPARQL_UPDATE_FAILED: string
  VIEW_CHANGED: string
  NOTIFICATION_SHOW: string
  FORM_SUBMITTED: string
}

/**
 * Create a simple Redux-like store
 * @param reducer Reducer function
 * @param initialState Initial state
 */
export function createStore<T = any>(
  reducer: (state: T, action: any) => T,
  initialState: T
): {
  getState(): T
  dispatch(action: any): any
  subscribe(listener: (state: T) => void): () => void
}

/**
 * Combine multiple reducers into one (Redux-style)
 * @param reducers Object of reducer functions
 */
export function combineReducers<T = any>(
  reducers: { [K in keyof T]: (state: T[K] | undefined, action: any) => T[K] }
): (state: T | undefined, action: any) => T

/**
 * Simple action creator
 * @param type Action type
 */
export function createAction<T = any>(type: string): (payload: T) => { type: string; payload: T } 