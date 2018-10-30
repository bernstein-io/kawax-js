import _ from 'lodash';
import Smart from './Smart';
import resolve from './helpers/resolve';

function ReducerDelegate(instance) {
  this.reduce = (state, action) => instance.call(state, action);
}

function ForceAssignment(callback) {
  this.reduce = (current, path) => callback(current, path);
}

class Reducer extends Smart {

  static delegate(options) {
    const instance = new this(options);
    return new ReducerDelegate(instance);
  }

  static initialState = false;

  unionKey = 'id';

  onPending = (pointer) => (state, action) => this._matchWithStatus(['pending'], pointer)(state, action);

  onSuccess = (pointer) => (state, action) => this._matchWithStatus(['success'], pointer)(state, action);

  onError = (pointer) => (state, action) => this._matchWithStatus(['error'], pointer)(state, action);

  onDone = (pointer) => (state, action) => this._matchWithStatus(['success', 'error'], pointer)(state, action);

  matchPending = (map) => this.onPending(this.match(map));

  matchSuccess = (map) => this.onSuccess(this.match(map));

  matchError = (map) => this.onError(this.match(map));

  matchDone = (map) => this.onDone(this.match(map));

  forceAssign = (helper) => new ForceAssignment(helper);

  removeItem = (predicate) => this.forceAssign((object) => {
    _.remove(object, predicate);
    return object;
  });

  shallow = (next, depth = 1) => this.forceAssign(
    (current, action, path) => {
      if (!path) {
        return this.reduce(current, next, action, path, depth);
      }
      return next;
    },
  );

t;

call(state, action) {
  const path = [];
  const current = _.isEmpty(state) ? this._getInitialState(path) : state;
  const resolvedState = resolve.call(this, this.state, current, action);
  const next = (resolvedState === undefined) ? current : resolvedState;
  return this.reduce(current, next, action, path);
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
        case 'done':
          next = this.matchDone(map)(next, action);
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
          next = this.reduce(next, resolvedState, action);
        }
      });
      return next;
    };
  }

  shouldDelegate(next, path) {
    const initialState = _.get(this.constructor.initialState, path);
    if (initialState && initialState instanceof ReducerDelegate) {
      return true;
    } if (next && next instanceof ReducerDelegate) {
      return true;
    }
    return false;
  }

  reduce(current, next, action, path = false, depth = -1) {
    let state;
    const shouldDelegate = this.shouldDelegate(next, path);
    if (!_.isEqual(current, next) && !shouldDelegate) {
      state = this.parseState(current, next, action, path, depth);
    } else if (shouldDelegate === true) {
      state = this.delegateState(current, next, action, path);
    }
    return state || this.assign(current, next);
  }

  delegateState(current, next, action, path) {
    if (next && next instanceof ReducerDelegate) {
      return next.reduce(current, action);
    } if (next === null) {
      const initialState = _.get(this.constructor.initialState, path);
      return initialState.reduce(next, action);
    }
  }

  parseState(current, next, action, path, depth = -1) {
    if (_.isPlainObject(next)) {
      return this.parsePlainObject(current, next, action, path, depth);
    } if (_.isArray(next) && !path) {
      return this.parseArray(current, next, action, path, depth);
    } if (_.isFunction(next)) {
      const resolvedState = resolve.call(this, next, current, action);
      const reducedState = this.reduce(current, resolvedState, action, path);
      return this.assign(current, reducedState);
    } if (next === null && path) {
      return this._getInitialState(path);
    } if (next && next instanceof ForceAssignment) {
      return next.reduce(current, path);
    }
  }

  parsePlainObject(current, next, action, path, depth = -1) {
    const state = {};
    _.each(next, (nextItem, key) => {
      const currentPath = path ? _.concat(path, key) : false;
      const currentItem = _.isObject(current) ? current[key] : null;
      const nextDepth = (depth < 0 || depth > 1) ? _.clone(depth) - 1 : false;
      state[key] = nextDepth && nextItem ? this.reduce(
        currentItem, nextItem, action, currentPath, nextDepth,
      ) : nextItem;
    });
    return this.assign(current, state);
  }

  parseArray(current, next, action, path, depth = -1) {
    const union = [];
    const unionKey = this.unionKey;
    const nextItems = _.cloneDeep(next);
    _.each(current, (currentItem, key) => {
      const currentPath = path ? _.concat(path, key) : false;
      const nextDepth = (depth < 0 || depth > 1) ? _.clone(depth) - 1 : false;
      if (currentItem) {
        union[key] = currentItem;
        _.each(nextItems, (nextItem, nextKey) => {
          const matchKey = (nextItem && nextItem[unionKey]) ? nextItem[unionKey] : false;
          if (matchKey && currentItem[unionKey] === matchKey) {
            union[key] = nextDepth ? this.reduce(
              currentItem, nextItem, action, currentPath, nextDepth,
            ) : nextItem;
            nextItems[nextKey] = null;
          }
        });
      }
    });
    return _.compact([...union, ...nextItems]);
  }

  assign(current, next) {
    if (_.isPlainObject(current) && _.isPlainObject(next)) {
      return Object.assign({}, current, next);
    }
    return (next === undefined ? current : next);
  }

  _getInitialState(path) {
    const initialState = this.reduce({}, this.constructor.initialState, { type: '@@kawax/INIT' }, []);
    return _.isEmpty(path) ? initialState : _.get(initialState, path);
  }

  _matchWithStatus(statuses, callback) {
    return (state, action) => (
      _.includes(statuses, action.status) ? resolve.call(this, callback, state, action) : state
    );
  }

}

export default Reducer;
