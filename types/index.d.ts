// Type definitions for Squirt (src/index.d.ts)
// Project-wide types for plugins, events, state, and core services

/**
 * Event bus interface for pub/sub communication
 */
export interface EventBus {
  on(event: string, callback: (data: any) => void): () => void;
  emit(event: string, data?: any): void;
  removeAllListeners(event?: string): void;
}

/**
 * Plugin base class interface
 */
export interface PluginBase {
  id: string;
  options: Record<string, any>;
  container: HTMLElement | null;
  isInitialized: boolean;
  isMounted: boolean;
  initialize(): Promise<void>;
  mount(container: HTMLElement): Promise<void>;
  unmount(): Promise<void>;
  destroy(): Promise<void>;
  updateOptions(newOptions: Record<string, any>): void;
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  register(id: string, plugin: PluginBase, options?: Record<string, any>): void;
  getPlugin(id: string): PluginBase | undefined;
  initializeAll(): Promise<void>;
  mountAll(): Promise<void>;
  unmountAll(): Promise<void>;
  destroyAll(): Promise<void>;
}

/**
 * Redux-like store interface
 */
export interface Store<T = any> {
  getState(): T;
  dispatch(action: any): any;
  subscribe(listener: (state: T) => void): () => void;
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  handle(error: Error, options?: {
    showToUser?: boolean;
    rethrow?: boolean;
    context?: string;
  }): Error;
}

/**
 * Notification type
 */
export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  [key: string]: any;
}

/**
 * RDF post/profile type
 */
export interface RDFPost {
  id: string;
  type: string;
  title?: string;
  content?: string;
  tags?: string[];
  created?: string;
  [key: string]: any;
}

/**
 * RDF model interface
 */
export interface RDFModel {
  createPost(data: Partial<RDFPost>): string;
  getPosts(filter?: Partial<RDFPost>): RDFPost[];
  getPost(id: string): RDFPost | undefined;
  updatePost(id: string, updates: Partial<RDFPost>): boolean;
  deletePost(id: string): boolean;
  syncWithEndpoint(): Promise<void>;
  dataset: any;
}

/**
 * SPARQL query service interface
 */
export interface SparqlService {
  querySparql(endpointUrl: string, query: string, queryType?: string, credentials?: { user: string; password: string }): Promise<any>;
  postToSparql(endpointUrl: string, updateQuery: string, credentials?: { user: string; password: string }): Promise<void>;
  testEndpoint(url: string, credentials?: { user: string; password: string }): Promise<boolean>;
}

/**
 * Endpoint type
 */
export interface Endpoint {
  url: string;
  label: string;
  type: 'query' | 'update';
  status?: string;
  lastChecked?: string;
  credentials?: { user: string; password: string };
}

/**
 * Endpoints service interface
 */
export interface EndpointsService {
  initialize(): Promise<void>;
  getEndpoints(): Endpoint[];
  addEndpoint(endpoint: Endpoint): void;
  removeEndpoint(url: string): void;
  updateEndpoint(url: string, updates: Partial<Endpoint>): void;
}

/**
 * Storage service interface
 */
export interface StorageService {
  getItem<T = any>(key: string): T | null;
  setItem<T = any>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * Main Squirt app namespace
 */
declare namespace Squirt {
  const eventBus: EventBus;
  const pluginManager: PluginManager;
  const store: Store;
  const errorHandler: ErrorHandler;
  const RDFModel: RDFModel;
  const sparqlService: SparqlService;
  const endpointsService: EndpointsService;
  const storageService: StorageService;
} 