export function combineReducers(reducers) {
    return (state = {}, action) => {
        const nextState = {}
        let hasChanged = false

        for (const key in reducers) {
            const reducer = reducers[key]
            const previousStateForKey = state[key]
            const nextStateForKey = reducer(previousStateForKey, action)

            nextState[key] = nextStateForKey
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey
        }

        return hasChanged ? nextState : state
    }
}

export function createAction(type) {
    return (payload) => ({
        type,
        payload
    })
}