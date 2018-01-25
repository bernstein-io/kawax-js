import _ from 'lodash';
import keyMirror from 'key-mirror-nested';
import DeepMerge from 'deepmerge';
import Exception from '../exceptions';
import {Private, SmartClass} from 'smart-class';

class Constant extends SmartClass {

  initialize() {
    if (this.yey) this.yey();
    console.log('---->', this);
  }

  normalizePath(path, scope = false) {
    let stringPath = _.isArray(path) ? path.join('.') : path;
    let normalizedPath = _.toUpper(stringPath)
    return scope
      ? `${scope+`${normalizedPath ? '.' : ''}`}${normalizedPath}`
      : normalizedPath;
  }

  getSubset(path) {
    return _.get(this.state.toObject(), path);
  }

  assignSubset(path, payload) {
    let state = this.state.toObject();
    let subset = this.upperKeys(payload);
    _.set(state, path, subset);
    this.setState(keyMirror(state));
  }

  upperKeys(payload) {
    let object = {};
    _.each(payload, (item, key) => {
      let upperKey = _.toUpper(key);
      object[upperKey] = _.isPlainObject(item) ? this.upperKeys(item) : item;
    });
    return object;
  }

  define(path, payload) {
    let normalizedPath = this.normalizePath(path);
    this.assignSubset(normalizedPath, payload);
    return normalizedPath;
  }

  lookup(scope = false) {
    return (path) => {
      if (scope || path) {
        let normalizedPath = this.normalizePath(path, scope);
        let subset = this.getSubset(normalizedPath);
        if (subset) {
          return _.isObject(subset) ? normalizedPath : subset;
        } else {
          Exception.warn('Unknow constant ' + normalizedPath);
        }
      } else {
        return this.export();
      }
    }
  }

  process = (path, payload) => {
    if (payload) {
      let scope = this.define(path, payload);
      return this.lookup(scope);
    } else {
      return this.lookup()(path);
    }
  }

  static singleton() {
    let instance = this.new();
    return instance.process;
  }

}

export default Constant.singleton();
