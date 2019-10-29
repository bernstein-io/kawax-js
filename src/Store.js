import { createStore, applyMiddleware, compose } from 'redux';
import _ from 'lodash';
import Thunk from 'redux-thunk';
import Smart from './Smart';
import log from './helpers/log';
import InternalReducer from './instance/InternalReducer';

class Store extends Smart {

  groupLog = false;

  initialize({ reducer, name, customMiddlewares }) {
    this.internal = this._createInternalStore(name);
    this.main = this._createMainStore(customMiddlewares, reducer, name);
    if (__DEV__) {
      this.extend({ pendingActions: [] });
    }
  }

  dispatch = (action) => {
    this.internal.dispatch(action);
    return this.main.dispatch(action);
  };

  subscribe = (listener) => this.main.subscribe(listener);

  replaceReducer = (nextReducer) => this.main.replaceReducer(nextReducer);

  getState = () => this.main.getState();

  getInternalState = () => this.internal.getState();

  _dispatch = (action) => this.internal.dispatch(action);

  _createInternalStore(name) {
    const enhancer = this._getEnhancer(name, true);
    const internalReducer = InternalReducer.export();
    return createStore(internalReducer, false, enhancer);
  }

  _createMainStore(customMiddlewares, reducer = this.reducer, name = false) {
    const enhancer = this._getEnhancer(name, false, customMiddlewares);
    return createStore(reducer, false, enhancer);
  }

  _getEnhancer(name, internal = false, customMiddlewares = []) {
    const composer = this._getComposer(name, internal);
    const middlewares = this._getMiddlewares(customMiddlewares, internal);
    return composer(middlewares);
  }

  _getComposer(name = false, internal = false) {
    if (__DEV__ && global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
      return global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        name: internal ? `Kawax@${name}` : name,
        latency: 1000,
        maxAge: 25,
      });
    }
    return compose;
  }

  _getMiddlewares(customMiddlewares = [], internal = false) {
    const middlewares = _.compact(_.concat(Thunk, customMiddlewares));
    if (__DEV__ && !internal) {
      middlewares.push(this._logger.bind(this));
    }
    return applyMiddleware(...middlewares);
  }

  _logger({ getState }) {
    return (next) => (action) => {
      let state;
      let duration = null;
      if (action.status === 'pending') {
        state = getState();
        this.pendingActions.push({ id: action.id, startTime: performance.now() });
      }
      const payload = next(action);
      if (action.done) {
        if (action.status !== 'pending') {
          state = getState();
          const [initialAction] = _.remove(this.pendingActions,
            (pendingAction) => pendingAction.id === action.id);
          duration = performance.now() - (initialAction ? initialAction.startTime : 0);
        }
        const output = this._formatLog(state, action, duration);
        const actionPayload = _.cloneDeep(action);
        if (action.status === 'error') {
          log.error(...output, 'Action:', actionPayload);
        } else if (action.log && action.status === 'success') {
          log.debug(...output, '\n ', actionPayload);
        }
      }
      return payload;
    };
  }

  _isDarkModeEnabled() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  _getStyle(status) {
    const darkMode = this._isDarkModeEnabled();
    const isError = status === 'error';
    if (darkMode) {
      return isError ? 'color: #fd4146; font-weight: bold;'
        : 'color: white; font-weight: bold;';
    } else {
      return isError ? 'color: #ff443a; font-weight: bold;'
        : 'color: black; font-weight: bold;';
    }
  }

  _formatLog(state, action, duration) {
    const className = String(action.class);
    const header = String(action.type);
    const status = (action.status ? `${action.status}` : 'no-status');
    const style = this._getStyle(action.status);
    let time = ' ';
    if (duration) {
      time = `${duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration.toFixed(0)}ms`}`;
    }
    return action.status === 'error'
      ? [`${className}: ${status} (${header}) (${time})`]
      : [`%c${className}: ${status} (${header}) (${time})`, style];
  }

  reducer(state, action) {
    return Object.assign({}, state);
  }

}

export default Store;
