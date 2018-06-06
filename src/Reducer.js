import _ from 'lodash';
import Smart from './Smart';
import resolve from './helpers/resolve';

class Reducer extends Smart {

  static initialState = {};

  onPending = (pointer) => (state, action) =>
    this._matchWithStatus(['pending'], pointer)(state, action);

  onSuccess = (pointer) => (state, action) =>
    this._matchWithStatus(['success'], pointer)(state, action);

  onError = (pointer) => (state, action) =>
    this._matchWithStatus(['error'], pointer)(state, action);

  onDone = (pointer) => (state, action) =>
    this._matchWithStatus(['success', 'error'], pointer)(state, action);

  matchPending = (map) => this.onPending(this.match(map));

  matchSuccess = (map) => this.onSuccess(this.match(map));

  matchError = (map) => this.onError(this.match(map));

  matchDone = (map) => this.onDone(this.match(map));

  call(state, action) {
    const initialState = this._getInitialState();
    const previousState = state || initialState;
    const resolvedState = resolve.call(this, this.state, previousState, action);
    const nextState = (resolvedState === undefined) ? previousState : resolvedState;
    return this.reduce(previousState, nextState, action, []);
  }

  match(map) {
    return (state, action) => {
      let nextState = state;
      const { type } = action;
      _.each(map, (pointer, regex) => {
        if (type.match(regex)) {
          const resolvedState = resolve.call(this, pointer, state, action);
          const reducedState = this.reduce(nextState, resolvedState, action);
          nextState = this.assign(nextState, reducedState);
        }
      });
      return nextState;
    };
  }

  reduce(previousState, nextState, action, path = false) {
    if (_.isPlainObject(nextState)) {
      const state = {};
      _.each(nextState, (nextItem, key) => {
        const currentPath = path ? _.concat(path, key) : false;
        const previousItem = _.isPlainObject(previousState) ? previousState[key] : previousState;
        if (_.isPlainObject(nextItem)) {
          state[key] = this.reduce(previousItem, nextItem, action, currentPath);
        } else if (_.isFunction(nextItem)) {
          const resolvedState = resolve.call(this, nextItem, previousItem, action);
          const reducedState = this.reduce(previousItem, resolvedState, action, currentPath);
          state[key] = this.assign(previousItem, reducedState);
        } else if (nextItem === null && currentPath) {
          const initialState = this._getInitialState();
          state[key] = _.get(initialState, currentPath);
        } else {
          state[key] = nextItem;
        }
      });
      return this.assign(previousState, state);
    }
    return (nextState === undefined ? previousState : nextState);
  }

  assign(previous, next) {
    if (_.isPlainObject(previous) && _.isPlainObject(next)) {
      return Object.assign({}, previous, next);
    }
    return next;
  }

  _getInitialState() {
    return this.reduce({}, this.constructor.initialState, { type: '@RESET' });
  }

  _getPreviousState(state, action) {
    return state || this._getInitialState();
  }

  _matchWithStatus(statuses, callback) {
    return (state, action) =>
      (_.includes(statuses, action.status) ? resolve.call(this, callback, state, action) : state);
  }

}

export default Reducer;
