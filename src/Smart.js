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

  constructor(options, ...args) {
    this.static = this._defineStatic();
    this._defineDetaults(options);
    return this.initialize(options, ...args);
  }

  initialize() { return this; }

  _defineStatic() {
    const staticProperties = {};
    const prototype = Object.getPrototypeOf(this);
    _.each(prototype.constructor, (property, key) => {
      staticProperties[key] = property;
    });
    return staticProperties;
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
