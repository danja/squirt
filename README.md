# Squirt

[![CI](https://github.com/hyperdata/squirt/actions/workflows/ci.yml/badge.svg)](https://github.com/hyperdata/squirt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/hyperdata/squirt/branch/main/graph/badge.svg)](https://codecov.io/gh/hyperdata/squirt)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/danja/squirt)

A plugin-based browser/PWA primarily for posting information to the web, built with vanilla JavaScript. *My Little Swiss Army Knife.*

There's still loads to implement. The description below came from an assistant who is prone to hyperbole.

## Overview

Squirt is designed to make it easy to create, manage, and publish content to the web with support for multiple formats including RDF/Turtle, SPARQL queries, and traditional web content. The application features a flexible plugin system that allows for extensible functionality.

**Status 2025-06-12 :** Core functionality implemented with plugin system fully operational. Professional drawing capabilities added via Excalidraw integration. *Ready for active use and further development.*

## [Demo](https://tensegrity.it/squirt)

It is installable on mobile devices as a PWA, and you can **Share to** it.

There is also a demo [bookmarklet](https://tensegrity.it/squirt/bookmarklet.html).

## Features

### Core Functionality
- **Post Creation**: Create and publish web content with metadata extraction
- **Professional Drawing**: Full Excalidraw integration with complete drawing toolset
- **Wiki System**: Markdown-supported wiki for knowledge management  
- **Chat Interface**: Interactive communication system
- **Profile Management**: User profile and settings management
- **SPARQL Integration**: Query and update RDF data with built-in SPARQL endpoints

### Plugin Architecture
- **Extensible Plugin System**: Modular architecture supporting main tab contributions
- **Dynamic Navigation**: Navigation tabs are built dynamically from core + plugin contributions
- **Event-Driven Communication**: Uses `evb` event bus for loose coupling between components
- **Redux-Style State Management**: Centralized state management with actions, reducers, and selectors

### Advanced Features
- **Drawing & Diagramming**: Complete Excalidraw integration with shapes, arrows, text, images, and collaborative features
- **RDF/Turtle Editor**: Professional code editor with syntax highlighting (via Atuin plugin)
- **Graph Visualization**: Interactive RDF graph visualization (via Atuin plugin) 
- **Progressive Web App**: Full PWA support with offline capabilities
- **Responsive Design**: Mobile-first responsive layout
- **Theme Support**: Light/dark theme with system preference detection

## Architecture

### Core Structure
```
src/
├── app.js                 # Application entry point
├── core/                  # Core systems
│   ├── plugin-base.js     # Base plugin class
│   ├── plugin-manager.js  # Plugin lifecycle management
│   ├── state/            # Redux-style state management
│   └── errors/           # Error handling
├── ui/                   # User interface
│   ├── router.js         # Hash-based routing with plugin support
│   ├── views/           # View modules (lazy-loaded)
│   └── components/      # Reusable UI components
├── services/            # Business logic services
│   ├── rdf/            # RDF data handling
│   ├── sparql/         # SPARQL query services
│   └── storage/        # Data persistence
├── plugins/            # Plugin implementations
└── domain/             # Domain models and business objects
```

### Plugin System
Plugins can contribute main navigation tabs by extending `PluginBase` and implementing:
```javascript
getMainTabContributions() {
  return [
    { id: 'my-tab', label: 'My Tab', component: 'MyComponent' }
  ]
}

async mountTabComponent(tabId, container) {
  // Mount specific tab component
}
```

### Current Plugins
- **Draw Plugin**: Professional drawing and diagramming with full Excalidraw integration
- **Atuin Plugin**: Provides Turtle Editor, SPARQL Query, and Graph Visualization tabs
- **Wiki Plugin**: Enhanced wiki functionality  
- **Additional plugins** can be added via the plugin configuration

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Development Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/hyperdata/squirt.git
   cd squirt
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:9002 in your browser

### Production Build
```bash
npm run build
```

## Configuration

### SPARQL Endpoints
Default endpoints are automatically configured:
- **Query**: `https://fuseki.hyperdata.it/squirt/query`
- **Update**: `https://fuseki.hyperdata.it/squirt/update`

Additional endpoints can be added via Settings > SPARQL Endpoints.

### Plugin Configuration
Plugins are configured in `src/plugins.config.json`:
```json
{
  "plugins": [
    {
      "id": "draw-plugin",
      "enabled": true
    },
    {
      "id": "atuin-plugin",
      "enabled": true
    }
  ]
}
```

## Usage

### Basic Operations
1. **Creating Posts**: Use the Post tab to create content with automatic metadata extraction
2. **Drawing & Diagramming**: Use the Draw tab for professional drawing with shapes, arrows, text, and collaborative features
3. **Wiki Pages**: Create and edit wiki pages with Markdown support
4. **RDF Data**: Use the Turtle tab for RDF data creation and editing
5. **SPARQL Queries**: Execute SPARQL queries via the SPARQL tab
6. **Data Visualization**: View RDF data as interactive graphs in the Graph tab

### Plugin Management
Access Settings > Plugins to:
- Enable/disable plugins
- View plugin status and contributions
- Reload the application to apply changes

### Drawing & Diagramming (Draw Tab)
The Draw tab provides a complete professional drawing environment powered by Excalidraw:
- **Drawing Tools**: Selection, hand tool, shapes (rectangle, diamond, ellipse), arrows, lines, freehand drawing
- **Content Tools**: Text insertion, image embedding, eraser
- **Advanced Features**: Library of pre-made elements, zoom controls, undo/redo
- **Export Options**: PNG export, collaborative features ready
- **Keyboard Shortcuts**: Full keyboard support for professional workflows
- **Responsive**: Works seamlessly on desktop and mobile devices

### Theme & Appearance
- Switch between light/dark themes
- Responsive design adapts to mobile and desktop
- System theme preference detection

## Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Production build
- `npm run test` - Run test suite
- `npm run test:ui` - Run tests with UI
- `npm run coverage` - Generate coverage report

### Plugin Development
1. Create a new plugin class extending `PluginBase`
2. Implement required methods (`initialize`, `mount`, `unmount`, `destroy`)
3. Add main tab contributions via `getMainTabContributions()`
4. Register the plugin in `src/plugins.config.json`
5. Import and register in `src/plugins/index.js`

Example plugin structure:
```javascript
import { PluginBase } from '../core/plugin-base.js'

export class MyPlugin extends PluginBase {
  constructor() {
    super('my-plugin', {
      providesMainTabs: [
        { id: 'my-tab', label: 'My Tab', component: 'MyComponent' }
      ]
    })
  }
  
  async initialize() {
    // Plugin initialization logic
  }
  
  async mountTabComponent(tabId, container) {
    // Mount tab-specific component
  }
}
```

### Architecture Patterns
- **Event-Driven**: Use `eventBus.emit()` and `eventBus.on()` for component communication
- **State Management**: Dispatch actions via `store.dispatch()`, access state via selectors
- **Error Handling**: Use centralized `errorHandler.handle()` for consistent error management
- **Lazy Loading**: Views and heavy components are loaded on-demand

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Progressive Web App features require modern browser support.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Commit your changes: `git commit -m 'Add my feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Submit a pull request

### Code Style
- Use ESM modules (`import`/`export`)
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use async/await for asynchronous operations
- Maintain plugin system compatibility

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- **[Atuin](https://github.com/hyperdata/atuin)**: Professional RDF editing and visualization library
- **[evb](https://github.com/hyperdata/evb)**: Event bus library for loose coupling

## Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide detailed reproduction steps for bugs

## Roadmap

- [x] **Professional Drawing Tools** - Complete Excalidraw integration ✅
- [x] **Plugin System** - Fully operational modular architecture ✅
- [ ] Enhanced SPARQL query builder
- [ ] Additional visualization options
- [ ] Plugin marketplace
- [ ] Real-time collaboration features for drawing
- [ ] Advanced RDF validation
- [ ] Export/import improvements
- [ ] Drawing-to-RDF conversion tools

---

Built with ❤️ for the Semantic Web community.


