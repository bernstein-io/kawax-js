class Smart {

  static export(...options) {
    const instance = new this(...options);
    return (...args) => instance._call(...args);
  }

  constructor(options, ...args) {
    this.extend(this.defaults(options));
    return this.initialize(options, ...args);
  }

  initialize() { return this; }

  _call(...args) {
    return this.call ? this.call(...args) : false;
  }

  extend(object) {
    return Object.assign(this, object);
  }

  defaults() {
    return false;
  }

}

export default Smart;
