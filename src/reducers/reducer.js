import _ from 'lodash';
import SmartClass from 'smart-class';
import {Constant} from '../misc';

export default class Reducer extends SmartClass {

  static initialState = {};

  static status = {};

  reducer(state, action) { };

  getInitialState() {
    return _.clone(this.props.initialState)
  }

  reduce(state, action) {
    let actionType = action.type;
    let newState = state ? state : this.getInitialState(this.props.initialState);
    return (map) => {
      _.each(map, (callback, key) => {
        if (key && actionType && _.isFunction(callback)) {
          let keyLength = key.length;
          let subset = actionType.substring(0, keyLength);
          if (key == subset) {
            action.matchs = this.matchMap(action, subset);
            newState = this.newState(newState, callback(action.status), action);
          }
        }
      });
      return newState;
    }
  }

  merge(state, update) {
    let currentState = _.clone(state);
    if (_.isEqual(currentState, update)) {
      return update;
    } else if (_.isPlainObject(currentState) && _.isPlainObject(update)) {
      return _.extend(currentState, update);
    }
    else if (update === undefined) {
      return currentState;
    } else {
      return update;
    }
  }

  delegate(state, action, reducer) {
    let newState = reducer(state, action);
    return this.merge(state, newState);
  }

  refinedAction(action, path = this.props.payloadPath) {
    if (path) {
      return this.merge(_.clone(action), {
        payload: _.get(action.payload, this.props.payloadPath)
      });
    }
    return action;
  }

  updateKey(state, action, update) {
    let newState = (_.isFunction(update)) ? this.delegate(state, action, update) : update
    if (_.isPlainObject(newState)) {
      return this.update(state, action, newState);
    } else if (newState === undefined) {
      return state;
    } else {
      return newState;
    }
  }

  update(state, action, update) {
    if (_.isPlainObject(update) && !_.isArray(update)) {
      let newState = {}
      _.each(update, (newItem, key) => {
        let currentItem = (state && _.isPlainObject(state[key])) ? state[key] : null
        newState[key] = this.updateKey(currentItem, action, newItem);
      });
      return this.merge(state, newState);
    }
    else if (_.isArray(update)) {
      return update;
    }
    else {
      return this.merge(state, this.updateKey(state, action, update));
    }
  }

  statusMapper(newState, action) {
    if (this.props.status && _.isPlainObject(this.props.status)) {
      _.each(this.props.status, (type, key) => {
        let types = _.isArray(type) ? type : [type];
        if (_.includes(types, action.type)) {
          newState = this.merge(newState, {[key]: action.status});
        } else if (newState) {
          let status = newState[key] ? newState[key] : null
          newState = this.merge(newState, {[key]: status});
        }
      });
    }
    return newState;
  }

  matchMap(action, actionSubset = false) {
    let matchs = action.matchs || [];
    let lastMatch = _.last(matchs) || {};
    return [...matchs, {
      match: (actionSubset || lastMatch.match || "*"),
      class: this.class.name,
      exact: (actionSubset == action.type) ? true : false
    }];
  }

  newState(currentState, reducedState, action) {
    let newState = {}
    if (action.status) {
      newState = this.update(currentState, action, reducedState);
      newState = this.statusMapper(newState, action)
    } else {
      newState = this.update(currentState, action, reducedState);
    }
    let initialState = this.getInitialState()
    return this.merge(initialState, newState);
  }

  export = (state, action) => {
    state = _.isEmpty(state) ? this.getInitialState(this.props.initialState) : state;
    let refinedAction = this.refinedAction(action);
    action.matchs = this.matchMap(refinedAction, false);
    let reducedState = this.reducer(state, refinedAction);
    if (reducedState === false || action.type == _.get(Constant, 'ACTION.RESET')) {
      return this.props.initialState;
    } else {
      return this.newState(state, reducedState, refinedAction);
    }
  }

  static export(options = {}) {
    let instance = this.new(options);
    return instance.export;
  }

}
