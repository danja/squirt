/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 144:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.EndpointStatusIndicator = void 0;
exports.initializeEndpointIndicator = initializeEndpointIndicator;
var _eventBus = __webpack_require__(3068);
var _index = __webpack_require__(5531);
var _selectors = __webpack_require__(3485);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * Component for displaying endpoint status in the UI
 */
var EndpointStatusIndicator = exports.EndpointStatusIndicator = /*#__PURE__*/function () {
  function EndpointStatusIndicator() {
    _classCallCheck(this, EndpointStatusIndicator);
    // Bind methods
    this.handleEndpointChange = this.handleEndpointChange.bind(this);
    this.handleStatusChangeEvent = this.handleStatusChangeEvent.bind(this);
    this.handleStatusCheckedEvent = this.handleStatusCheckedEvent.bind(this);
    this.checkEndpoints = this.checkEndpoints.bind(this);
    this.indicator = document.getElementById('endpoint-status-indicator');
    if (!this.indicator) {
      console.error('Endpoint status indicator element not found');
      return;
    }

    // Get status light element
    this.statusLight = this.indicator.querySelector('.status-light');

    // Initialize with checking status
    this.updateStatus('checking', 'Checking endpoint status...');

    // Subscribe to endpoint changes in the store
    _index.store.subscribe(this.handleEndpointChange);

    // Subscribe to endpoint status events
    _eventBus.eventBus.on(_eventBus.EVENTS.ENDPOINT_STATUS_CHANGED, this.handleStatusChangeEvent);
    _eventBus.eventBus.on(_eventBus.EVENTS.ENDPOINTS_STATUS_CHECKED, this.handleStatusCheckedEvent);

    // Make the indicator clickable to trigger endpoint checks
    this.indicator.addEventListener('click', this.checkEndpoints);

    // Initial check
    setTimeout(this.checkEndpoints, 1000);
  }

  /**
   * Handle changes to endpoints in the store
   * @param {Object} state - Current state
   */
  return _createClass(EndpointStatusIndicator, [{
    key: "handleEndpointChange",
    value: function handleEndpointChange(state) {
      try {
        var endpoints = (0, _selectors.getEndpoints)(state);
        if (!endpoints || endpoints.length === 0) {
          this.updateStatus('inactive', 'No endpoints configured');
          return;
        }
        var activeEndpoint = endpoints.find(function (e) {
          return e.status === 'active';
        });
        if (activeEndpoint) {
          this.updateStatus('active', "SPARQL endpoint available: ".concat(activeEndpoint.url));
        } else if (endpoints.some(function (e) {
          return e.status === 'checking';
        })) {
          this.updateStatus('checking', 'Checking endpoints...');
        } else {
          this.updateStatus('inactive', 'No available endpoints');
        }
      } catch (error) {
        console.error('Error handling endpoint change:', error);
      }
    }

    /**
     * Handle endpoint status change events
     * @param {Object} event - Event data
     */
  }, {
    key: "handleStatusChangeEvent",
    value: function handleStatusChangeEvent(data) {
      try {
        if (data) {
          var status = data.status,
            url = data.url;
          if (status === 'active') {
            this.updateStatus('active', "SPARQL endpoint available: ".concat(url));
          } else if (status === 'checking') {
            this.updateStatus('checking', 'Checking endpoint...');
          } else {
            this.updateStatus('inactive', "Endpoint unavailable: ".concat(url));
          }
        }
      } catch (error) {
        console.error('Error handling status change event:', error);
      }
    }

    /**
     * Handle endpoint status checked events
     * @param {Object} data - Event data
     */
  }, {
    key: "handleStatusCheckedEvent",
    value: function handleStatusCheckedEvent(data) {
      try {
        if (data && data.anyActive) {
          // At least one endpoint is active
          var endpoints = (0, _selectors.getEndpoints)(_index.store.getState());
          var activeEndpoint = endpoints.find(function (e) {
            return e.status === 'active';
          });
          if (activeEndpoint) {
            this.updateStatus('active', "SPARQL endpoint available: ".concat(activeEndpoint.url));
          } else {
            this.updateStatus('active', 'SPARQL endpoint is available');
          }
        } else {
          this.updateStatus('inactive', 'No available endpoints');
        }
      } catch (error) {
        console.error('Error handling status checked event:', error);
      }
    }

    /**
     * Request endpoint check
     */
  }, {
    key: "checkEndpoints",
    value: function checkEndpoints() {
      try {
        this.updateStatus('checking', 'Checking endpoints...');

        // Emit event to request endpoint check
        _eventBus.eventBus.emit(_eventBus.EVENTS.ENDPOINT_CHECK_REQUESTED);
      } catch (error) {
        console.error('Error requesting endpoint check:', error);
      }
    }

    /**
     * Update the status indicator
     * @param {string} status - Status value ('active', 'inactive', 'checking')
     * @param {string} message - Status message or tooltip
     */
  }, {
    key: "updateStatus",
    value: function updateStatus(status) {
      var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      try {
        if (!this.statusLight) return;

        // Remove all status classes
        this.statusLight.classList.remove('active', 'inactive', 'checking');

        // Add the new status class
        this.statusLight.classList.add(status);

        // Set the tooltip
        this.indicator.title = message || status;
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
  }]);
}();
/**
 * Initialize the endpoint status indicator
 * @returns {EndpointStatusIndicator|null}
 */
function initializeEndpointIndicator() {
  try {
    return new EndpointStatusIndicator();
  } catch (error) {
    console.error('Error initializing endpoint indicator:', error);
    return null;
  }
}

/***/ }),

/***/ 338:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ 1188:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.state = exports.StateManager = void 0;
Object.defineProperty(exports, "store", ({
  enumerable: true,
  get: function get() {
    return _index.store;
  }
}));
var _index = __webpack_require__(5531);
var actions = _interopRequireWildcard(__webpack_require__(1272));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * @deprecated Use Redux store and actions directly instead.
 * Import from './state/index.js' for store and selectors.
 */
var StateManager = exports.StateManager = /*#__PURE__*/function () {
  function StateManager() {
    var _this = this;
    _classCallCheck(this, StateManager);
    this.state = {
      endpoints: [],
      currentView: null,
      user: null,
      posts: [],
      drafts: []
    };
    this.listeners = new Map();

    // Initialize with Redux store state
    this.state = _objectSpread({}, _index.store.getState());

    // Subscribe to Redux store updates
    _index.store.subscribe(function () {
      var newState = _index.store.getState();

      // Find which keys changed
      var changedKeys = Object.keys(newState).filter(function (key) {
        return newState[key] !== _this.state[key];
      });

      // Update local state
      _this.state = _objectSpread({}, newState);

      // Notify listeners of changes
      var _iterator = _createForOfIteratorHelper(changedKeys),
        _step;
      try {
        var _loop = function _loop() {
          var key = _step.value;
          var listenerSet = _this.listeners.get(key);
          if (listenerSet) {
            listenerSet.forEach(function (listener) {
              try {
                listener(newState[key]);
              } catch (error) {
                console.error('Error in state listener:', error);
              }
            });
          }
        };
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          _loop();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    });
  }

  /**
   * @deprecated Use store.subscribe() directly
   */
  return _createClass(StateManager, [{
    key: "subscribe",
    value: function subscribe(key, callback) {
      var _this2 = this;
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set());
      }
      this.listeners.get(key).add(callback);

      // Return unsubscribe function
      return function () {
        var listeners = _this2.listeners.get(key);
        if (listeners) {
          listeners["delete"](callback);
          if (listeners.size === 0) {
            _this2.listeners["delete"](key);
          }
        }
      };
    }

    /**
     * @deprecated Use Redux actions directly
     */
  }, {
    key: "update",
    value: function update(key, value) {
      // Translate to Redux actions for specific keys
      switch (key) {
        case 'currentView':
          _index.store.dispatch(actions.setCurrentView(value));
          break;
        case 'posts':
          _index.store.dispatch(actions.setPosts(value));
          break;
        case 'endpoints':
          _index.store.dispatch(actions.setEndpoints(value));
          break;
        case 'ui':
          // Handle nested ui state
          if (value && value.theme) {
            _index.store.dispatch(actions.setTheme(value.theme));
          }
          if (value && value.currentView) {
            _index.store.dispatch(actions.setCurrentView(value.currentView));
          }
          // Handle notifications if needed
          if (value && value.notifications) {
            value.notifications.forEach(function (notification) {
              _index.store.dispatch(actions.showNotification(notification));
            });
          }
          break;
        default:
          console.warn("No specific action found for state key: ".concat(key, ". State update may be lost."));
          break;
      }
    }

    /**
     * @deprecated Use Redux selectors directly
     */
  }, {
    key: "get",
    value: function get(key) {
      return this.state[key];
    }
  }]);
}(); // Export the singleton instance for backward compatibility
var state = exports.state = new StateManager();

