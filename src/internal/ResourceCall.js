import _ from 'lodash';
import uuid from 'uuid';
import cleanDeep from 'clean-deep';
import Smart from '../Smart';
import log from '../helpers/log';
import resolve from '../helpers/resolve';
import promiseAll from '../helpers/promiseAll';
import CallThrottler from './CallThrottler';
import Runtime from '../Runtime';

const throttler = new CallThrottler();

const cachedFetch = (url, options, expiry) => {
  const cacheKey = url;
  const cached = global.sessionStorage.getItem(cacheKey);
  const whenCached = global.sessionStorage.getItem(`${cacheKey}:ts`);
  if (cached !== null && whenCached !== null) {
    const age = (Date.now() - whenCached) / 1000;
    if (age < expiry) {
      const response = new Response(new Blob([cached]));
      return Promise.resolve(response);
    }
    global.sessionStorage.removeItem(cacheKey);
    global.sessionStorage.removeItem(`${cacheKey}:ts`);
  }

  return fetch(url, options).then((response) => {
    if (response.status === 200) {
      const ct = response.headers.get('Content-Type');
      if (ct && (ct.match(/application\/json/i) || ct.match(/text\//i))) {
        response.clone().text().then((content) => {
          global.sessionStorage.setItem(cacheKey, content);
          global.sessionStorage.setItem(`${cacheKey}:ts`, Date.now());
        });
      }
    }
    return response;
  });
};

class ResourceCall extends Smart {

  static defaults = (options) => ({ options });

  async switchParser(data) {
    const { collection } = this.options;
    if (collection === true) {
      const entities = data.map((entity) => this.entityParser(entity));
      return promiseAll(entities);
    }
    return this.entityParser(data, this.options);
  }

  async entityParser(entity) {
    const { entityParser } = this.options;
    try {
      const parsedEntity = resolve(entityParser, entity, this.options);
      return parsedEntity;
    } catch (exception) {
      log.error(exception);
      return null;
    }
  }

  async collectionParser(payload) {
    const { collectionParser } = this.options;
    if (collectionParser) {
      return resolve(collectionParser, payload);
    }
    return payload;
  }

  metaParser(originalPayload, parsedData) {
    const { context, metaParser, responseTransform, uniqueId } = this.options;
    const parsedMeta = resolve(metaParser, originalPayload || {});
    if (context) {
      const store = Runtime('store');
      store._dispatch({
        type: `@@RESOURCE_CALL[${context.type}]`,
        payload: {
          resourceId: uniqueId,
          sort: context.sort,
          order: context.order,
          search: context.search,
          actionId: context.actionId,
          itemIds: _.map(parsedData, (entity) => entity.id),
          meta: responseTransform
            ? this.transform(parsedMeta, responseTransform)
            : parsedMeta,
        },
      });
    }
  }

  responseParser = async (response, body) => {
    const { responseParser, collection,
      responseTransform, metaParser, entityParser } = this.options;
    const payload = resolve(responseParser, response, body, this.options) || body;
    let data = collection ? await this.collectionParser(payload) : payload;
    data = responseTransform ? this.transform(data, responseTransform) : data;
    if (response.ok === true) {
      data = entityParser ? await this.switchParser(data) : data;
      if (collection && metaParser) this.metaParser(payload, data);
    }
    return data;
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
    const { responseTransform } = this.options;
    const error = this.options.errorParser({
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
    if (shadow && shadow.body) {
      return shadow.body;
    }
    const reader = _.lowerCase(this.options.reader);
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

  toFormData(payload) {
    const data = new FormData();
    _.each(payload, (value, key) => {
      data.append(key, value);
    });
    return data;
  }

  async requestPayloadParser(payload) {
    let parsedPayload;
    const { payloadParser, requestTransform } = this.options;
    if (payloadParser) {
      parsedPayload = await resolve(payloadParser, payload, this.options);
    } else {
      parsedPayload = await this.serializeRequestBody(payload);
    }
    if (requestTransform) parsedPayload = this.transform(parsedPayload, requestTransform);
    return cleanDeep(parsedPayload);
  }

  transform(payload, predicate) {
    const parsedPayload = _.isArray(payload) ? [] : {};
    for (const key in payload) {
      const nextKey = predicate(key);
      if (_.isPlainObject(payload[key])) {
        parsedPayload[nextKey] = this.transform(payload[key], predicate);
      } else {
        parsedPayload[nextKey] = payload[key];
      }
    }
    return parsedPayload;
  }

  buildRequest = async (payload) => {
    const { method, headers, allowCors, credentials, formData } = this.options;
    const parsedHeaders = resolve(headers, this.options);
    const requestOptions = {
      method: method,
      credentials: credentials,
      headers: new Headers(parsedHeaders),
      cors: allowCors ? 'cors' : 'no-cors',
    };
    if (method !== 'GET' && method !== 'HEAD') {
      const parsedPayload = await this.requestPayloadParser(payload);
      if (_.isPlainObject(parsedPayload) && !formData) {
        requestOptions.body = JSON.stringify(parsedPayload);
        requestOptions.headers.append('Content-Type', 'application/json');
      } else if (formData) {
        requestOptions.body = this.toFormData(parsedPayload);
      } else {
        requestOptions.body = parsedPayload;
      }
    }
    return requestOptions;
  };

  requestUrl = (baseUrl, basePath, path) => {
    const parsedPath = resolve(path, this.options);
    const parsedBasePath = resolve(basePath, this.options);
    const parsedBaseUri = resolve(baseUrl, this.options);
    const urlArray = _.compact([parsedBaseUri, parsedBasePath, parsedPath]);
    return urlArray.join('/').replace(/([^:]\/)\/+/g, '$1') || '/';
  };

  mock = ({ body }) => {
    const { mock } = this.options;
    const parsedBody = JSON.parse(body);
    const parsedMock = resolve(mock, parsedBody, this.options);
    const mockedBody = _.isPlainObject(parsedMock) ? parsedMock : parsedBody;
    return {
      ok: true,
      body: { id: uuid(), ...mockedBody },
    };
  };

  async postProcess(status, body, payload) {
    const options = this.options;
    const { onSuccess, onError } = this.options;
    if (onSuccess && status === 'success') {
      await onSuccess(body, { payload, options });
    } else if (onError && status === 'error') {
      await onError(body, { payload, options });
    }
  }

  getRequestPaginator() {
    const { paginate, context } = this.options;
    const pagination = resolve(paginate, this.options);
    return pagination || (context ? cleanDeep({
      sort: _.snakeCase(context.sort),
      order: context.order,
      page: context.page,
    }) : false);
  }

  getRequestParams() {
    const { filter, context } = this.options;
    const params = resolve(filter, this.options);
    if (context) {
      const { search } = context;
      return search ? { search, ...params } : params;
    }
    return params;
  }

  requestProcessor = async (payload) => {
    const { baseUrl, basePath, path, mock, expiry, method } = this.options;
    const url = new URL(this.requestUrl(baseUrl, basePath, path));
    const pagination = this.getRequestPaginator();
    const params = this.getRequestParams();
    const requestOptions = await this.buildRequest(payload);
    if (mock) return this.mock(requestOptions);
    if (params || pagination) url.search = new URLSearchParams({ ...pagination, ...params });
    const shadow = throttler.match({ ...requestOptions, url: url.toString() });
    if (shadow) {
      this.uniqueId = shadow.id;
      await shadow.promise;
      return shadow.request;
    }
    const request = method === 'GET' && expiry
      ? cachedFetch(url, requestOptions, expiry)
      : fetch(url, requestOptions);
    this.uniqueId = throttler.push(request, { ...requestOptions, url: url.toString() });
    return request;

  };

  responseProcessor = async (response) => {
    const { mock, noContent } = this.options;
    if (!noContent) {
      const body = mock ? response.body : await this.readBodyStream(response);
      return this.responseParser(response, body);
    }
    return false;
  };

  async* defaultHook(request, parser, { payload, options }) {
    const response = yield request(payload);
    return yield parser(response);
  }

  async process(payload) {
    const options = this.options;
    const request = this.requestProcessor;
    const parser = this.responseProcessor;
    const hook = options.hook || this.defaultHook;
    const generator = await hook(request, parser, { payload, options });
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
      throttler.clear(this.uniqueId);
      throw error;
    }
  };

}

export default ResourceCall;
