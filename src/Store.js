import { createStore, applyMiddleware, compose } from 'redux';
import _ from 'lodash';
import Thunk from 'redux-thunk';
import Smart from './Smart';
import log from './helpers/log';

class Store extends Smart {

  initialize({ reducer }) {
    const reduxStore = this._createStore(reducer);
    this.extend(reduxStore);
    if (__DEV__) {
      this.extend({ pendingActions: [] });
    }
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
      let state;
      let duration = null;
      if (action.status === 'pending') {
        state = getState();
        this.pendingActions.push({ id: action.id, startTime: performance.now() });
      }
      const payload = next(action);
      if (action.status !== 'pending') {
        state = getState();
        const [initialAction] = _.remove(this.pendingActions,
          (pendingAction) => pendingAction.id === action.id);
        duration = performance.now() - initialAction.startTime;
      }
      const output = this._formatLog(state, action, duration);
      if (action.status === 'error') {
        log.warning(...output);
      } else if (action.status === 'success') {
        log.debug(...output);
      }
      return payload;
    };
  }

  _formatLog(state, action, duration) {
    const header = String(action.type);
    const status = (action.status ? `[${action.status}]` : '[no-status]');
    let time = ' ';
    if (duration) {
      time = `(${duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration.toFixed(0)}ms`}) `;
    }
    return [
      `%c${header} ${status} ${time}`,
      'color: #2A2F3A; font-weight: bold;',
      '\n', _.cloneDeep(action),
    ];
  }

  reducer(state, action) {
    return Object.assign({}, state);
  }

}

export default Store;