// Also export the Redux store for direct access in new code

/***/ }),

/***/ 1272:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.updatePost = exports.updateEndpoint = exports.showNotification = exports.setTheme = exports.setPosts = exports.setEndpoints = exports.setCurrentView = exports.removePost = exports.removeEndpoint = exports.hideNotification = exports.addPost = exports.addEndpoint = void 0;
var types = _interopRequireWildcard(__webpack_require__(7525));
var _utils = __webpack_require__(9510);
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
var setEndpoints = exports.setEndpoints = (0, _utils.createAction)(types.SET_ENDPOINTS);
var addEndpoint = exports.addEndpoint = (0, _utils.createAction)(types.ADD_ENDPOINT);
var removeEndpoint = exports.removeEndpoint = (0, _utils.createAction)(types.REMOVE_ENDPOINT);
var updateEndpoint = exports.updateEndpoint = (0, _utils.createAction)(types.UPDATE_ENDPOINT);
var setPosts = exports.setPosts = (0, _utils.createAction)(types.SET_POSTS);
var addPost = exports.addPost = (0, _utils.createAction)(types.ADD_POST);
var updatePost = exports.updatePost = (0, _utils.createAction)(types.UPDATE_POST);
var removePost = exports.removePost = (0, _utils.createAction)(types.REMOVE_POST);
var setCurrentView = exports.setCurrentView = (0, _utils.createAction)(types.SET_CURRENT_VIEW);
var setTheme = exports.setTheme = (0, _utils.createAction)(types.SET_THEME);
var showNotification = exports.showNotification = (0, _utils.createAction)(types.SHOW_NOTIFICATION);
var hideNotification = exports.hideNotification = (0, _utils.createAction)(types.HIDE_NOTIFICATION);

/***/ }),

/***/ 1968:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.createStorageService = createStorageService;
exports.storageService = void 0;
var _errorTypes = __webpack_require__(9587);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // src/services/storage/storage-service.js
/**
 * Simple localStorage wrapper
 */
var StorageService = /*#__PURE__*/function () {
  function StorageService() {
    var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'squirt_';
    _classCallCheck(this, StorageService);
    this.prefix = prefix;
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {*} Stored value or null if not found
   */
  return _createClass(StorageService, [{
    key: "getItem",
    value: function getItem(key) {
      try {
        var value = localStorage.getItem("".concat(this.prefix).concat(key));
        if (value === null) return null;
        try {
          // Attempt to parse as JSON
          return JSON.parse(value);
        } catch (e) {
          // Return as-is if not JSON
          return value;
        }
      } catch (error) {
        console.error("Error getting item ".concat(key, ":"), error);
        throw new _errorTypes.StorageError("Failed to get item \"".concat(key, "\" from localStorage"));
      }
    }

    /**
     * Store item in storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     */
  }, {
    key: "setItem",
    value: function setItem(key, value) {
      try {
        var serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem("".concat(this.prefix).concat(key), serializedValue);
      } catch (error) {
        console.error("Error setting item ".concat(key, ":"), error);
        throw new _errorTypes.StorageError("Failed to set item \"".concat(key, "\" in localStorage"));
      }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     */
  }, {
    key: "removeItem",
    value: function removeItem(key) {
      try {
        localStorage.removeItem("".concat(this.prefix).concat(key));
      } catch (error) {
        console.error("Error removing item ".concat(key, ":"), error);
        throw new _errorTypes.StorageError("Failed to remove item \"".concat(key, "\" from localStorage"));
      }
    }
  }]);
}(); // Create and export singleton instance
var storageService = exports.storageService = new StorageService();

// Factory function for creating new instances
function createStorageService(prefix) {
  return new StorageService(prefix);
}

/***/ }),

/***/ 3068:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
Object.defineProperty(exports, "EVENTS", ({
  enumerable: true,
  get: function get() {
    return _eventConstants.EVENTS;
  }
}));
exports.eventBus = void 0;
var _eventConstants = __webpack_require__(3415);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * Simple event bus for pub/sub communication
 */
var EventBus = /*#__PURE__*/function () {
  function EventBus() {
    _classCallCheck(this, EventBus);
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler function
   * @returns {Function} Unsubscribe function
   */
  return _createClass(EventBus, [{
    key: "on",
    value: function on(event, callback) {
      var _this = this;
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);

      // Return unsubscribe function
      return function () {
        var callbacks = _this.listeners.get(event);
        if (callbacks) {
          callbacks["delete"](callback);
          if (callbacks.size === 0) {
            _this.listeners["delete"](event);
          }
        }
      };
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
  }, {
    key: "emit",
    value: function emit(event, data) {
      var callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach(function (callback) {
          try {
            callback(data);
          } catch (error) {
            console.error("Error in event listener for \"".concat(event, "\":"), error);
          }
        });
      }
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} [event] - Event name (optional, removes all if not specified)
     */
  }, {
    key: "removeAllListeners",
    value: function removeAllListeners(event) {
      if (event) {
        this.listeners["delete"](event);
      } else {
        this.listeners.clear();
      }
    }
  }]);
}(); // Create singleton instance
var eventBus = exports.eventBus = new EventBus();

// Export events

/***/ }),

/***/ 3333:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
var _exportNames = {
  errorHandler: true,
  createAndHandleError: true
};
exports.createAndHandleError = createAndHandleError;
exports.errorHandler = void 0;
var _eventBus = __webpack_require__(3068);
var ErrorTypes = _interopRequireWildcard(__webpack_require__(9587));
Object.keys(ErrorTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === ErrorTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return ErrorTypes[key];
    }
  });
});
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
// Add ValidationError if not present in error-types.js
if (!ErrorTypes.ValidationError) {
  ErrorTypes.ValidationError = /*#__PURE__*/function (_ErrorTypes$AppError) {
    function ValidationError(message) {
      var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      _classCallCheck(this, ValidationError);
      return _callSuper(this, ValidationError, [message, 'VALIDATION_ERROR', details]);
    }
    _inherits(ValidationError, _ErrorTypes$AppError);
    return _createClass(ValidationError);
  }(ErrorTypes.AppError);
}

/**
 * Central error handler for the application
 */
