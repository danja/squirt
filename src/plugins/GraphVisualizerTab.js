class GraphVisualizerTab {
  constructor(container, turtleContent = '') {
    this.container = container;
    this.turtleContent = turtleContent;
    this.graphVisualizer = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create container for the graph
      this.container.innerHTML = `
        <div id="graph-visualizer" style="width: 100%; height: 600px;"></div>
        <div id="graph-controls" class="graph-controls">
          <button id="refresh-graph">Refresh Graph</button>
          <button id="fit-graph">Fit View</button>
        </div>
      `;

      // Initialize the graph visualizer
      await this._initializeGraphVisualizer();
      
      // Set up event listeners
      document.getElementById('refresh-graph').addEventListener('click', () => this.refreshGraph());
      document.getElementById('fit-graph').addEventListener('click', () => this.fitGraph());
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize GraphVisualizerTab:', error);
      this.container.innerHTML = `
        <div class="error">
          Failed to initialize graph visualization. Check console for details.
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  async _initializeGraphVisualizer() {
    try {
      // Check if Atuin's GraphVisualizer is available
      if (!window.atuin || !window.atuin.GraphVisualizer) {
        throw new Error('Atuin GraphVisualizer not found');
      }
      
      // Create a new graph visualizer instance
      const container = document.getElementById('graph-visualizer');
      this.graphVisualizer = new window.atuin.GraphVisualizer(container, {
        log: console.log,
        error: console.error,
        debug: console.debug
      });
      
      // Initial graph update
      await this.updateGraph();
      
    } catch (error) {
      console.error('Failed to initialize graph visualizer:', error);
      throw error;
    }
  }

  async updateGraph(turtleContent) {
    if (turtleContent) {
      this.turtleContent = turtleContent;
    }
    
    if (!this.graphVisualizer || !this.turtleContent) return;
    
    try {
      // Parse Turtle to RDF triples
      const parser = new N3.Parser();
      const quads = [];
      
      // Parse the Turtle content
      parser.parse(
        this.turtleContent,
        (error, quad, prefixes) => {
          if (error) throw error;
          if (quad) quads.push(quad);
        }
      );
      
      // Convert quads to nodes and edges
      const nodes = new Map();
      const edges = [];
      
      quads.forEach((quad, index) => {
        // Add subject node
        if (!nodes.has(quad.subject.value)) {
          nodes.set(quad.subject.value, {
            id: quad.subject.value,
            label: this._getLabel(quad.subject),
            type: 'uri'
          });
        }
        
        // Handle object (could be URI or literal)
        let objectId;
        if (quad.object.termType === 'NamedNode') {
          objectId = quad.object.value;
          if (!nodes.has(objectId)) {
            nodes.set(objectId, {
              id: objectId,
              label: this._getLabel(quad.object),
              type: 'uri'
            });
          }
        } else {
          // For literals, create a unique ID
          objectId = `literal_${index}`;
          nodes.set(objectId, {
            id: objectId,
            label: this._getLabel(quad.object),
            type: 'literal',
            value: quad.object.value,
            datatype: quad.object.datatype?.value
          });
        }
        
        // Add edge
        edges.push({
          id: `edge_${index}`,
          from: quad.subject.value,
          to: objectId,
          label: this._getLabel(quad.predicate)
        });
      });
      
      // Update the graph
      this.graphVisualizer.updateGraph({
        nodes: Array.from(nodes.values()),
        edges: edges
      });
      
    } catch (error) {
      console.error('Failed to update graph:', error);
      throw error;
    }
  }
  
  _getLabel(term) {
    if (!term) return '';
    
    if (term.termType === 'NamedNode') {
      // Extract the last part of the URI
      const parts = term.value.split(/[#\/]/);
      return parts[parts.length - 1] || term.value;
    } else if (term.termType === 'Literal') {
      // For literals, return the value with quotes
      return `"${term.value}"`;
    } else if (term.termType === 'BlankNode') {
      // For blank nodes, return a shortened ID
      return `_:${term.value.substring(0, 8)}...`;
    }
    
    return term.value || term.toString();
  }
  
  refreshGraph() {
    if (this.graphVisualizer) {
      this.updateGraph();
    }
  }
  
  fitGraph() {
    if (this.graphVisualizer && this.graphVisualizer.network) {
      this.graphVisualizer.network.fit({
        animation: true
      });
    }
  }
  
  destroy() {
    if (this.graphVisualizer) {
      // Clean up the graph visualizer if needed
      if (this.graphVisualizer.network) {
        this.graphVisualizer.network.destroy();
      }
      this.graphVisualizer = null;
    }
    this.container.innerHTML = '';
    this.initialized = false;
  }
}

// Export the class for use in other modules
export { GraphVisualizerTab };
