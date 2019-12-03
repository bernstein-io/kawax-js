import _ from 'lodash';
import Smart from './Smart';
import ResourceCall from './internal/ResourceCall';
import resolve from './helpers/resolve';

class Resource extends Smart {

  uniqueId = `${this.constructor.name}#${_.uniqueId()}`;

  _optionsParser(resolver, base, runtime, context) {
    return {
      ...base,
      ...runtime,
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
      metaParser: resolver('metaParser', false) || ((payload) => payload.pagination),
      resourceClass: this.constructor.name || 'Resource',
      onSuccess: resolver('onSuccess', false) || false,
      onError: resolver('onError', false) || false,
      hook: resolver('hook', false) || false,
      debug: resolver('debug') || false,
      expiry: resolver('expiry') || false,
      context: { ...context, ...runtime },
    };
  }

  _getResolver = (payload, base, runtime, context) => (key, call = true) => {
    const options = { ...base, ...context, ...runtime, payload };
    const resolver = call ? resolve : (value) => value;
    return resolver(runtime[key], options)
           || resolver(context[key], options)
           || resolver(base[key], options)
           || resolver(this.static[key], options);
  };

  define(base) {
    return ({ payload, ...runtime } = {}, context = {}) => {
      const resolver = this._getResolver(payload, base, runtime, context);
      const parsedOptions = this._optionsParser(resolver, base, runtime, context);
      const resource = new ResourceCall(parsedOptions);
      return resource.call(payload);
    };
  }

  static export(...args) {
    return new this(...args);
  }

}

export { ResourceCall };
export default Resource;
