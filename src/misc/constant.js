import _ from 'lodash';
import keyMirror from 'key-mirror-nested';
import DeepMerge from 'deepmerge';
import Exception from '../exceptions';
import {Private, SmartClass} from 'smart-class';

class Constant extends SmartClass {

  normalizePath(path, scope = false) {
    let stringPath = _.isArray(path) ? path.join('.') : path;
    let normalizedPath = _.toUpper(stringPath);
    let upperScope = scope ? _.toUpper(scope) : false;
    return upperScope
      ? `${upperScope+`${normalizedPath ? '.' : ''}`}${normalizedPath}`
      : normalizedPath;
  }

  getSubset(path) {
    return _.get(this.state.toObject(), path);
  }

  assignSubset(path, payload) {
    let state = this.state.toObject();
    let subset = this.formatPayload(payload);
    _.set(state, path, subset);
    this.setState(keyMirror(state));
  }

  parsePayload(payload) {
    let object = {};
    _.each(payload, (item, key) => {
      if (_.isArray(payload)) {
        if (_.isString(item)) {
          let upperKey = _.toUpper(item);
          object[upperKey] = true;
        } else if (_.isObject(item)) {
          _.extend(object, this.parsePayload(item));
        }
      } else {
        let upperKey = _.toUpper(key);
        object[upperKey] = _.isObject(item) ? this.parsePayload(item) : item;
      }
    });
    return object;
  }

  formatPayload(payload) {
    if (_.isObject(payload)) {
      return this.parsePayload(payload);
    } else {
      return {[payload]:true};
    }
  }

  isScoped(path) {
    if (path && path[path.length - 1] == '.') {
      return true;
    }
    return false;
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
    } else if (this.isScoped(path)) {
      let scope = path.substring(0, (path.length -1));
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
