import _ from 'lodash';
import Smart from '../Smart';
import Runtime from '../Runtime';

const argsToArray = (keys = []) => ((_.isArray(_.first(keys))) ? _.first(keys) : keys);

class ActionStack extends Smart {

  keys = {};

  stack = [];

  persisted = [];

  push({ id, key, instance }) {
    this.stack.push({ id, key, instance });
  }

  watch(key, id) {
    this.push({ id, key });
  }

  clear(force = false) {
    this.stack = force ? [] : _.filter(this.stack, (item) => _.includes(this.persisted, item.key));
  }

  clearExcept(...args) {
    const preserve = argsToArray(args);
    this.stack = _.filter(this.stack, (item) => (
      _.includes(this.persisted, item.key) || _.includes(preserve, item.key)
    ));
  }

  clearSome(...args) {
    const actions = argsToArray(args);
    this.stack = _.filter(this.stack, (item) => (
      _.includes(this.persisted, item.key) && !_.includes(actions, item.key)
    ));
  }

  clearOnChange(args = []) {
    const keys = argsToArray(args);
    _.each(this.keys, (value, key) => {
      if (!_.isEmpty(this.keys) && value !== keys[key]) {
        this.clear(true);
      }
    });
    this.keys = keys;
  }

  persist(...args) {
    const keys = argsToArray(args);
    this.persisted.push(...keys);
  }

  find(key) {
    const map = this.groups();
    return map[key] || [];
  }

  findLast(key = false) {
    const stack = key ? this.find(key) : this.own();
    return _.last(stack);
  }

  getErrors(key = false) {
    const stack = key ? this.find(key) : this.own();
    return _.filter(stack, (action) => (action && action.status === 'error'));
  }

  getLastError(key = false) {
    const action = this.findLast(key);
    return action && action.status === 'error' ? action.payload : false;
  }

  isError(...args) {
    const keys = argsToArray(args);
    let success;
    _.each(keys, (key) => {
      const actions = this.find(key);
      _.each(actions, (action) => {
        success = success === false ? success : (action && action.status === 'error');
      });
    });
    return !!success;
  }

  isSuccess(...args) {
    const keys = argsToArray(args);
    let success;
    _.each(keys, (key) => {
      const actions = this.find(key);
      _.each(actions, (action) => {
        success = success === false ? success : (action && action.status === 'success');
      });
    });
    return !!success;
  }

  lastSucceeded(...args) {
    const keys = argsToArray(args);
    return this.lastOf(keys, 'success');
  }

  isDone(...args) {
    const keys = argsToArray(args);
    let done;
    _.each(keys, (key) => {
      const actions = this.find(key);
      _.each(actions, (action) => {
        done = done === false ? done : !(!action || action.status === 'pending');
      });
    });
    return !!done;
  }

  wasDoneOnce(...args) {
    const keys = argsToArray(args);
    let done;
    _.each(keys, (key) => {
      const actions = this.find(key);
      let keyDone;
      _.each(actions, (action) => {
        keyDone = keyDone || !(!action || action.status === 'pending');
      });
      done = done === false ? done : keyDone;
    });
    return !!done;
  }

  isPending(...args) {
    const keys = argsToArray(args);
    return this.anyOf(keys, 'pending');
  }

  anyOf(keys = [], status) {
    let anyOf = false;
    _.each(keys, (key) => {
      const actions = this.find(key);
      _.each(actions, (action) => {
        anyOf = anyOf || !!(action && action.status === status);
      });
    });
    return !!anyOf;
  }

  lastOf(keys = [], status) {
    let lastOf;
    _.each(keys, (key) => {
      const action = _.last(this.find(key));
      lastOf = lastOf === false ? lastOf : (action && action.status === status);
    });
    return !!lastOf;
  }

  any(status) {
    let any = false;
    const actions = this.own();
    _.each(actions, (action) => {
      any = any || !!(action && action.status === status);
    });
    return !!any;
  }

  groups() {
    const store = Runtime('store');
    const state = store.getInternalState();
    const actions = _.cloneDeep(state.actions);
    const groups = _.groupBy(this.stack, 'key');
    return _.mapValues(groups, (stack) => _.map(stack, (item) => {
      const stackId = item.id;
      return _.find(actions, (action) => (stackId === action.id));
    }));
  }

  own() {
    const Store = Runtime('store');
    const state = Store.getInternalState();
    const actions = _.cloneDeep(state.actions);
    const map = _.map(this.stack, (item) => {
      const stackId = item.id;
      return _.find(actions, (action) => (stackId === action.id));
    });
    return _.compact(map);
  }

  all() {
    const Store = Runtime('store');
    const state = Store.getInternalState();
    return state.actions;
  }

  getMetaPer(key) {
    const action = this.findLast(key);
    if (action) {
      const Store = Runtime('store');
      const state = Store.getInternalState();
      const resources = state.resources;
      return _.find(resources, (meta) => _.includes(meta.actionIds, action.id));
    }
  }

  getInstances(key) {
    const groups = _.groupBy(this.stack, 'key');
    return _.isArray(groups[key]) ? groups[key].map((item) => item.instance) : [];
  }

}

export default ActionStack;
