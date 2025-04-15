import { createActionType } from '../../core/state/action-type-utils'

export const ENDPOINTS = {
    SET: createActionType('endpoints', 'SET'),
    ADD: createActionType('endpoints', 'ADD'),
    REMOVE: createActionType('endpoints', 'REMOVE'),
    UPDATE: createActionType('endpoints', 'UPDATE'),
}

export const POSTS = {
    SET: createActionType('posts', 'SET'),
    ADD: createActionType('posts', 'ADD'),
    UPDATE: createActionType('posts', 'UPDATE'),
    REMOVE: createActionType('posts', 'REMOVE'),
}

export const UI = {
    SET_CURRENT_VIEW: createActionType('ui', 'SET_CURRENT_VIEW'),
    SET_THEME: createActionType('ui', 'SET_THEME'),
    SHOW_NOTIFICATION: createActionType('ui', 'SHOW_NOTIFICATION'),
    HIDE_NOTIFICATION: createActionType('ui', 'HIDE_NOTIFICATION'),
}