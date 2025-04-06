// src/core/events/event-constants.js
/**
 * Application event type constants
 */
export const EVENTS = {
    // Application events
    APP_INITIALIZED: 'app:initialized',

    // State events
    STATE_CHANGED: 'state:changed',

    // RDF model events
    POST_CREATED: 'rdf:post:created',
    POST_UPDATED: 'rdf:post:updated',
    POST_DELETED: 'rdf:post:deleted',
    MODEL_SYNCED: 'rdf:model:synced',

    // Endpoint events
    ENDPOINT_ADDED: 'endpoint:added',
    ENDPOINT_REMOVED: 'endpoint:removed',
    ENDPOINT_UPDATED: 'endpoint:updated',
    ENDPOINT_STATUS_CHANGED: 'endpoint:status:changed',
    ENDPOINTS_STATUS_CHECKED: 'endpoints:status:checked',
    ENDPOINT_CHECK_REQUESTED: 'endpoint:check:requested',

    // SPARQL events
    SPARQL_QUERY_STARTED: 'sparql:query:started',
    SPARQL_QUERY_COMPLETED: 'sparql:query:completed',
    SPARQL_QUERY_FAILED: 'sparql:query:failed',
    SPARQL_UPDATE_STARTED: 'sparql:update:started',
    SPARQL_UPDATE_COMPLETED: 'sparql:update:completed',
    SPARQL_UPDATE_FAILED: 'sparql:update:failed',

    // UI events
    VIEW_CHANGED: 'ui:view:changed',
    NOTIFICATION_SHOW: 'ui:notification:show',
    FORM_SUBMITTED: 'ui:form:submitted',

    // Error events
    ERROR_OCCURRED: 'error:occurred'
};