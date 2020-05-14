import _ from 'lodash';
import resolve from './helpers/resolve';

const EXCLUDE_STATIC = ['export', 'build'];

class Smart {

  static defaults = false;

  static export(...args) {
    const instance = new this(...args);
    return (...context) => instance._call(...context);
  }

  static build(options, ...args) {
    return (context) => new this({ ...options, ...context }, ...args);
  }

  constructor(options, ...args) {
    this.props = this._defineProps();
    this._defineDetaults(options);
    return this.initialize(options, ...args);
  }

  initialize() { return this; }

  _defineProps(instance = false) {
    const prototype = instance || Object.getPrototypeOf(this);
    const parent = Object.getPrototypeOf(prototype);
    const statics = prototype.constructor;
    const props = _.pickBy(statics, (property, key) => !_.includes(EXCLUDE_STATIC, key));
    const inheritedProps = (parent instanceof Smart) ? this._defineProps(parent) : {};
    return { ...inheritedProps, ...props };
  }

  _defineDetaults(options) {
    const defaults = resolve.call(this, this.props.defaults, options, this.props);
    Object.assign(this, defaults);
  }

  _call(...args) {
    return this.call ? resolve.call(this, this.call, ...args) : false;
  }

}

export default Smart;