var ErrorHandler = /*#__PURE__*/function () {
  function ErrorHandler(eventBus) {
    _classCallCheck(this, ErrorHandler);
    this.eventBus = eventBus;
    this.errorLog = [];
    this.maxLogSize = 50;
  }

  /**
   * Handle an error
   * @param {Error} error - Error object to handle
   * @param {Object} options - Handler options
   * @param {boolean} options.showToUser - Whether to show error to user
   * @param {boolean} options.rethrow - Whether to rethrow the error
   * @param {string} options.context - Error context
   * @returns {AppError} Normalized error
   */
  return _createClass(ErrorHandler, [{
    key: "handle",
    value: function handle(error) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var _options$showToUser = options.showToUser,
        showToUser = _options$showToUser === void 0 ? true : _options$showToUser,
        _options$rethrow = options.rethrow,
        rethrow = _options$rethrow === void 0 ? false : _options$rethrow,
        _options$context = options.context,
        context = _options$context === void 0 ? null : _options$context;

      // Normalize error
      var appError = this.normalizeError(error, context);

      // Log the error
      this.logError(appError);

      // Emit error event
      this.eventBus.emit(_eventBus.EVENTS.ERROR_OCCURRED, appError);

      // Show error to user if requested
      if (showToUser) {
        this.showToUser(appError);
      }

      // Rethrow error if requested
      if (rethrow) {
        throw appError;
      }
      return appError;
    }

    /**
     * Normalize an error to an AppError type
     * @param {Error} error - Error to normalize
     * @param {string} context - Error context
     * @returns {AppError} Normalized error
     */
  }, {
    key: "normalizeError",
    value: function normalizeError(error) {
      var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      // If already an AppError, just add context if needed
      if (error instanceof ErrorTypes.AppError) {
        if (context && !error.details.context) {
          error.details.context = context;
        }
        return error;
      }

      // Classify common error types
      if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
        return new ErrorTypes.NetworkError(error.message, {
          originalError: error,
          context: context
        });
      }
      if (error.name === 'SyntaxError' || error.message.includes('syntax')) {
        return new ErrorTypes.ValidationError(error.message, {
          originalError: error,
          context: context
        });
      }
      if (error.message.includes('SPARQL') || error.message.includes('endpoint')) {
        return new ErrorTypes.SparqlError(error.message, {
          originalError: error,
          context: context
        });
      }
      if (error.message.includes('localStorage') || error.message.includes('storage')) {
        return new ErrorTypes.StorageError(error.message, {
          originalError: error,
          context: context
        });
      }

      // Default to general AppError
      return new ErrorTypes.AppError(error.message || 'Unknown error', 'UNKNOWN_ERROR', {
        originalError: error,
        stack: error.stack,
        context: context
      });
    }

    /**
     * Log an error
     * @param {AppError} error - Error to log
     */
  }, {
    key: "logError",
    value: function logError(error) {
      // Log to console
      console.error('Error:', error);

      // Add to internal log
      this.errorLog.unshift({
        error: error,
        timestamp: new Date()
      });

      // Trim log if needed
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog = this.errorLog.slice(0, this.maxLogSize);
      }

      // Report to analytics if available
      this.reportToAnalytics(error);
    }

    /**
     * Show error to user
     * @param {AppError} error - Error to show
     */
  }, {
    key: "showToUser",
    value: function showToUser(error) {
      var message = error.message;

      // Use notification system to show error
      this.eventBus.emit(_eventBus.EVENTS.NOTIFICATION_SHOW, {
        type: 'error',
        message: message,
        duration: 5000,
        error: error
      });
    }

    /**
     * Report error to analytics
     * @param {AppError} error - Error to report
     */
  }, {
    key: "reportToAnalytics",
    value: function reportToAnalytics(error) {
      // Check if analytics is available
      if (window.errorAnalytics) {
        window.errorAnalytics.push({
          type: error.name,
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    /**
     * Get error log
     * @returns {Array} Error log
     */
  }, {
    key: "getErrorLog",
    value: function getErrorLog() {
      return _toConsumableArray(this.errorLog);
    }

    /**
     * Clear error log
     */
  }, {
    key: "clearErrorLog",
    value: function clearErrorLog() {
      this.errorLog = [];
    }
  }]);
}(); // Create singleton instance
var errorHandler = exports.errorHandler = new ErrorHandler(_eventBus.eventBus);

/**
 * Create and handle an error
 * @param {string} message - Error message
 * @param {string} userMessage - User-friendly message
 * @param {string} code - Error code
 * @param {Object} options - Handler options
 * @returns {AppError} Handled error
 */
function createAndHandleError(message, userMessage) {
  var code = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'APP_ERROR';
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var error = new ErrorTypes.AppError(message, code);
  if (userMessage) {
    error.userMessage = userMessage;
  }
  return errorHandler.handle(error, options);
}

// Export error types

/***/ }),

/***/ 3415:
/***/ ((__unused_webpack_module, exports) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.EVENTS = void 0;
/**
 * Application event constants
 * @type {Object}
 */
var EVENTS = exports.EVENTS = {
  // Application lifecycle events
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

/***/ }),

/***/ 3485:
/***/ ((__unused_webpack_module, exports) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.getTheme = exports.getPreviousView = exports.getPostsByType = exports.getPostsByTag = exports.getPosts = exports.getPostById = exports.getNotifications = exports.getEndpoints = exports.getEndpointByUrl = exports.getCurrentView = exports.getActiveEndpoints = exports.getActiveEndpoint = void 0;
var getEndpoints = exports.getEndpoints = function getEndpoints(state) {
  return state.endpoints;
};
var getActiveEndpoints = exports.getActiveEndpoints = function getActiveEndpoints(state) {
  return state.endpoints.filter(function (e) {
    return e.status === 'active';
  });
};
var getEndpointByUrl = exports.getEndpointByUrl = function getEndpointByUrl(state, url) {
  return state.endpoints.find(function (e) {
    return e.url === url;
  });
};
var getActiveEndpoint = exports.getActiveEndpoint = function getActiveEndpoint(state, type) {
  return state.endpoints.find(function (e) {
    return e.type === type && e.status === 'active';
  });
};
var getPosts = exports.getPosts = function getPosts(state) {
  return state.posts;
};
var getPostById = exports.getPostById = function getPostById(state, id) {
  return state.posts.find(function (p) {
    return p.id === id;
  });
};
var getPostsByType = exports.getPostsByType = function getPostsByType(state, type) {
  return state.posts.filter(function (p) {
    return p.type === type;
  });
};
var getPostsByTag = exports.getPostsByTag = function getPostsByTag(state, tag) {
  return state.posts.filter(function (p) {
    return p.tags.includes(tag);
  });
};
var getCurrentView = exports.getCurrentView = function getCurrentView(state) {
  return state.ui.currentView;
};
var getPreviousView = exports.getPreviousView = function getPreviousView(state) {
  return state.ui.previousView;
};
var getTheme = exports.getTheme = function getTheme(state) {
  return state.ui.theme;
};
var getNotifications = exports.getNotifications = function getNotifications(state) {
  return state.ui.notifications;
};

/***/ }),

/***/ 4132:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.pluginManager = exports.PluginManager = void 0;
var _errors = __webpack_require__(7286);
var _state = __webpack_require__(1188);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // src/js/core/plugin-manager.js
// Central registry and lifecycle manager for all plugins
/**
 * Manages the lifecycle and registration of all plugins in the application
 */
