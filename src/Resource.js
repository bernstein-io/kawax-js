import _ from 'lodash';
import Smart from './Smart';
import ResourceCall from './internal/ResourceCall';
import resolve from './helpers/resolve';
import log from './helpers/log';

class Resource extends Smart {

  defaults(options) { return options; }

  _resolveContext(resolver, options) {
    return {
      ...options,
      schema: resolver('schema') || {},
      mock: resolver('mock', false) || false,
      path: resolver('path') || log.error('Resource path is undefined'),
      method: resolver('method') || log.error('Resource method is undefined'),
      baseUri: resolver('baseUri') || '/',
      headers: resolver('headers') || {},
      allowCors: resolver('allowCors') || false,
      credentials: resolver('credentials') || 'same-origin',
      responseType: resolver('responseType') || 'json',
      collection: resolver('collection') || false,
      requestParser: resolver('requestParser', false) || false,
      responseParser: resolver('responseParser', false) || ((response, body) => body),
      entityParser: resolver('entityParser', false) || false,
      errorParser: resolver('errorParser', false) || ((payload) => payload),
      requestTransform: resolver('requestTransform') === false ? false : _.snakeCase,
      responseTransform: resolver('responseTransform') === false ? false : _.camelCase,
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

  _getContext(options, payload) {
    const resolver = this._getResolver(options, payload);
    return this._resolveContext(resolver, options);
  }

  define(baseOptions) {
    return (payload, callOptions) => {
      const options = { ...baseOptions, ...callOptions };
      const context = this._getContext(options, payload);
      const resourceCall = ResourceCall.export(context);
      return resourceCall(payload);
    };
  }

  static export(...args) {
    return new this(...args);
  }

}

export { ResourceCall };
export default Resource;
