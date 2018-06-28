import _ from 'lodash';
import Smart from './Smart';
import ResourceCall from './internal/ResourceCall';
import resolve from './helpers/resolve';
import log from './helpers/log';

class Resource extends Smart {

  defaults(options) { return options; }

  context = () => {};

  _resolveContext(resolver) {
    return {
      path: resolver('path') || log.error('Resource path is undefined'),
      method: resolver('method') || log.error('Resource method is undefined'),
      baseUri: resolver('baseUri') || '/',
      headers: resolver('headers') || {},
      collection: resolver('collection') || false,
      requestParser: resolver('requestParser', false) || ((payload) => payload),
      responseParser: resolver('responseParser', false) || ((response) => response),
      entityParser: resolver('entityParser', false) || false,
      requestTransform: resolver('requestTransform') === false ? false : _.snakeCase,
      responseTransform: resolver('responseTransform') === false ? false : _.camelCase,
      options: resolver('options') || {},
      ...this.context() || {}
    };
  }

  _getResolver = (options, payload) => (
    (key, call = true) => {
      const resolver = call ? resolve : (value) => value;
      const option = resolver(options[key]);
      if (option || option === false) return option;
      return resolver.call(this, this[key], payload);
    }
  );

  define(options) {
    return (payload) => {
      const resolver = this._getResolver(options, payload);
      const context = this._resolveContext(resolver);
      return ResourceCall.export(context)(payload);
    };
  }

  static export(...args) {
    return new this(...args);
  }

}

export { ResourceCall };
export default Resource;
