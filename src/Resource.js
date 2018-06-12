import _ from 'lodash';
import Request from 'request-promise-native';
import Smart from './Smart';
import log from './helpers/log';
import resolve from './helpers/resolve';

class ResourceCall extends Smart {

  defaults(context) { return { context }; }

  _exceptionParser(exception) {
    if (exception.statusCode && exception.response) {
      return {
        message: exception.response.body.message || exception.name,
        code: exception.response.body.code || exception.statusCode,
        status: exception.response.body.status || _.snakeCase(exception.response.statusMessage)
      };
    }
    return exception;
  }

  async _entityParser(entity) {
    const { collection, entityParser } = this.context;
    if (collection === true) {
      const parsedEntities = entity;
      for (const key in entity) { /* eslint-disable no-await-in-loop */
        parsedEntities[key] = await entityParser(entity[key]);
      }
      return parsedEntities;
    }
    return entityParser(entity, this.context);
  }

  async _collectionParser(response) {
    return response.body.collection;
  }

  async _responseParser(rawResponse) {
    const { responseParser, collection, responseTransform, entityParser } = this.context;
    const response = resolve.call(this, responseParser, rawResponse) || rawResponse;
    let body = collection ? await this._collectionParser(response) : response.body;
    body = responseTransform ? this._transform(body, responseTransform) : body;
    body = entityParser ? await this._entityParser(body) : body;
    return body;
  }

  _requestParser(payload) {
    const { requestParser, requestTransform } = this.context;
    let parsedPayload = resolve.call(this, requestParser, payload) || payload;
    if (requestTransform) parsedPayload = this._transform(parsedPayload, requestTransform);
    return parsedPayload;
  }

  _transform(payload, transform) {
    const parsedPayload = _.isArray(payload) ? [] : {};
    for (const key in payload) {
      const nextKey = transform(key);
      if (_.isPlainObject(payload[key])) {
        parsedPayload[nextKey] = this._transform(payload[key], transform);
      } else {
        parsedPayload[nextKey] = payload[key];
      }
    }
    return parsedPayload;
  }

  _request(payload) {
    return Request({
      form: this._requestParser(payload),
      uri: `${this.context.baseUri}${this.context.path}`,
      method: this.context.method,
      headers: this.context.headers,
      resolveWithFullResponse: true,
      json: true
    });
  }

  call = async (payload) => {
    try {
      const response = await this._request(payload);
      return await this._responseParser(response);
    } catch (exception) {
      throw this._exceptionParser(exception);
    }
  };

}

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
