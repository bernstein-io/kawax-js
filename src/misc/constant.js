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
    let state = this.state.toObject();
    return _.get(state, path) || false;
  }

  getNodeName(context, payload, key) {
    if (_.isArray(context)) {
      return _.isString(payload) ? _.toUpper(payload) : false;
    } else {
      return _.toUpper(key);
    }
  }

  getNode(path, context, key, payload, fromArray) {
    let nodeName = this.getNodeName(context, payload, key);
    if (_.isObject(payload)) {
      let deepPath = `${path}.${nodeName}`
      let isArray = _.isArray(payload) ? true : false;
      var nodeValue = this.mergeSubset(deepPath, payload, isArray);
    } else {
      var nodeValue = payload;
    }
    return nodeName ? {[nodeName]: nodeValue} : nodeValue;
  }

  mergeSubset(path, payload, fromArray = false) {
    let subset = this.getSubset(path);
    let tree = _.isPlainObject(subset) ? subset : {};
    _.each(payload, (item, key) => {
      let node = this.getNode(path, payload, key, item, fromArray);
      _.extend(tree, node);
    });
    return tree;
  }

  parseSubset(path, payload) {
    let state = this.state.toObject();
    if (_.isObject(payload)) {
      return _.set(state, path, this.mergeSubset(path, payload));
    } else if (_.isString(payload)) {
      return _.set(state, path, {[payload]:true});
    }
  }

  define(path, payload) {
    let normalizedPath = this.normalizePath(path);
    let state = this.parseSubset(normalizedPath, payload);
    this.setState(keyMirror(state));
    return normalizedPath;
  }

  isScoped(path) {
    if (path && path[path.length - 1] == '.') {
      return true;
    }
    return false;
  }

  lookup(scope = false) {
    return (path) => {
      if (scope || path) {
        let normalizedPath = this.normalizePath(path, scope);
        let subset = this.getSubset(normalizedPath);
        if (subset) {
          return _.isObject(subset) ? normalizedPath : subset;
        } else {
          Exception.error('Unknow constant ' + normalizedPath);
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

  static instance() {
    let instance = this.new();
    return instance.process;
  }

}

export default Constant.instance();
