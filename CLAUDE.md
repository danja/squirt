# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with webpack dev server on port 9002
- `npm run build` - Production build using webpack (cleans dist first)
- `npm test` - Run tests with vitest
- `npm run test:ui` - Run tests with interactive vitest UI
- `npm run coverage` - Run tests with coverage report
- Tests are located in `src/**/*.{test,spec}.js` files and run with vitest + jsdom for DOM testing

## Architecture Overview

Squirt is a plugin-based Progressive Web App built with vanilla JavaScript and webpack. The architecture follows a modular pattern with Redux-style state management.

### Core Systems

- **Plugin System**: Central to the application. Plugins extend functionality and are managed by `PluginManager` with lifecycle hooks (initialize, mount, unmount, destroy)
- **State Management**: Redux-style store in `src/core/state/` with actions, reducers, and selectors
- **Event System**: Uses `evb` (Event Bus) library for global event communication
- **Router**: Hash-based routing in `src/ui/router.js` that manages view transitions and plugin activation
- **View System**: Each view is a separate module in `src/ui/views/` with lazy loading

### Plugin Development

All plugins must extend `PluginBase` from `src/core/plugin-base.js`. Plugins are:
- Registered in `src/plugins.config.json` with enable/disable flags
- Auto-loaded from `src/plugins/index.js` during app initialization
- Activated/deactivated based on current view routing
- Given dedicated DOM containers for rendering

### Key Patterns

- Views are lazily loaded modules that export an `initView()` function
- Services are available globally via `window.services` object
- RDF/SPARQL integration through dedicated services in `src/services/`
- Error handling centralized through `errorHandler` in `src/core/errors/`
- All async operations use promises/async-await

### Configuration

- Webpack entry point: `src/app.js`
- Plugin configuration: `src/plugins.config.json` 
- Main config file: `src/config.json`
- Test setup: vitest with jsdom environment for DOM testing

### File Structure Notes

- `src/core/` - Core systems (plugins, state, events, errors)
- `src/services/` - Business logic services (RDF, SPARQL, storage, endpoints)
- `src/ui/` - User interface (router, views, components, notifications)
- `src/plugins/` - Plugin implementations
- `src/domain/` - Domain models and business objects
- `src/css/` - Stylesheets organized by purpose