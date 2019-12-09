import _ from 'lodash';
import Smart from './Smart';
import resolve from './helpers/resolve';

function ReducerDelegate(instance) {
  this._reduce = (state, action) => instance.call(state, action);
}

function ForceAssignment(callback) {
  this._reduce = (current, path) => callback(current, path);
}

class Reducer extends Smart {

  static delegate(options) {
    const instance = new this(options);
    return new ReducerDelegate(instance);
  }

  static initialState = null;

  static applyEmbeddedReducer = true;

  unionKey = 'id';

  onPending = (pointer) => (state, action) => this._matchWithStatus(['pending'], pointer)(state, action);

  onSuccess = (pointer) => (state, action) => this._matchWithStatus(['success'], pointer)(state, action);

  onError = (pointer) => (state, action) => this._matchWithStatus(['error'], pointer)(state, action);

  onDone = (pointer) => (state, action) => this._matchWithStatus(['success', 'error'], pointer)(state, action);

  matchPending = (map) => this.onPending(this.match(map));

  matchSuccess = (map) => this.onSuccess(this.match(map));

  matchError = (map) => this.onError(this.match(map));

  matchDone = (map) => this.onDone(this.match(map));

  replace = (state, { payload }) => this._forceAssign((object) => payload);

  assign = (state, { payload }) => payload;

  assignItem = (state, { payload }) => (_.isArray(state) ? [payload] : payload);

  removeItem = (predicate) => this._forceAssign((current) => {
    _.remove(current, predicate);
    return current;
  });

  shallow = (next, depth = 1) => this._forceAssign(
    (current, action, path) => {
      if (!path) {
        return this._reduce(current, next, action, path, depth);
      }
      return next;
    },
  );

  call(state, { depth = 0, ...action }) {
    const path = [];
    const current = _.isEmpty(state) ? this._getInitialState(path) : state;
    action.depth = depth + 1;
    const baseState = this._embeddedReducer(current, action) || current;
    const resolvedState = resolve.call(this, this.state, baseState, action);
    const next = (resolvedState === undefined) ? current : resolvedState;
    return this._reduce(current, next, action, path);
  }

  matchOn = (statuses) => (state, action) => {
    let next = state;
    _.each(statuses, (map, status) => {
      // eslint-disable-next-line default-case
      switch (status) {
        case 'success':
          next = this.matchSuccess(map)(next, action);
          break;
        case 'error':
          next = this.matchError(map)(next, action);
          break;
        case 'pending':
          next = this.matchPending(map)(next, action);
          break;
      }
    });
    return next;
  };

  match(map) {
    return (state, action) => {
      let next = state;
      const { type } = action;
      _.each(map, (pointer, match) => {
        const regex = new RegExp(`(^[^.]?|[.])${match}`, 'g');
        if (type && type.match(regex)) {
          const resolvedState = resolve.call(this, pointer, state, action);
          next = this._reduce(next, resolvedState, action);
        }
      });
      return next;
    };
  }

  _embeddedReducer(state, action) {
    if (this.static.applyEmbeddedReducer && action.reducer && action.depth === 1) {
      const reducerCallback = resolve.call(this, action.reducer, action) || {};
      const bundledState = resolve.call(this, reducerCallback, this) || {};
      return this._reduce(state, bundledState, action);
    }
  }

  _forceAssign = (helper) => new ForceAssignment(helper);

  _shouldDelegate(next, path) {
    const initialState = _.get(this.constructor.initialState, path);
    if (initialState && initialState instanceof ReducerDelegate) {
      return true;
    } if (next && next instanceof ReducerDelegate) {
      return true;
    }
    return false;
  }

  _reduce(current, next, action, path = false, depth = -1) {
    let state;
    const shouldDelegate = this._shouldDelegate(next, path);
    if (!_.isEqual(current, next) && !shouldDelegate) {
      state = this._parseState(current, next, action, path, depth);
    } else if (shouldDelegate === true) {
      state = this._delegateState(current, next, action, path);
    }
    return state === undefined ? this._assignNext(current, next) : state;
  }

  _delegateState(current, next, action, path) {
    if (next && next instanceof ReducerDelegate) {
      return next._reduce(current, action);
    } if (next === null) {
      const initialState = _.get(this.constructor.initialState, path);
      return initialState._reduce(next, action);
    }
  }

  _parseState(current, next, action, path, depth = -1) {
    if (_.isPlainObject(next)) {
      return this._parsePlainObject(current, next, action, path, depth);
    } if (_.isArray(next) && !path) {
      return this._parseArray(current, next, action, path, depth);
    } if (_.isFunction(next)) {
      const resolvedState = resolve.call(this, next, current, action);
      const reducedState = this._reduce(current, resolvedState, action, path);
      return this._assignNext(current, reducedState);
    } if (next === null && path) {
      return this._getInitialState(path);
    } if (next && next instanceof ForceAssignment) {
      return next._reduce(current, path);
    }
  }

  _parsePlainObject(current, next, action, path, depth = -1) {
    const state = {};
    _.each(next, (nextItem, key) => {
      const currentPath = path ? _.concat(path, key) : false;
      const currentItem = _.isObject(current) ? current[key] : null;
      const nextDepth = (depth < 0 || depth > 1) ? _.clone(depth) - 1 : false;
      state[key] = nextDepth && nextItem ? this._reduce(
        currentItem, nextItem, action, currentPath, nextDepth,
      ) : nextItem;
    });
    return this._assignNext(current, state);
  }

  _parseArray(current, next, action, path, depth = -1) {
    const union = [];
    const unionKey = this.unionKey;
    const nextItems = [...next];
    _.each(current, (currentItem, key) => {
      const currentPath = path ? _.concat(path, key) : false;
      const nextDepth = (depth < 0 || depth > 1) ? _.clone(depth) - 1 : false;
      if (currentItem) {
        union[key] = currentItem;
        _.each(nextItems, (nextItem, nextKey) => {
          const matchKey = (nextItem && nextItem[unionKey]) ? nextItem[unionKey] : false;
          if (matchKey && currentItem[unionKey] === matchKey) {
            union[key] = nextDepth ? this._reduce(
              currentItem, nextItem, action, currentPath, nextDepth,
            ) : nextItem;
            nextItems[nextKey] = null;
          }
        });
      }
    });
    return _.compact([...union, ...nextItems]);
  }

  _assignNext(current, next) {
    if (_.isPlainObject(current) && _.isPlainObject(next)) {
      return Object.assign({}, current, next);
    }
    return (next === undefined ? current : next);
  }

  _getInitialState(path) {
    const initialState = this.constructor.initialState;
    const state = initialState
      ? this._reduce({}, this.constructor.initialState, { type: '@@kawax/INIT' }, [])
      : null;
    return _.isEmpty(path) ? state : _.get(state, path);
  }

  _matchWithStatus(statuses, callback) {
    return (state, action) => (
      _.includes(statuses, action.status)
        ? resolve.call(this, callback, state, action)
        : state
    );
  }

}

export default Reducer;
