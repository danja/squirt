# Squirt Architecture Overview

Squirt is a JavaScript application designed for RDF data management with a focus on SPARQL endpoints interaction. The architecture follows a modular approach with clear separation of concerns.

## Core Components

### Event System

The event system provides a pub/sub mechanism for decoupled communication between components:
- **`src/core/events/event-bus.js`**: Central event bus implementation
- **`src/core/events/event-constants.js`**: Defines standard event types

### State Management

State management follows a Redux-like pattern:
- **`src/core/state/store.js`**: Creates a centralized store
- **`src/core/state/reducers.js`**: Pure functions for state updates
- **`src/core/state/actions.js`**: Action creators
- **`src/core/state/selectors.js`**: Functions to extract data from state
- **`src/core/state/utils.js`**: Helper utilities for state operations

### Error Handling

Standardized error handling system:
- **`src/core/errors/error-handler.js`**: Central error processor
- **`src/core/errors/error-types.js`**: Hierarchy of error classes

### Plugin System

Extensible plugin architecture:
- **`src/core/plugin-base.js`**: Base class for plugins
- **`src/core/plugin-manager.js`**: Manages plugin lifecycle

## Domain Layer

- **`src/domain/rdf/model.js`**: Core RDF data model

## Services Layer

- **`src/services/endpoints/endpoints-service.js`**: SPARQL endpoint management
- **`src/services/rdf/rdf-model.js`**: RDF data operations
- **`src/services/sparql/sparql.js`**: SPARQL query execution
- **`src/services/storage/storage-service.js`**: Data persistence

## UI Layer

- **`src/ui/router.js`**: Navigation management
- **`src/ui/views/*.js`**: View implementations
- **`src/ui/components/*.js`**: Reusable UI components
- **`src/ui/notifications/notifications.js`**: User notifications

## Plugins

- **`src/plugins/wiki-plugin.js`**: Wiki editor functionality
- **`src/plugins/yasgui-plugin.js`**: SPARQL editor integration

## Application Entry

- **`src/app.js`**: Main application entry point
