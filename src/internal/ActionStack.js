import _ from 'lodash';
import Smart from '../Smart';
import Runtime from '../Runtime';

class ActionStack extends Smart {

  stack = [];

  push = ({ id, key }) => {
    this.stack.push({ id, key });
  };

  clear = () => {
    this.stack = [];
  };

  groups = () => {
    const store = Runtime('store');
    const state = store.getState();
    const actions = _.cloneDeep(state.actions);
    const groups = _.groupBy(this.stack, 'key');
    return _.mapValues(groups, (stack) => _.map(stack, (item) => {
      const stackId = item.id;
      return _.find(actions, (action) => (stackId === action.id));
    }));
  };


  find(key) {
    const map = this.groups();
    return map[key] || [];
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
    let done = false;
    _.each(keys, (key) => {
      const action = this.findLast(key);
      done = done || !(!action || action.status === 'pending');
    });
    return done;
  }

  isPending(...keys) {
    let pending = false;
    _.each(keys, (key) => {
      const action = this.findLast(key);
      pending = pending || !!(action && action.status === 'pending');
    });
    return pending;
  }

}

export default ActionStack;