var PluginManager = exports.PluginManager = /*#__PURE__*/function () {
  function PluginManager() {
    _classCallCheck(this, PluginManager);
    this.plugins = new Map();
    this.containers = new Map();
    this.activePlugins = new Set();

    // Subscribe to route changes to activate/deactivate plugins
    this.handleRouteChange = this.handleRouteChange.bind(this);
    document.addEventListener('routeChange', this.handleRouteChange);
  }

  /**
   * Register a plugin with the manager
   * @param {string} viewId - The view ID this plugin is associated with
   * @param {PluginBase} pluginInstance - Instance of a PluginBase-derived class
   * @param {Object} options - Plugin configuration options
   */
  return _createClass(PluginManager, [{
    key: "register",
    value: function register(viewId, pluginInstance) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var pluginId = pluginInstance.id;
      if (this.plugins.has(pluginId)) {
        throw new Error("Plugin ".concat(pluginId, " is already registered"));
      }
      this.plugins.set(pluginId, {
        instance: pluginInstance,
        viewId: viewId,
        options: _objectSpread({
          autoActivate: true
        }, options)
      });
      console.log("Plugin \"".concat(pluginId, "\" registered for view \"").concat(viewId, "\""));
    }

    /**
     * Create a container for a plugin in the specified view
     * @param {string} viewId - The view ID
     * @param {string} pluginId - The plugin ID
     * @param {string} [containerId] - Optional container ID, defaults to plugin-container-{pluginId}
     * @returns {HTMLElement} The container element
     */
  }, {
    key: "createContainer",
    value: function createContainer(viewId, pluginId) {
      var containerId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var view = document.getElementById(viewId);
      if (!view) {
        throw new Error("View \"".concat(viewId, "\" not found"));
      }

      // Use provided ID or generate a default one
      var id = containerId || "plugin-container-".concat(pluginId);

      // Check if container already exists
      var container = document.getElementById(id);
      if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.className = 'plugin-container';
        container.dataset.plugin = pluginId;

        // Either append to view or to a specific plugin section if it exists
        var pluginSection = view.querySelector('.plugins-section');
        if (pluginSection) {
          pluginSection.appendChild(container);
        } else {
          view.appendChild(container);
        }
      }

      // Store reference to container
      this.containers.set(pluginId, container);
      return container;
    }

    /**
     * Initialize all registered plugins
     * @returns {Promise<void>}
     */
  }, {
    key: "initializeAll",
    value: (function () {
      var _initializeAll = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        var promises, _iterator, _step, _step$value, pluginId, pluginData, currentView;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              promises = [];
              _iterator = _createForOfIteratorHelper(this.plugins.entries());
              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  _step$value = _slicedToArray(_step.value, 2), pluginId = _step$value[0], pluginData = _step$value[1];
                  try {
                    promises.push(this.initializePlugin(pluginId));
                  } catch (error) {
                    _errors.ErrorHandler.handle(error);
                    console.error("Failed to initialize plugin ".concat(pluginId, ":"), error);
                  }
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
              _context.next = 5;
              return Promise.all(promises);
            case 5:
              console.log('All plugins initialized');

              // Check current route to activate appropriate plugins
              currentView = _state.state.get('currentView');
              if (currentView) {
                this.activatePluginsForView(currentView);
              }
            case 8:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function initializeAll() {
        return _initializeAll.apply(this, arguments);
      }
      return initializeAll;
    }()
    /**
     * Initialize a specific plugin
     * @param {string} pluginId - The plugin ID to initialize
     * @returns {Promise<void>}
     */
    )
  }, {
    key: "initializePlugin",
    value: (function () {
      var _initializePlugin = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2(pluginId) {
        var pluginData;
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              pluginData = this.plugins.get(pluginId);
              if (pluginData) {
                _context2.next = 3;
                break;
              }
              throw new Error("Plugin ".concat(pluginId, " is not registered"));
            case 3:
              _context2.prev = 3;
              _context2.next = 6;
              return pluginData.instance.initialize();
            case 6:
              console.log("Plugin ".concat(pluginId, " initialized successfully"));
              _context2.next = 13;
              break;
            case 9:
              _context2.prev = 9;
              _context2.t0 = _context2["catch"](3);
              _errors.ErrorHandler.handle(_context2.t0);
              throw new Error("Failed to initialize plugin ".concat(pluginId, ": ").concat(_context2.t0.message));
            case 13:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[3, 9]]);
      }));
      function initializePlugin(_x) {
        return _initializePlugin.apply(this, arguments);
      }
      return initializePlugin;
    }()
    /**
     * Activate plugins for a specific view
     * @param {string} viewId - The view ID to activate plugins for
     */
    )
  }, {
    key: "activatePluginsForView",
    value: (function () {
      var _activatePluginsForView = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3(viewId) {
        var pluginsToActivate, _iterator2, _step2, _step2$value, _pluginId, pluginData, _i, _pluginsToActivate, pluginId;
        return _regeneratorRuntime().wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              // Collect plugins that need to be activated for this view
              pluginsToActivate = [];
              _iterator2 = _createForOfIteratorHelper(this.plugins.entries());
              try {
                for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                  _step2$value = _slicedToArray(_step2.value, 2), _pluginId = _step2$value[0], pluginData = _step2$value[1];
                  if (pluginData.viewId === viewId && pluginData.options.autoActivate) {
                    pluginsToActivate.push(_pluginId);
                  }
                }

                // Activate the plugins
              } catch (err) {
                _iterator2.e(err);
              } finally {
                _iterator2.f();
              }
              _i = 0, _pluginsToActivate = pluginsToActivate;
            case 4:
              if (!(_i < _pluginsToActivate.length)) {
                _context3.next = 11;
                break;
              }
              pluginId = _pluginsToActivate[_i];
              _context3.next = 8;
              return this.activatePlugin(pluginId);
            case 8:
              _i++;
              _context3.next = 4;
              break;
            case 11:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function activatePluginsForView(_x2) {
        return _activatePluginsForView.apply(this, arguments);
      }
      return activatePluginsForView;
    }()
    /**
     * Deactivate plugins that are not associated with the current view
     * @param {string} currentViewId - The current active view ID
     */
    )
  }, {
    key: "deactivatePluginsNotInView",
    value: (function () {
      var _deactivatePluginsNotInView = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee4(currentViewId) {
        var pluginsToDeactivate, _iterator3, _step3, _pluginId2, pluginData, _i2, _pluginsToDeactivate, pluginId;
        return _regeneratorRuntime().wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              pluginsToDeactivate = []; // Find active plugins that don't belong to the current view
              _iterator3 = _createForOfIteratorHelper(this.activePlugins);
              try {
                for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                  _pluginId2 = _step3.value;
                  pluginData = this.plugins.get(_pluginId2);
                  if (pluginData && pluginData.viewId !== currentViewId) {
                    pluginsToDeactivate.push(_pluginId2);
                  }
                }

                // Deactivate the plugins
              } catch (err) {
                _iterator3.e(err);
              } finally {
                _iterator3.f();
              }
              _i2 = 0, _pluginsToDeactivate = pluginsToDeactivate;
            case 4:
              if (!(_i2 < _pluginsToDeactivate.length)) {
                _context4.next = 11;
                break;
              }
              pluginId = _pluginsToDeactivate[_i2];
              _context4.next = 8;
              return this.deactivatePlugin(pluginId);
            case 8:
              _i2++;
              _context4.next = 4;
              break;
            case 11:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function deactivatePluginsNotInView(_x3) {
        return _deactivatePluginsNotInView.apply(this, arguments);
      }
      return deactivatePluginsNotInView;
    }()
    /**
     * Activate a specific plugin by mounting it to its container
     * @param {string} pluginId - The plugin ID to activate
     * @returns {Promise<void>}
     */
    )
  }, {
    key: "activatePlugin",
    value: (function () {
      var _activatePlugin = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee5(pluginId) {
        var pluginData, instance, viewId, container;
        return _regeneratorRuntime().wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              pluginData = this.plugins.get(pluginId);
              if (pluginData) {
                _context5.next = 3;
                break;
              }
              throw new Error("Plugin ".concat(pluginId, " is not registered"));
            case 3:
              instance = pluginData.instance, viewId = pluginData.viewId;
              if (!this.activePlugins.has(pluginId)) {
                _context5.next = 7;
                break;
              }
              console.warn("Plugin ".concat(pluginId, " is already active"));
              return _context5.abrupt("return");
            case 7:
              _context5.prev = 7;
              // Ensure container exists
              container = this.containers.get(pluginId);
              if (!container) {
                container = this.createContainer(viewId, pluginId);
              }

              // Mount plugin to container
              _context5.next = 12;
              return instance.mount(container);
            case 12:
              this.activePlugins.add(pluginId);
              console.log("Plugin ".concat(pluginId, " activated successfully"));
              _context5.next = 20;
              break;
            case 16:
              _context5.prev = 16;
              _context5.t0 = _context5["catch"](7);
              _errors.ErrorHandler.handle(_context5.t0);
              console.error("Failed to activate plugin ".concat(pluginId, ":"), _context5.t0);
            case 20:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this, [[7, 16]]);
      }));
      function activatePlugin(_x4) {
        return _activatePlugin.apply(this, arguments);
      }
      return activatePlugin;
    }()
    /**
     * Deactivate a specific plugin by unmounting it
     * @param {string} pluginId - The plugin ID to deactivate
     * @returns {Promise<void>}
     */
    )
  }, {
    key: "deactivatePlugin",
    value: (function () {
      var _deactivatePlugin = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee6(pluginId) {
        var pluginData, instance;
        return _regeneratorRuntime().wrap(function _callee6$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              pluginData = this.plugins.get(pluginId);
              if (pluginData) {
                _context6.next = 3;
                break;
              }
              throw new Error("Plugin ".concat(pluginId, " is not registered"));
            case 3:
              instance = pluginData.instance;
              if (this.activePlugins.has(pluginId)) {
                _context6.next = 6;
                break;
              }
              return _context6.abrupt("return");
            case 6:
              _context6.prev = 6;
              _context6.next = 9;
              return instance.unmount();
            case 9:
              this.activePlugins["delete"](pluginId);
              console.log("Plugin ".concat(pluginId, " deactivated successfully"));
              _context6.next = 17;
              break;
            case 13:
              _context6.prev = 13;
              _context6.t0 = _context6["catch"](6);
              _errors.ErrorHandler.handle(_context6.t0);
              console.error("Failed to deactivate plugin ".concat(pluginId, ":"), _context6.t0);
            case 17:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this, [[6, 13]]);
      }));
      function deactivatePlugin(_x5) {
        return _deactivatePlugin.apply(this, arguments);
      }
      return deactivatePlugin;
    }()
    /**
     * Get a plugin instance by ID
     * @param {string} pluginId - The plugin ID to retrieve
     * @returns {PluginBase|null} The plugin instance, or null if not found
     */
    )
  }, {
    key: "getPlugin",
    value: function getPlugin(pluginId) {
      var pluginData = this.plugins.get(pluginId);
      return pluginData ? pluginData.instance : null;
    }

    /**
     * Handle route change events to activate/deactivate plugins
     * @param {CustomEvent} event - The routeChange event
     */
  }, {
    key: "handleRouteChange",
    value: (function () {
      var _handleRouteChange = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee7(event) {
        var to;
        return _regeneratorRuntime().wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              to = event.detail.to;
              if (to) {
                _context7.next = 3;
                break;
              }
              return _context7.abrupt("return");
            case 3:
              _context7.next = 5;
              return this.deactivatePluginsNotInView(to);
            case 5:
              _context7.next = 7;
              return this.activatePluginsForView(to);
            case 7:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function handleRouteChange(_x6) {
        return _handleRouteChange.apply(this, arguments);
      }
      return handleRouteChange;
    }()
    /**
     * Destroy all plugins and clean up resources
     */
    )
  }, {
    key: "destroy",
    value: (function () {
      var _destroy = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
        var _iterator4, _step4, pluginId, _iterator5, _step5, _step5$value, _pluginId3, pluginData;
        return _regeneratorRuntime().wrap(function _callee8$(_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              // Deactivate all active plugins
              _iterator4 = _createForOfIteratorHelper(this.activePlugins);
              _context8.prev = 1;
              _iterator4.s();
            case 3:
              if ((_step4 = _iterator4.n()).done) {
                _context8.next = 9;
                break;
              }
              pluginId = _step4.value;
              _context8.next = 7;
              return this.deactivatePlugin(pluginId);
            case 7:
              _context8.next = 3;
              break;
            case 9:
              _context8.next = 14;
              break;
            case 11:
              _context8.prev = 11;
              _context8.t0 = _context8["catch"](1);
              _iterator4.e(_context8.t0);
            case 14:
              _context8.prev = 14;
              _iterator4.f();
              return _context8.finish(14);
            case 17:
              // Destroy all plugins
              _iterator5 = _createForOfIteratorHelper(this.plugins.entries());
              _context8.prev = 18;
              _iterator5.s();
            case 20:
              if ((_step5 = _iterator5.n()).done) {
                _context8.next = 33;
                break;
              }
              _step5$value = _slicedToArray(_step5.value, 2), _pluginId3 = _step5$value[0], pluginData = _step5$value[1];
              _context8.prev = 22;
              _context8.next = 25;
              return pluginData.instance.destroy();
            case 25:
              _context8.next = 31;
              break;
            case 27:
              _context8.prev = 27;
              _context8.t1 = _context8["catch"](22);
              _errors.ErrorHandler.handle(_context8.t1);
              console.error("Failed to destroy plugin ".concat(_pluginId3, ":"), _context8.t1);
            case 31:
              _context8.next = 20;
              break;
            case 33:
              _context8.next = 38;
              break;
            case 35:
              _context8.prev = 35;
              _context8.t2 = _context8["catch"](18);
              _iterator5.e(_context8.t2);
            case 38:
              _context8.prev = 38;
              _iterator5.f();
              return _context8.finish(38);
            case 41:
              // Clear collections
              this.plugins.clear();
              this.containers.clear();
              this.activePlugins.clear();

              // Remove event listeners
              document.removeEventListener('routeChange', this.handleRouteChange);
            case 45:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this, [[1, 11, 14, 17], [18, 35, 38, 41], [22, 27]]);
      }));
      function destroy() {
        return _destroy.apply(this, arguments);
      }
      return destroy;
    }())
  }]);
}(); // Create and export a singleton instance
var pluginManager = exports.pluginManager = new PluginManager();

