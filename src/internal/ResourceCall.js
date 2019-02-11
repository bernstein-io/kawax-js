import _ from 'lodash';
import uuid from 'uuid';
import Smart from '../Smart';
import log from '../helpers/log';
import resolve from '../helpers/resolve';
import promiseAll from '../helpers/promiseAll';
import CallThrottler from './CallThrottler';

const throttler = new CallThrottler();

class ResourceCall extends Smart {

  static defaults = (context) => ({ context });

  async switchParser(data) {
    const { collection } = this.context;
    if (collection === true) {
      const entities = data.map((entity) => this.entityParser(entity));
      return promiseAll(entities);
    }
    return this.entityParser(data, this.context);
  }

  async entityParser(entity) {
    const { entityParser } = this.context;
    try {
      const parsedEntity = resolve(entityParser, entity, this.context);
      return parsedEntity;
    } catch (exception) {
      return null;
    }
  }

  async collectionParser(payload) {
    return _.isArray(payload.collection) ? payload.collection : payload;
  }

  responseParser = async (response, body) => {
    const { responseParser, collection, responseTransform, entityParser } = this.context;
    let payload = resolve(responseParser, response, body, this.context) || body;
    payload = collection ? await this.collectionParser(payload) : payload;
    payload = responseTransform ? this.transform(payload, responseTransform) : payload;
    if (response.ok === true) {
      payload = entityParser ? await this.switchParser(payload) : payload;
    }
    return payload;
  };

  exceptionParser(exception) {
    return {
      code: exception.code || 0,
      status: exception.status || 'javascript_error',
      message: exception.message || 'Oops, something went wrong',
      ...exception,
    };
  }

  httpErrorParser(response, body = {}) {
    const payload = _.isObject(body) ? body : {};
    const { responseTransform } = this.context;
    const error = this.context.errorParser({
      code: payload.code || response.status,
      status: payload.status || _.snakeCase(response.statusText),
      message: payload.message || response.statusText,
      ...(responseTransform ? this.transform(body, responseTransform) : body),
    });
    return error;
  }

  async readBodyStream(response) {
    let body;
    const shadow = throttler.find(this.uniqueId);
    if (shadow && shadow.body) return shadow.body;
    const reader = _.lowerCase(this.context.reader);
    try {
      switch (reader) {
        case 'json':
          body = await response.json();
          break;
        case 'formdata':
          body = await response.formData();
          break;
        case 'arraybuffer':
          body = await response.arrayBuffer();
          break;
        case 'blob':
          body = await response.blob();
          break;
        case 'text':
          body = await response.text();
          break;
        default:
          body = await response.text();
          break;
      }
      throttler.set(this.uniqueId, { body });
    } catch (exception) {
      const status = response.status;
      throw new Error(`Unexpected content: Could not parse ${reader} (status: ${status})`);
    }
    return body;
  }

  serializeRequestBody = async (payload) => {
    const parsedPayload = {};
    for (const key in payload) {
      if (_.isPlainObject(payload[key])) {
        parsedPayload[key] = JSON.stringify(payload[key]);
      } else {
        parsedPayload[key] = payload[key];
      }
    }
    return parsedPayload;
  };

  async requestPayloadParser(payload) {
    let parsedPayload;
    const { payloadParser, requestTransform } = this.context;
    if (payloadParser) {
      parsedPayload = await resolve(payloadParser, payload, this.context);
    } else {
      parsedPayload = await this.serializeRequestBody(payload);
    }
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

  buildRequest = async (payload) => {
    const { method, headers, allowCors, credentials } = this.context;
    const parsedHeaders = resolve(headers, this.context);
    const options = {
      method: method,
      credentials: credentials,
      headers: new Headers(parsedHeaders),
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
  };

  requestUrl = (baseUri, path) => {
    const parsedPath = resolve(path, this.context);
    const parsedBaseUri = resolve(baseUri, this.context);
    const url = parsedBaseUri ? `${parsedBaseUri.replace(/\/$/, '')}${parsedPath}` : parsedPath;
    return url !== '/' ? url.replace(/\/$/, '') : url;
  };

  mock = ({ body }) => {
    const { mock } = this.context;
    const parsedBody = JSON.parse(body);
    const parsedMock = resolve(mock, parsedBody, this.context);
    const mockedBody = _.isPlainObject(parsedMock) ? parsedMock : parsedBody;
    return {
      ok: true,
      body: { id: uuid(), ...mockedBody },
    };
  };

  async postProcess(status, body, payload) {
    const context = this.context;
    const { onSuccess, onError } = this.context;
    if (onSuccess && status === 'success') {
      await onSuccess(body, { payload, context });
    } else if (onError && status === 'error') {
      await onError(body, { payload, context });
    }
  }

  requestProcessor = async (payload) => {
    const { baseUri, path, mock, paginate } = this.context;
    const url = new URL(this.requestUrl(baseUri, path));
    const options = await this.buildRequest(payload);
    if (mock) return this.mock(options);
    if (paginate) url.search = new URLSearchParams(paginate);
    const shadow = throttler.match({ url: url.toString(), ...options });
    if (shadow) {
      this.uniqueId = shadow.id;
      await shadow.promise;
      return shadow.request;
    }
    const request = fetch(url, options);
    this.uniqueId = throttler.push(request, { url: url.toString(), ...options });
    return request;

  };

  responseProcessor = async (response) => {
    const { mock } = this.context;
    const body = mock ? response.body : await this.readBodyStream(response);
    return this.responseParser(response, body);
  };

  async* defaultHook(request, parser, { payload, context }) {
    const response = yield request(payload);
    return yield parser(response);
  }

  async process(payload) {
    const context = this.context;
    const request = this.requestProcessor;
    const parser = this.responseProcessor;
    const hook = context.hook || this.defaultHook;
    const generator = await hook(request, parser, { payload, context });
    const responseProcessor = await generator.next();
    const response = await responseProcessor.value;
    const bodyProcessor = await generator.next(response);
    const body = await bodyProcessor.value;
    const parsedBodyProcessor = await generator.next(body);
    const parsedBody = await parsedBodyProcessor.value;
    if (!response.ok) throw this.httpErrorParser(response, parsedBody);
    return parsedBody;
  }

  call = async (payload) => {
    try {
      const body = await this.process(payload);
      await this.postProcess('success', body, payload);
      throttler.clear(this.uniqueId);
      return body;
    } catch (exception) {
      if (exception instanceof Error) log.error(exception);
      const error = await this.exceptionParser(exception);
      await this.postProcess('error', error, payload);
      throw error;
    }
  };

}

export default ResourceCall;
