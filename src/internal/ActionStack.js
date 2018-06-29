import _ from 'lodash';
import Smart from '../Smart';
import Runtime from '../Runtime';

class ActionStack extends Smart {

  keys = {};
  stack = [];
  persisted = [];

  push({ id, key }) {
    this.stack.push({ id, key });
  }

  clear(force = false) {
    this.stack = force ? [] : _.filter(this.stack, (item) => _.includes(this.persisted, item.key));
  }

  clearOnChange(keys = {}) {
    _.each(this.keys, (value, key) => {
      if (!_.isEmpty(this.keys) && value !== keys[key]) {
        this.clear(true);
      }
    });
    this.keys = keys;
  }

  persist(...keys) {
    this.persisted.push(...keys);
  }

  find(key) {
    const map = this.groups();
    return map[key] || [];
  }

  findLast(key = false) {
    const stack = key ? this.find(key) : this.all();
    return _.last(stack);
  }

  getErrors(key = false) {
    const stack = key ? this.find(key) : this.all();
    return _.filter(stack, (action) => (action.status === 'error'));
  }

  getLastError(key = false) {
    const action = this.findLast(key);
    return action && action.status === 'error' ? action.payload : false;
  }

  isDone(...keys) {
    let done;
    _.each(keys, (key) => {
      const actions = this.find(key);
      _.each(actions, (action) => {
        done = done === false ? done : !(!action || action.status === 'pending');
      });
    });
    return done;
  }

  wasDoneOnce(...keys) {
    let done;
    _.each(keys, (key) => {
      const actions = this.find(key);
      let keyDone;
      _.each(actions, (action) => {
        keyDone = keyDone || !(!action || action.status === 'pending');
      });
      done = done === false ? done : keyDone;
    });
    return done;
  }

  isPending(...keys) {
    let pending = false;
    _.each(keys, (key) => {
      const actions = this.find(key);
      _.each(actions, (action) => {
        pending = pending || !!(action && action.status === 'pending');
      });
    });
    return pending;
  }

  groups() {
    const store = Runtime('store');
    const state = store.getState();
    const actions = _.cloneDeep(state.actions);
    const groups = _.groupBy(this.stack, 'key');
    return _.mapValues(groups, (stack) => _.map(stack, (item) => {
      const stackId = item.id;
      return _.find(actions, (action) => (stackId === action.id));
    }));
  }

  all() {
    const store = Runtime('store');
    const state = store.getState();
    const actions = _.cloneDeep(state.actions);
    return _.map(this.stack, (item) => {
      const stackId = item.id;
      return _.find(actions, (action) => (stackId === action.id));
    });
  }

}

export default ActionStack;