/***/ }),

/***/ 5129:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ 5531:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
var _exportNames = {
  store: true,
  createStore: true
};
Object.defineProperty(exports, "createStore", ({
  enumerable: true,
  get: function get() {
    return _store.createStore;
  }
}));
exports.store = void 0;
var _store = __webpack_require__(6994);
var _reducers = __webpack_require__(5662);
var _actions = __webpack_require__(1272);
Object.keys(_actions).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _actions[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _actions[key];
    }
  });
});
var _selectors = __webpack_require__(3485);
Object.keys(_selectors).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _selectors[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _selectors[key];
    }
  });
});
var store = exports.store = (0, _store.createStore)(_reducers.rootReducer);

/***/ }),

/***/ 5662:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.endpointsReducer = endpointsReducer;
exports.postsReducer = postsReducer;
exports.rootReducer = void 0;
exports.uiReducer = uiReducer;
var _utils = __webpack_require__(9510);
var _actionTypes = __webpack_require__(7525);
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function endpointsReducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var action = arguments.length > 1 ? arguments[1] : undefined;
  switch (action.type) {
    case _actionTypes.SET_ENDPOINTS:
      return action.payload;
    case _actionTypes.ADD_ENDPOINT:
      // Avoid duplicates
      if (state.some(function (e) {
        return e.url === action.payload.url;
      })) {
        return state;
      }
      return [].concat(_toConsumableArray(state), [action.payload]);
    case _actionTypes.REMOVE_ENDPOINT:
      return state.filter(function (endpoint) {
        return endpoint.url !== action.payload;
      });
    case _actionTypes.UPDATE_ENDPOINT:
      return state.map(function (endpoint) {
        return endpoint.url === action.payload.url ? _objectSpread(_objectSpread({}, endpoint), action.payload.updates) : endpoint;
      });
    default:
      return state;
  }
}
function postsReducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var action = arguments.length > 1 ? arguments[1] : undefined;
  switch (action.type) {
    case _actionTypes.SET_POSTS:
      return action.payload;
    case _actionTypes.ADD_POST:
      return [].concat(_toConsumableArray(state), [action.payload]);
    case _actionTypes.UPDATE_POST:
      return state.map(function (post) {
        return post.id === action.payload.id ? _objectSpread(_objectSpread({}, post), action.payload.updates) : post;
      });
    case _actionTypes.REMOVE_POST:
      return state.filter(function (post) {
        return post.id !== action.payload;
      });
    default:
      return state;
  }
}
function uiReducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
    currentView: 'post-view',
    previousView: null,
    theme: 'light',
    notifications: []
  };
  var action = arguments.length > 1 ? arguments[1] : undefined;
  switch (action.type) {
    case _actionTypes.SET_CURRENT_VIEW:
      return _objectSpread(_objectSpread({}, state), {}, {
        previousView: state.currentView,
        currentView: action.payload
      });
    case _actionTypes.SET_THEME:
      return _objectSpread(_objectSpread({}, state), {}, {
        theme: action.payload
      });
    case _actionTypes.SHOW_NOTIFICATION:
      return _objectSpread(_objectSpread({}, state), {}, {
        notifications: [].concat(_toConsumableArray(state.notifications), [_objectSpread({
          id: Date.now()
        }, action.payload)])
      });
    case _actionTypes.HIDE_NOTIFICATION:
      return _objectSpread(_objectSpread({}, state), {}, {
        notifications: state.notifications.filter(function (n) {
          return n.id !== action.payload;
        })
      });
    default:
      return state;
  }
}
var rootReducer = exports.rootReducer = (0, _utils.combineReducers)({
  endpoints: endpointsReducer,
  posts: postsReducer,
  ui: uiReducer
});

/***/ }),

/***/ 5790:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ 5975:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ 6411:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.VIEWS = exports.ROUTE_MAP = void 0;
exports.initRouter = initRouter;
var _eventBus = __webpack_require__(3068);
var _index = __webpack_require__(3333);
var _state = __webpack_require__(1188);
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // src/ui/router.js
// View Constants
var VIEWS = exports.VIEWS = {
  POST: 'post-view',
  WIKI: 'wiki-view',
  CHAT: 'chat-view',
  YASGUI: 'yasgui-view',
  DEVELOPER: 'developer-view',
  PROFILE: 'profile-view',
  SETTINGS: 'settings-view'
};

// Route mapping
var ROUTE_MAP = exports.ROUTE_MAP = {
  'post': VIEWS.POST,
  'wiki': VIEWS.WIKI,
  'chat': VIEWS.CHAT,
  'sparql': VIEWS.YASGUI,
  'dev': VIEWS.DEVELOPER,
  'profile': VIEWS.PROFILE,
  'settings': VIEWS.SETTINGS
};

// Lazy-loaded view modules
var VIEW_MODULES = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({}, VIEWS.POST, function () {
  return Promise.all(/* import() */[__webpack_require__.e(687), __webpack_require__.e(539)]).then(__webpack_require__.bind(__webpack_require__, 409));
}), VIEWS.WIKI, function () {
  return Promise.all(/* import() */[__webpack_require__.e(687), __webpack_require__.e(709), __webpack_require__.e(277)]).then(__webpack_require__.bind(__webpack_require__, 5387));
}), VIEWS.CHAT, function () {
  return Promise.all(/* import() */[__webpack_require__.e(687), __webpack_require__.e(167)]).then(__webpack_require__.bind(__webpack_require__, 1897));
}), VIEWS.YASGUI, function () {
  return __webpack_require__.e(/* import() */ 185).then(__webpack_require__.bind(__webpack_require__, 9185));
}), VIEWS.DEVELOPER, function () {
  return __webpack_require__.e(/* import() */ 713).then(__webpack_require__.bind(__webpack_require__, 713));
}), VIEWS.PROFILE, function () {
  return Promise.all(/* import() */[__webpack_require__.e(687), __webpack_require__.e(486)]).then(__webpack_require__.bind(__webpack_require__, 5084));
}), VIEWS.SETTINGS, function () {
  return Promise.all(/* import() */[__webpack_require__.e(687), __webpack_require__.e(118)]).then(__webpack_require__.bind(__webpack_require__, 6964));
});

