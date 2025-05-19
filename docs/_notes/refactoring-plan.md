# Refactoring Plan for Squirt

## Issues Identified

1. **Circular Dependencies**:
   - State management is tightly coupled with services
   - Components reference each other directly

2. **Inconsistent Error Handling**:
   - Mix of direct console.error and ErrorHandler usage
   - Inconsistent notification of errors to users

3. **Tight UI and Data Coupling**:
   - UI components directly manipulate RDF data model
   - UI state changes mixed with business logic

4. **Mixed Responsibilities**:
   - Some modules handle both data processing and UI rendering
   - Missing clear separation of concerns

5. **Sparse Testing**:
   - Limited unit tests for critical components
   - No integration testing

## Refactoring Strategy

### 1. Create Clear Architecture

```
src/
  ├── core/               # Application core
  │   ├── config/         # Configuration handling
  │   ├── state/          # State management
  │   └── errors/         # Error handling
  ├── domain/             # Domain logic
  │   ├── models/         # Data models
  │   ├── rdf/            # RDF related functionality
  │   └── sparql/         # SPARQL related functionality
  ├── ui/                 # User interface
  │   ├── components/     # Reusable UI components
  │   ├── views/          # Page views
  │   ├── forms/          # Form handling
  │   └── notifications/  # User notification system
  ├── services/           # External services
  │   ├── storage/        # Storage service (localstorage, etc.)
  │   ├── network/        # Network request handling
  │   └── endpoints/      # Endpoint management
  └── utils/              # Utility functions
```

### 2. Break Circular Dependencies

1. **Create a Mediator/Event Bus**
   - Implement a simple pub/sub event system
   - Components communicate through events, not direct references

2. **Dependency Injection**
   - Pass dependencies to modules rather than importing directly
   - Use factory functions to create instances with dependencies

3. **Interface-Based Programming**
   - Define clear interfaces for services
   - Allow for different implementations

### 3. Standardize Error Handling

1. **Create Error Classes Hierarchy**
   - Define specific error types for different scenarios
   - Include appropriate metadata for each error type

2. **Centralized Error Processing**
   - Enhance ErrorHandler to handle all error types consistently
   - Add error event system for components to subscribe to

3. **User-Facing Error Management**
   - Standardize error notification system
   - Improve error recovery options

### 4. Improve Testing Infrastructure

1. **Unit Testing Framework**
   - Complete unit tests for core functionality
   - Mock external dependencies for isolation

2. **Integration Tests**
   - Test component interactions
   - Add end-to-end tests for critical user flows

3. **Test Utilities**
   - Create helpers for common testing tasks
   - Add fixtures for test data

## Specific Modules to Refactor

### State Management

```javascript
// Before: src/js/core/state.js
export class StateManager {
    constructor() {
        this.state = {/* ... */};
        this.listeners = new Map();
    }
    // Methods...
}
export const state = new StateManager();
```

```javascript
// After: src/core/state/index.js
import { createStore } from './store';
import { stateReducer } from './reducer';

export const store = createStore(stateReducer);
export { connect } from './connect';
export * from './actions';
```

### Error Handling

```javascript
// Before: src/js/core/errors.js
export class AppError extends Error {/* ... */}
export const ErrorHandler = {/* ... */};
```

```javascript
// After: src/core/errors/index.js
export * from './error-types';
export * from './error-handler';
export * from './error-boundary';
```

### RDF Model Refactoring

```javascript
// Before: src/js/services/rdf/rdf-model.js
export class RDFModel {
    constructor() {
        // Directly imports and uses state
    }
    // Methods that mix persistence and domain logic
}
export const rdfModel = new RDFModel();
```

```javascript
// After: src/domain/rdf/model.js
export class RDFModel {
    constructor(storage, eventBus) {
        this.storage = storage;
        this.eventBus = eventBus;
    }
    // Pure domain logic methods
}

// src/services/rdf/rdf-service.js
export class RDFService {
    constructor(model, storage, state) {
        this.model = model;
        this.storage = storage;
        this.state = state;
    }
    // Service methods (persistence, etc.)
}
```

## Implementation Strategy

1. **Create Core Infrastructure First**
   - Event system
   - New state management
   - Error handling framework
   
2. **Refactor Domain Models**
   - Separate data structure from operations
   - Create pure functions where possible
   
3. **Refactor Services**
   - Implement service interfaces
   - Break circular dependencies
   
4. **Update UI Components Last**
   - Connect to new state management
   - Use event system for communication

5. **Iterative Testing Throughout**
   - Add tests for each refactored component
   - Ensure original functionality is preserved

## Sample Implementation Timeline

1. **Phase 1 (Foundation)**
   - Set up new folder structure
   - Implement event system
   - Create interfaces for core services
   
2. **Phase 2 (Core Services)**
   - Refactor state management
   - Implement error handling system
   - Update RDF and SPARQL services
   
3. **Phase 3 (UI Layer)**
   - Refactor UI components
   - Update routing
   - Enhance form handling
   
4. **Phase 4 (Testing & Polish)**
   - Complete test coverage
   - Fix edge cases
   - Document new architecture
