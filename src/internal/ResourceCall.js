import _ from 'lodash';
import uuid from 'uuid';
import Smart from '../Smart';
import resolve from '../helpers/resolve';
import log from '../helpers/log';

class ResourceCall extends Smart {

  defaults(context) { return { context }; }

  async entityParser(entity) {
    const { collection, entityParser } = this.context;
    if (collection === true) {
      const parsedEntities = entity.map((value) => entityParser(value, this.context));
      return Promise.all(parsedEntities);
    }
    return entityParser(entity, this.context);
  }

  async collectionParser(response) {
    return response.collection;
  }

  async responseParser(response, body) {
    const { responseParser, collection, responseTransform, entityParser } = this.context;
    let payload = resolve.call(this, responseParser, response, body) || body;
    payload = collection ? await this.collectionParser(payload) : payload;
    payload = responseTransform ? this.transform(payload, responseTransform) : payload;
    payload = entityParser ? await this.entityParser(payload) : payload;
    return payload;
  }

  exceptionParser(exception) {
    return {
      code: exception.code || 0,
      status: exception.status || 'javascript_error',
      message: exception.message || 'Oops, something went wrong',
      ...exception,
    };
  }

  fetchErrorParser(response, body = {}) {
    const { responseTransform } = this.context;
    return this.context.errorParser({
      code: response.status,
      status: _.snakeCase(response.statusText),
      message: response.statusText || _.isArray(body.errors) ? body.errors.join(' ') : null,
      ...(responseTransform ? this.transform(body, responseTransform) : body),
    });
  }

  bodyTypeParser(response) {
    const { responseType } = this.context;
    switch (responseType.toLowerCase()) {
    case 'json':
      return response.json();
    case 'formdata':
      return response.formData();
    case 'arraybuffer':
      return response.arrayBuffer();
    case 'blob':
      return response.blob();
    case 'text':
      return response.text();
    default:
      return response.text();
    }
  }

  async serializeRequestBody(payload) {
    const parsedPayload = {};
    for (const key in payload) {
      if (_.isObject(payload[key])) {
        parsedPayload[key] = JSON.stringify(payload[key]);
      } else {
        parsedPayload[key] = payload[key];
      }
    }
    return parsedPayload;
  }

  async requestPayloadParser(payload) {
    const { requestParser, requestTransform, serializeRequest } = this.context;
    let parsedPayload = serializeRequest ? this.serializeRequestBody(payload) : payload;
    parsedPayload = await resolve.call(this, requestParser, parsedPayload) || parsedPayload;
    if (requestTransform) parsedPayload = this.transform(parsedPayload, requestTransform);
    return parsedPayload;
  }

  transform(payload, transform) {
    const parsedPayload = _.isArray(payload) ? [] : {};
    for (const key in payload) {
      const nextKey = transform(key);
      if (_.isPlainObject(payload[key])) {
        parsedPayload[nextKey] = this.transform(payload[key], transform);
      } else {
        parsedPayload[nextKey] = payload[key];
      }
    }
    return parsedPayload;
  }

  async buildRequest(payload) {
    const { method, headers, allowCors, credentials } = this.context;
    const options = {
      method: method,
      credentials: credentials,
      headers: new Headers(headers),
      cors: allowCors ? 'cors' : 'no-cors',
    };
    if (method !== 'GET' && method !== 'HEAD') {
      const parsedPayload = await this.requestPayloadParser(payload);
      if (_.isPlainObject(parsedPayload)) {
        options.body = JSON.stringify(parsedPayload);
        options.headers.append('Content-Type', 'application/json');
      } else {
        options.body = parsedPayload;
      }
    }
    return options;
  }

  requestUrl(baseUri, path) {
    const url = baseUri ? `${baseUri.replace(/\/$/, '')}${path}` : path;
    return url !== '/' ? url.replace(/\/$/, '') : url;
  }

  async request(payload) {
    const { baseUri, path } = this.context;
    const url = this.requestUrl(baseUri, path);
    const options = await this.buildRequest(payload);
    return fetch(url, options);
  }

  mock(payload = {}) {
    const mock = resolve.call(this, this.context.mock, payload);
    const responseBody = _.isPlainObject(mock) ? mock : payload;
    return responseBody.id ? responseBody : { id: uuid(), ...responseBody };
  }

  call = async (payload) => {
    try {
      if (this.context.mock !== false) {
        return this.mock(payload);
      }
      const response = await this.request(payload);
      const body = await this.bodyTypeParser(response);
      if (!response.ok) throw this.fetchErrorParser(response, body);
      return this.responseParser(response, body);
    } catch (exception) {
      if (exception instanceof Error) log.error(exception);
      throw this.exceptionParser(exception);
    }
  };

}

export default ResourceCall;