// Active view handlers
var activeViewHandlers = {};

/**
 * Initialize the router
 */
function initRouter() {
  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Handle initial route
  handleRouteChange();

  // Setup navigation links
  setupNavLinks();
}

/**
 * Handle route changes
 */
function handleRouteChange() {
  try {
    var hash = window.location.hash.slice(1) || 'post';
    var viewId = ROUTE_MAP[hash] || VIEWS.POST;
    var currentView = _state.state.get('currentView');

    // Skip if already on the same view
    if (currentView === viewId) {
      return;
    }

    // Create route change event
    var event = new CustomEvent('routeChange', {
      detail: {
        from: currentView,
        to: viewId
      },
      cancelable: true
    });

    // Allow event to be canceled
    if (!document.dispatchEvent(event)) {
      // Revert to previous hash if canceled
      if (currentView) {
        var route = Object.keys(ROUTE_MAP).find(function (key) {
          return ROUTE_MAP[key] === currentView;
        });
        if (route) {
          window.location.hash = route;
        }
      }
      return;
    }

    // Update state using state manager's update method instead of store.dispatch
    _state.state.update('currentView', viewId);

    // Also update UI state if that's in a different structure
    if (_state.state.get('ui')) {
      var _state$get;
      _state.state.update('ui', _objectSpread(_objectSpread({}, _state.state.get('ui')), {}, {
        previousView: (_state$get = _state.state.get('ui')) === null || _state$get === void 0 ? void 0 : _state$get.currentView,
        currentView: viewId
      }));
    }

    // Show the view in UI
    showView(viewId);

    // Initialize view if needed
    initializeView(viewId);

    // Update active navigation link
    updateActiveNavLink(viewId);

    // Emit view changed event
    _eventBus.eventBus.emit(_eventBus.EVENTS.VIEW_CHANGED, {
      from: currentView,
      to: viewId
    });
  } catch (error) {
    _index.errorHandler.handle(error, {
      showToUser: true,
      context: 'Route change'
    });

    // Redirect to main view if error
    if (window.location.hash !== '#post') {
      window.location.hash = 'post';
    }
  }
}

/**
 * Show the specified view and hide others
 * @param {string} viewId - ID of the view to show
 */
function showView(viewId) {
  Object.values(VIEWS).forEach(function (id) {
    var view = document.getElementById(id);
    if (view) {
      view.classList.toggle('hidden', id !== viewId);
    }
  });
}

/**
 * Initialize a view if it hasn't been initialized yet
 * @param {string} viewId - ID of the view to initialize
 */
function initializeView(_x) {
  return _initializeView.apply(this, arguments);
}
/**
 * Update the active state of navigation links
 * @param {string} viewId - ID of the active view
 */
function _initializeView() {
  _initializeView = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(viewId) {
    var moduleLoader, module;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          if (!activeViewHandlers[viewId]) {
            _context.next = 4;
            break;
          }
          // Just update if already initialized
          if (typeof activeViewHandlers[viewId].update === 'function') {
            activeViewHandlers[viewId].update();
          }
          return _context.abrupt("return");
        case 4:
          // Get module loader for the view
          moduleLoader = VIEW_MODULES[viewId];
          if (moduleLoader) {
            _context.next = 8;
            break;
          }
          console.warn("No module defined for view ".concat(viewId));
          return _context.abrupt("return");
        case 8:
          _context.next = 10;
          return moduleLoader();
        case 10:
          module = _context.sent;
          // Initialize the view
          if (typeof module.initView === 'function') {
            activeViewHandlers[viewId] = module.initView() || {};
          } else {
            console.warn("No initView function in module for ".concat(viewId));
            activeViewHandlers[viewId] = {};
          }
          _context.next = 17;
          break;
        case 14:
          _context.prev = 14;
          _context.t0 = _context["catch"](0);
          _index.errorHandler.handle(_context.t0, {
            showToUser: true,
            context: "Initializing view ".concat(viewId)
          });
        case 17:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 14]]);
  }));
  return _initializeView.apply(this, arguments);
}
function updateActiveNavLink(viewId) {
  document.querySelectorAll('nav a').forEach(function (link) {
    var linkViewId = link.getAttribute('data-view');
    link.classList.toggle('active', linkViewId === viewId);
  });
}

/**
 * Setup navigation link event handlers
 */
function setupNavLinks() {
  document.querySelectorAll('nav a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var viewId = e.target.getAttribute('data-view');
      if (viewId) {
        var route = Object.keys(ROUTE_MAP).find(function (key) {
          return ROUTE_MAP[key] === viewId;
        });
        if (route) {
          window.location.hash = route;
        }

        // Hide mobile menu if active
        var menu = document.querySelector('.hamburger-menu');
        if (menu && menu.classList.contains('active')) {
          menu.classList.remove('active');
          document.querySelector('nav').classList.remove('visible');
        }
      }
    });
  });
}

/***/ }),

/***/ 6994:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.createStore = createStore;
var _eventBus = __webpack_require__(3068);
// Redux-like store implementation
function createStore(reducer) {
  var initialState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var state = initialState;
  var listeners = new Set();
  var getState = function getState() {
    return state;
  };
  var dispatch = function dispatch(action) {
    state = reducer(state, action);
    listeners.forEach(function (listener) {
      return listener(state);
    });
    _eventBus.eventBus.emit(_eventBus.EVENTS.STATE_CHANGED, {
      action: action,
      state: state
    });
    return action;
  };
  var subscribe = function subscribe(listener) {
    listeners.add(listener);
    return function () {
      listeners["delete"](listener);
    };
  };

  // Initialize store with an action to establish initial state
  dispatch({
    type: '@@INIT'
  });
  return {
    getState: getState,
    dispatch: dispatch,
    subscribe: subscribe
  };
}

/***/ }),

/***/ 7286:
/***/ ((__unused_webpack_module, exports) => {



function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.SparqlError = exports.NetworkError = exports.ErrorHandler = exports.AppError = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
/**
 * Custom application error class with additional details
 */
var AppError = exports.AppError = /*#__PURE__*/function (_Error) {
  function AppError(message, code) {
    var _this;
    var details = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    _classCallCheck(this, AppError);
    _this = _callSuper(this, AppError, [message]);
    _this.name = 'AppError';
    _this.code = code;
    _this.details = details;
    return _this;
  }
  _inherits(AppError, _Error);
  return _createClass(AppError);
}(/*#__PURE__*/_wrapNativeSuper(Error));
/**
 * SPARQL-specific error class
 */
var SparqlError = exports.SparqlError = /*#__PURE__*/function (_AppError) {
  function SparqlError(message) {
    var _this2;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, SparqlError);
    _this2 = _callSuper(this, SparqlError, [message, 'SPARQL_ERROR', details]);
    _this2.name = 'SparqlError';
    return _this2;
  }
  _inherits(SparqlError, _AppError);
  return _createClass(SparqlError);
}(AppError);
/**
 * Network error class
 */
var NetworkError = exports.NetworkError = /*#__PURE__*/function (_AppError2) {
  function NetworkError(message) {
    var _this3;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, NetworkError);
    _this3 = _callSuper(this, NetworkError, [message, 'NETWORK_ERROR', details]);
    _this3.name = 'NetworkError';
    return _this3;
  }
  _inherits(NetworkError, _AppError2);
  return _createClass(NetworkError);
}(AppError);
/**
 * Error handler for centralized error management
 */
