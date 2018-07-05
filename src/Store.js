import { createStore, applyMiddleware, compose } from 'redux';
import Thunk from 'redux-thunk';
import Smart from './Smart';
import log from './helpers/log';

class Store extends Smart {

  initialize({ reducer }) {
    const reduxStore = this._createStore(reducer);
    this.extend(reduxStore);
  }

  _createStore(reducer = this.reducer) {
    const enhancer = this._getEnhancer();
    return createStore(reducer, false, enhancer);
  }

  _getComposer() {
    if (__DEV__ && global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
      return global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        latency: 1000,
        maxAge: 25,
      });
    }
    return compose;
  }

  _getEnhancer() {
    const composer = this._getComposer();
    const middlewares = this._getMiddlewares();
    return composer(middlewares);
  }

  _getMiddlewares() {
    const middlewares = [Thunk];
    if (__DEV__) {
      middlewares.push(this._logger.bind(this));
    }
    return applyMiddleware(...middlewares);
  }

  _logger({ getState }) {
    return (next) => (action) => {
      const state = getState();
      const timeStarted = Date.now();
      const payload = next(action);
      const duration = (Date.now() - timeStarted);
      const output = this._formatLog(state, action, duration);
      if (action.status === 'error') {
        log.warning(...output);
      } else {
        log.debug(...output);
      }
      return payload;
    };
  }

  _formatLog(state, action, duration) {
    const header = `dispatched ${String(action.type)}`;
    const status = (action.status ? `[${action.status}]` : '[no-status]');
    const time = `(in ${duration.toFixed(2)} ms)`;
    return [
      `%c${header} ${time} ${status}`,
      'color: #2A2F3A; font-weight: bold;',
      '\n | Action: ', action,
      '\n | State:  ', state,
    ];
  }

  reducer(state, action) {
    return Object.assign({}, state);
  }

}

export default Store;
