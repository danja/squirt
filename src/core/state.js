export class StateManager {
    constructor() {
        this.state = {
            endpoints: [],
            currentView: null,
            user: null,
            posts: [],
            drafts: []
        };
        this.listeners = new Map();
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    update(key, value) {
        this.state[key] = value;
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => callback(value));
        }
    }

    get(key) {
        return this.state[key];
    }
}

export const state = new StateManager();