var ErrorHandler = exports.ErrorHandler = {
  /**
   * Handle an error by logging it and optionally displaying a user-friendly message
   * @param {Error} error - The error to handle
   * @param {boolean} showToUser - Whether to show the error to the user
   */
  handle: function handle(error) {
    var showToUser = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    console.error('Error:', error);

    // Determine if error should be shown to user
    if (showToUser) {
      // Use notification system if available
      if (typeof window.showNotification === 'function') {
        window.showNotification(this.getUserFriendlyMessage(error), 'error');
      } else {
        console.warn(this.getUserFriendlyMessage(error));
      }
    }

    // Track error for analytics
    this.trackError(error);
  },
  /**
   * Get a user-friendly error message
   * @param {Error} error - The error object
   * @returns {string} A user-friendly error message
   */
  getUserFriendlyMessage: function getUserFriendlyMessage(error) {
    // Handle specific error types
    if (error instanceof SparqlError) {
      return 'SPARQL endpoint error. Please check your endpoint settings.';
    }
    if (error instanceof NetworkError) {
      return 'Network error. Please check your connection and try again.';
    }
    if (error instanceof AppError) {
      return error.message;
    }

    // Generic error checking by name/message
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (error.name === 'SyntaxError' || error.message.includes('syntax')) {
      return 'There was a syntax error in the request. Please try again.';
    }
    if (error.message.includes('endpoint') || error.message.includes('SPARQL')) {
      return 'SPARQL endpoint error. Please check your endpoint settings.';
    }

    // For security, don't expose detailed error messages to the user
    return error.userMessage || 'An error occurred. Please try again.';
  },
  /**
   * Track errors for analytics
   * @param {Error} error - The error to track
   */
  trackError: function trackError(error) {
    // Basic implementation - can be expanded to send to a real analytics service
    if (window.errorLog === undefined) {
      window.errorLog = [];
    }
    window.errorLog.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.name
    });
  },
  /**
   * Create a custom error with a user-friendly message
   * @param {string} message - Technical error message
   * @param {string} userMessage - User-friendly error message
   * @param {string} code - Error code
   * @returns {AppError} Custom error object
   */
  createError: function createError(message, userMessage) {
    var code = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'APP_ERROR';
    var error = new AppError(message, code);
    error.userMessage = userMessage;
    return error;
  }
};

/***/ }),

/***/ 7331:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ 7525:
/***/ ((__unused_webpack_module, exports) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.UPDATE_POST = exports.UPDATE_ENDPOINT = exports.SHOW_NOTIFICATION = exports.SET_THEME = exports.SET_POSTS = exports.SET_ENDPOINTS = exports.SET_CURRENT_VIEW = exports.REMOVE_POST = exports.REMOVE_ENDPOINT = exports.HIDE_NOTIFICATION = exports.ADD_POST = exports.ADD_ENDPOINT = void 0;
var SET_ENDPOINTS = exports.SET_ENDPOINTS = 'endpoints/SET_ENDPOINTS';
var ADD_ENDPOINT = exports.ADD_ENDPOINT = 'endpoints/ADD_ENDPOINT';
var REMOVE_ENDPOINT = exports.REMOVE_ENDPOINT = 'endpoints/REMOVE_ENDPOINT';
var UPDATE_ENDPOINT = exports.UPDATE_ENDPOINT = 'endpoints/UPDATE_ENDPOINT';
var SET_POSTS = exports.SET_POSTS = 'posts/SET_POSTS';
var ADD_POST = exports.ADD_POST = 'posts/ADD_POST';
var UPDATE_POST = exports.UPDATE_POST = 'posts/UPDATE_POST';
var REMOVE_POST = exports.REMOVE_POST = 'posts/REMOVE_POST';
var SET_CURRENT_VIEW = exports.SET_CURRENT_VIEW = 'ui/SET_CURRENT_VIEW';
var SET_THEME = exports.SET_THEME = 'ui/SET_THEME';
var SHOW_NOTIFICATION = exports.SHOW_NOTIFICATION = 'ui/SHOW_NOTIFICATION';
var HIDE_NOTIFICATION = exports.HIDE_NOTIFICATION = 'ui/HIDE_NOTIFICATION';

/***/ }),

/***/ 7739:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.hideNotificationById = hideNotificationById;
exports.initNotifications = initNotifications;
exports.showInfo = exports.showError = void 0;
exports.showNotification = showNotification;
exports.showWarning = exports.showSuccess = void 0;
var _eventBus = __webpack_require__(3068);
var _index = __webpack_require__(5531);
var _actions = __webpack_require__(1272);
var _selectors = __webpack_require__(3485);
// src/ui/notifications/notifications.js

var notificationsContainer;
function initNotifications() {
  console.log('Initializing notifications system');
  if (!notificationsContainer) {
    notificationsContainer = document.querySelector('.notifications-container');
    if (!notificationsContainer) {
      notificationsContainer = document.createElement('div');
      notificationsContainer.className = 'notifications-container';
      document.body.appendChild(notificationsContainer);
    }
  }
  _index.store.subscribe(renderNotifications);
  _eventBus.eventBus.on(_eventBus.EVENTS.NOTIFICATION_SHOW, handleNotificationEvent);
  window.showNotification = showNotification;
}
function handleNotificationEvent(notification) {
  showNotification(notification.message, notification.type, notification.duration);
}
function showNotification(message) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
  var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;
  var id = Date.now();

  // Check if store.dispatch is a function before calling it
  if (typeof _index.store.dispatch === 'function') {
    _index.store.dispatch((0, _actions.showNotification)({
      id: id,
      message: message,
      type: type,
      duration: duration,
      timestamp: new Date().toISOString()
    }));
  } else {
    console.warn('store.dispatch is not a function, falling back to direct DOM manipulation');
    // Fallback to direct DOM manipulation
    var element = createNotificationElement({
      id: id,
      message: message,
      type: type,
      duration: duration
    });
    if (duration > 0) {
      setTimeout(function () {
        element.classList.add('fade-out');
        setTimeout(function () {
          return element.remove();
        }, 300);
      }, duration);
    }
  }
  return id;
}
function hideNotificationById(id) {
  if (typeof _index.store.dispatch === 'function') {
    _index.store.dispatch((0, _actions.hideNotification)(id));
  } else {
    var element = notificationsContainer.querySelector("[data-id=\"".concat(id, "\"]"));
    if (element) {
      element.classList.add('fade-out');
      setTimeout(function () {
        return element.remove();
      }, 300);
    }
  }
}
function renderNotifications() {
  try {
    var notifications = (0, _selectors.getNotifications)(_index.store.getState());
    var existingElements = notificationsContainer.querySelectorAll('.notification');
    var existingIds = new Set();
    existingElements.forEach(function (element) {
      var id = parseInt(element.dataset.id, 10);
      existingIds.add(id);
      if (!notifications.find(function (n) {
        return n.id === id;
      })) {
        element.classList.add('fade-out');
        setTimeout(function () {
          return element.remove();
        }, 300);
      }
    });
    notifications.forEach(function (notification) {
      if (!existingIds.has(notification.id)) {
        createNotificationElement(notification);
      }
    });
  } catch (error) {
    console.error('Error rendering notifications:', error);
  }
}
function createNotificationElement(notification) {
  var element = document.createElement('div');
  element.className = "notification ".concat(notification.type);
  element.dataset.id = notification.id;
  element.textContent = notification.message;
  if (notification.duration === 0) {
    var closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', function () {
      hideNotificationById(notification.id);
    });
    element.appendChild(closeButton);
  }
  notificationsContainer.appendChild(element);
  return element;
}
var showSuccess = exports.showSuccess = function showSuccess(msg, duration) {
  return showNotification(msg, 'success', duration);
};
var showError = exports.showError = function showError(msg, duration) {
  return showNotification(msg, 'error', duration);
};
var showInfo = exports.showInfo = function showInfo(msg, duration) {
  return showNotification(msg, 'info', duration);
};
var showWarning = exports.showWarning = function showWarning(msg, duration) {
  return showNotification(msg, 'warning', duration);
};

/***/ }),

