class Smart {

  static export(...options) {
    const instance = new this(...options);
    return (...args) => instance._call(...args);
  }

  constructor(options = {}) {
    this.extend({...options});
  }

  _call(...args) {
    if (this.call) 
      return this.call(...args); 
    
    throw Error('call function is not defined for this object.');
  }

  extend(object) {
    return Object.assign(this, object);
  }

}

export default Smart;
