import _ from 'lodash';
import resolve from './helpers/resolve';

class Smart {

  static defaults = false;

  static export(...args) {
    const instance = new this(...args);
    return (...context) => instance._call(...context);
  }

  static new(...args) {
    return new this(...args);
  }

  static build(options, ...args) {
    return (context) => new this({ ...options, ...context }, ...args);
  }

  constructor(options, ...args) {
    this.static = this._defineStatic();
    this._defineDetaults(options);
    return this.initialize(options, ...args);
  }

  initialize() { return this; }

  _defineStatic(parent = false) {
    const staticProperties = {};
    const prototype = parent || Object.getPrototypeOf(this);
    _.each(prototype.constructor, (property, key) => {
      staticProperties[key] = property;
    });
    const extend = Object.getPrototypeOf(prototype);
    const hasParent = (extend instanceof Smart);
    const extendStatic = hasParent ? this._defineStatic(extend) : {};
    return { ...extendStatic, ...staticProperties };
  }

  _defineDetaults(options) {
    const defaults = resolve.call(this, this.static.defaults, options);
    this.extend(defaults);
  }

  _call(...args) {
    return this.call ? this.call(...args) : false;
  }

  extend(object) {
    return Object.assign(this, object);
  }

}

export default Smart;