/***/ 9510:
/***/ ((__unused_webpack_module, exports) => {



Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.combineReducers = combineReducers;
exports.createAction = createAction;
function combineReducers(reducers) {
  return function () {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var action = arguments.length > 1 ? arguments[1] : undefined;
    var nextState = {};
    var hasChanged = false;
    for (var key in reducers) {
      var reducer = reducers[key];
      var previousStateForKey = state[key];
      var nextStateForKey = reducer(previousStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}
function createAction(type) {
  return function (payload) {
    return {
      type: type,
      payload: payload
    };
  };
}

/***/ }),

/***/ 9567:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ 9587:
/***/ ((__unused_webpack_module, exports) => {



function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.ValidationError = exports.StorageError = exports.SparqlError = exports.RDFError = exports.NetworkError = exports.ConfigError = exports.AppError = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
/**
 * Base error class for all application errors
 * @extends Error
 */
var AppError = exports.AppError = /*#__PURE__*/function (_Error) {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Error details
   */
  function AppError(message) {
    var _this;
    var code = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'APP_ERROR';
    var details = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    _classCallCheck(this, AppError);
    _this = _callSuper(this, AppError, [message]);
    _this.name = _this.constructor.name;
    _this.code = code;
    _this.details = details;
    _this.timestamp = new Date();
    _this.userMessage = message; // Default user message is same as error message

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(_this, _this.constructor);
    }
    return _this;
  }

  /**
   * Get user-friendly message
   * @returns {string} User-friendly message
   */
  _inherits(AppError, _Error);
  return _createClass(AppError, [{
    key: "getUserMessage",
    value: function getUserMessage() {
      return this.userMessage || this.message;
    }

    /**
     * Set user-friendly message
     * @param {string} message - User-friendly message
     */
  }, {
    key: "setUserMessage",
    value: function setUserMessage(message) {
      this.userMessage = message;
    }
  }]);
}(/*#__PURE__*/_wrapNativeSuper(Error));
/**
 * Network-related error
 * @extends AppError
 */
var NetworkError = exports.NetworkError = /*#__PURE__*/function (_AppError) {
  function NetworkError(message) {
    var _this2;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, NetworkError);
    _this2 = _callSuper(this, NetworkError, [message, 'NETWORK_ERROR', details]);
    _this2.setUserMessage('Network error. Please check your connection and try again.');
    return _this2;
  }
  _inherits(NetworkError, _AppError);
  return _createClass(NetworkError);
}(AppError);
/**
 * SPARQL-related error
 * @extends AppError
 */
var SparqlError = exports.SparqlError = /*#__PURE__*/function (_AppError2) {
  function SparqlError(message) {
    var _this3;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, SparqlError);
    _this3 = _callSuper(this, SparqlError, [message, 'SPARQL_ERROR', details]);
    _this3.setUserMessage('SPARQL endpoint error. Please check your endpoint settings.');
    return _this3;
  }
  _inherits(SparqlError, _AppError2);
  return _createClass(SparqlError);
}(AppError);
/**
 * Storage-related error
 * @extends AppError
 */
var StorageError = exports.StorageError = /*#__PURE__*/function (_AppError3) {
  function StorageError(message) {
    var _this4;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, StorageError);
    _this4 = _callSuper(this, StorageError, [message, 'STORAGE_ERROR', details]);
    _this4.setUserMessage('Storage error. Some data may not be saved.');
    return _this4;
  }
  _inherits(StorageError, _AppError3);
  return _createClass(StorageError);
}(AppError);
/**
 * Configuration-related error
 * @extends AppError
 */
var ConfigError = exports.ConfigError = /*#__PURE__*/function (_AppError4) {
  function ConfigError(message) {
    var _this5;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, ConfigError);
    _this5 = _callSuper(this, ConfigError, [message, 'CONFIG_ERROR', details]);
    _this5.setUserMessage('Configuration error. Please check your application settings.');
    return _this5;
  }
  _inherits(ConfigError, _AppError4);
  return _createClass(ConfigError);
}(AppError);
/**
 * RDF-related error
 * @extends AppError
 */
var RDFError = exports.RDFError = /*#__PURE__*/function (_AppError5) {
  function RDFError(message) {
    var _this6;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, RDFError);
    _this6 = _callSuper(this, RDFError, [message, 'RDF_ERROR', details]);
    _this6.setUserMessage('Data processing error. Please try again.');
    return _this6;
  }
  _inherits(RDFError, _AppError5);
  return _createClass(RDFError);
}(AppError);
/**
 * Validation-related error
 * @extends AppError
 */
var ValidationError = exports.ValidationError = /*#__PURE__*/function (_AppError6) {
  function ValidationError(message) {
    var _this7;
    var details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, ValidationError);
    _this7 = _callSuper(this, ValidationError, [message, 'VALIDATION_ERROR', details]);
    _this7.setUserMessage('Validation error. Please check your input and try again.');
    return _this7;
  }
  _inherits(ValidationError, _AppError6);
  return _createClass(ValidationError);
}(AppError);

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "squirt:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			792: 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunksquirt"] = self["webpackChunksquirt"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;


__webpack_unused_export__ = ({
  value: true
});
__webpack_unused_export__ = initializeApp;
__webpack_unused_export__ = __webpack_unused_export__ = void 0;
var _eventBus = __webpack_require__(3068);
var _index = __webpack_require__(3333);
var _index2 = __webpack_require__(5531);
var _storageService = __webpack_require__(1968);
var _router = __webpack_require__(6411);
var _notifications = __webpack_require__(7739);
var _pluginManager = __webpack_require__(4132);
var _endpointIndicator = __webpack_require__(144);
__webpack_require__(5129);
__webpack_require__(5790);
__webpack_require__(338);
__webpack_require__(7331);
__webpack_require__(9567);
__webpack_require__(5975);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; } // Import styles
// Export namespaces for global usage
var namespaces = __webpack_unused_export__ = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  dc: 'http://purl.org/dc/terms/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  squirt: 'http://purl.org/stuff/squirt/'
};

// Export services for global usage
var services = __webpack_unused_export__ = {
  storage: _storageService.storageService
};

/**
 * Initialize the application
 * @returns {Promise<Object>} Initialization result
 */
function initializeApp() {
  return _initializeApp.apply(this, arguments);
}
/**
 * Setup global notification handling
 */
function _initializeApp() {
  _initializeApp = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          console.log('Initializing application...');

          // Make services globally available
          window.services = services;

          // Initialize UI components
          (0, _notifications.initNotifications)();
          (0, _router.initRouter)();

          // Initialize plugins
          _context.next = 7;
          return _pluginManager.pluginManager.initializeAll();
        case 7:
          // Setup notifications
          setupNotifications();

          // Initialize endpoint status indicator
          (0, _endpointIndicator.initializeEndpointIndicator)();

          // Setup mobile menu
          setupHamburgerMenu();

          // Register service worker for PWA functionality
          registerServiceWorker();
          console.log('Application initialized successfully');
          _eventBus.eventBus.emit(_eventBus.EVENTS.APP_INITIALIZED);
          return _context.abrupt("return", {
            success: true
          });
        case 16:
          _context.prev = 16;
          _context.t0 = _context["catch"](0);
          _index.errorHandler.handle(_context.t0);
          return _context.abrupt("return", {
            success: false,
            error: _context.t0
          });
        case 20:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 16]]);
  }));
  return _initializeApp.apply(this, arguments);
}
function setupNotifications() {
  // Find or create notifications container
  var container = document.querySelector('.notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notifications-container';
    document.body.appendChild(container);
  }

  // Create global showNotification function
  window.showNotification = function (message) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;
    var notification = document.createElement('div');
    notification.className = "notification ".concat(type);
    notification.textContent = message;
    container.appendChild(notification);
    if (duration > 0) {
      setTimeout(function () {
        notification.classList.add('fade-out');
        setTimeout(function () {
          return notification.remove();
        }, 300);
      }, duration);
    }
    return notification;
  };

  // Subscribe to notification events
  _eventBus.eventBus.on(_eventBus.EVENTS.NOTIFICATION_SHOW, function (data) {
    window.showNotification(data.message, data.type, data.duration);
  });
}

/**
 * Setup hamburger menu for mobile navigation
 */
function setupHamburgerMenu() {
  var hamburgerButton = document.querySelector('.hamburger-button');
  var hamburgerMenu = document.querySelector('.hamburger-menu');
  var nav = document.querySelector('nav');
  if (hamburgerButton && nav) {
    hamburgerButton.addEventListener('click', function () {
      nav.classList.toggle('visible');
      if (hamburgerMenu) {
        hamburgerMenu.classList.toggle('active');
      }
    });
  }
}

/**
 * Register service worker for PWA functionality
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
        console.log('Service Worker registered with scope:', registration.scope);

        // Register background sync if available
        if ('SyncManager' in window) {
          registration.sync.register('sync-posts').then(function () {
            return console.log('Background sync registered');
          })["catch"](function (error) {
            return console.error('Background sync registration failed:', error);
          });
        }

        // Register push notifications if available
        if ('PushManager' in window) {
          askNotificationPermission();
        }
      })["catch"](function (error) {
        console.error('Service Worker registration failed:', error);
      });
    });
  }
}

/**
 * Request notification permission for push notifications
 */
function askNotificationPermission() {
  // Check if permission already granted
  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted');
    return;
  }

  // Don't ask again if denied
  if (Notification.permission === 'denied') {
    console.warn('Notification permission was previously denied');
    return;
  }

  // Ask permission after user interaction (required by browsers)
  document.addEventListener('click', function askPermission() {
    Notification.requestPermission().then(function (permission) {
      if (permission === 'granted') {
        console.log('Notification permission granted');
        // Remove listener after permission granted
        document.removeEventListener('click', askPermission);
      }
    });
  }, {
    once: false
  });
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});
})();

/******/ })()
;