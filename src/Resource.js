import _ from 'lodash';
import Smart from './Smart';
import ResourceCall from './internal/ResourceCall';
import resolve from './helpers/resolve';

class Resource extends Smart {

  uniqueId = `${this.constructor.name}#${_.uniqueId()}`;

  _optionsParser(resolver, options, context) {
    return {
      ...options,
      uniqueId: this.uniqueId,
      resourceName: this.constructor.name,
      schema: resolver('schema') || {},
      mock: resolver('mock', false) || false,
      path: resolver('path', false),
      basePath: resolver('basePath', false),
      baseUrl: resolver('baseUrl', false),
      method: resolver('method') || 'GET',
      allowCors: resolver('allowCors') || false,
      filter: resolver('filter', false) || false,
      formData: resolver('formData') || false,
      paginate: resolver('paginate', false) || false,
      credentials: resolver('credentials') || 'same-origin',
      headers: resolver('headers', false),
      reader: resolver('reader') || 'json',
      noContent: resolver('noContent') || false,
      collection: resolver('collection') || false,
      entityParser: resolver('entityParser', false) || false,
      payloadParser: resolver('payloadParser', false) || false,
      errorParser: resolver('errorParser', false) || ((payload) => payload),
      responseParser: resolver('responseParser', false) || ((response, body) => body),
      requestTransform: resolver('requestTransform') === false ? false : _.snakeCase,
      responseTransform: resolver('responseTransform') === false ? false : _.camelCase,
      collectionParser: resolver('collectionParser', false) || ((payload) => payload.collection),
      contextParser: resolver('contextParser', false) || ((payload) => payload.pagination),
      resourceClass: this.constructor.name || 'Resource',
      onSuccess: resolver('onSuccess', false) || false,
      onError: resolver('onError', false) || false,
      hook: resolver('hook', false) || false,
      debug: resolver('debug') || false,
      expiry: resolver('expiry') || false,
    };
  }

  _getResolver = (payload, options, context) => (key, call = true) => {
    const resolver = call ? resolve : (value) => value;
    const option = resolver(options[key]) || resolver(context[key]);
    if (option || option === false) return option;
    return resolver.call(this, this.static[key], { ...options, context, payload });
  };

  define(base) {
    return ({ payload, ...options } = {}, context = {}) => {
      const mergedOptions = { ...base, ...options };
      const resolver = this._getResolver(payload, mergedOptions, context);
      const parsedOptions = this._optionsParser(resolver, mergedOptions, context);
      const resource = new ResourceCall({ ...parsedOptions, context });
      return resource.call(payload);
    };
  }

  static export(...args) {
    return new this(...args);
  }

}

export { ResourceCall };
export default Resource;
