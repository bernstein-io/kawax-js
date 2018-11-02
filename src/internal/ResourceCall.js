import _ from 'lodash';
import uuid from 'uuid';
import Smart from '../Smart';
import resolve from '../helpers/resolve';
import log from '../helpers/log';

class ResourceCall extends Smart {

  static defaults = (context) => ({ context });

  async entityParser(data) {
    const { collection, entityParser } = this.context;
    if (collection === true) {
      const parsedEntities = data.map((entity) => resolve(entityParser, entity, this.context));
      return Promise.all(parsedEntities);
    }
    return entityParser(data, this.context);
  }

  async collectionParser(response) {
    return response.collection;
  }

  responseParser = async (response, body) => {
    const { responseParser, collection, responseTransform, entityParser } = this.context;
    let payload = resolve(responseParser, response, body, this.context) || body;
    payload = collection ? await this.collectionParser(payload) : payload;
    payload = responseTransform ? this.transform(payload, responseTransform) : payload;
    payload = entityParser ? await this.entityParser(payload) : payload;
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

  fetchErrorParser(response, body = {}) {
    const { responseTransform } = this.context;
    return this.context.errorParser({
      code: response.status,
      status: _.snakeCase(response.statusText),
      message: response.statusText,
      ...(responseTransform ? this.transform(body, responseTransform) : body),
    });
  }

  async readBodyStream(response) {
    let body;
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
      return body;
    } catch (exception) {
      const status = response.status;
      throw new Error(`Unexpected content: Could not parse ${reader} (status: ${status})`);
    }
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
      await onSuccess(body, { response, payload, context });
    } else if (onError && status === 'error') {
      await onError(body, { response, payload, context });
    }
  }

  requestProcessor = async (payload) => {
    const { baseUri, path, mock } = this.context;
    const url = this.requestUrl(baseUri, path);
    const options = await this.buildRequest(payload);
    if (mock) return this.mock(options);
    return fetch(url, options);
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
    const parsedBody = await generator.next(body);
    if (!response.ok) throw this.fetchErrorParser(response, parsedBody);
    return parsedBody.value;
  }

  call = async (payload) => {
    try {
      const body = await this.process(payload);
      await this.postProcess('success', body, payload);
      return body;
    } catch (exception) {
      if (exception instanceof Error) log.error(exception);
      const error = await this.exceptionParser(exception);
      await this.postProcess('error', body, payload);
      throw error;
    }
  };

}

export default ResourceCall;
