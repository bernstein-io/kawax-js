import { createStore, applyMiddleware, compose } from 'redux';
import _ from 'lodash';
import Thunk from 'redux-thunk';
import Smart from './Smart';
import log from './helpers/log';

class Store extends Smart {

  groupLog = false;

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
      if (action.done) {
        if (action.status !== 'pending') {
          state = getState();
          const [initialAction] = _.remove(this.pendingActions,
            (pendingAction) => pendingAction.id === action.id);
          duration = performance.now() - initialAction.startTime;
        }
        const output = this._formatLog(state, action, duration);
        const actionPayload = _.cloneDeep(action);
        if (action.status === 'error') {
          log.group(...output);
          log.error('Action:', actionPayload);
          log.groupEnd();
        } else if (action.log && action.status === 'success') {
          log.debug(...output, '\n ', actionPayload);
        }
      }
      return payload;
    };
  }

  _formatLog(state, action, duration) {
    const className = String(action.class);
    const header = String(action.type);
    const status = (action.status ? `${action.status}` : 'no-status');
    const style = action.status === 'error'
      ? 'background: #FFF0F0; color: #FD4146; font-weight: bold;'
      : 'color: black; font-weight: bold;';
    let time = ' ';
    if (duration) {
      time = `${duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration.toFixed(0)}ms`}`;
    }
    return [
      `%c${className}: ${status} (${header}) (${time})`,
      style,
    ];
  }

  reducer(state, action) {
    return Object.assign({}, state);
  }

}

export default Store;
