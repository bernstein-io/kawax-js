import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import queryString from 'query-string';
import cleanDeep from 'clean-deep';
import Smart from '../Smart';
import log from '../helpers/log';
import resolve from '../helpers/resolve';
import promiseAll from '../helpers/promiseAll';
import CallThrottler from './CallThrottler';
import Runtime from '../instance/Runtime';

const throttler = new CallThrottler();

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
    const context = this.getContext();
    try {
      const parsedEntity = await resolve(entityParser, entity, context);
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

  getContext = () => {
    const { context, ...resource } = this.options;
    return {
      ...context,
      resource,
    };
  };

  metaParser(originalPayload, parsedData) {
    const { baseUrl, path, metaParser, responseTransform, uniqueId } = this.options;
    const context = this.getContext();
    const parsedMeta = resolve(metaParser, originalPayload || {});
    const requestUrl = this.requestUrl(baseUrl, path);
    if (context) {
      const store = Runtime('store');
      store._dispatch({
        type: `@@RESOURCE_CALL[${context.type}]`,
        payload: {
          resourceId: uniqueId,
          url: requestUrl,
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

  schemaParser(data) {
    const { schema, schemaParser } = this.options;
    const context = this.getContext();
    return schemaParser ? schemaParser(data, schema, context) : data;
  }

  responseParser = async (response, body) => {
    const { responseParser, collection, responseTransform,
      metaParser, entityParser, schema } = this.options;
    const context = this.getContext();
    const payload = resolve(responseParser, response, body, context) || body;
    let data = collection ? await this.collectionParser(payload) : payload;
    data = responseTransform ? this.transform(data, responseTransform) : data;
    if (response.ok === true) {
      data = entityParser ? await this.switchParser(data) : data;
      data = !_.isEmpty(schema) ? this.schemaParser(data) : data;
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
      const { status } = response;
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
    const context = this.getContext();
    if (payloadParser) {
      parsedPayload = await resolve(payloadParser, payload, context);
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
    const context = this.getContext();
    const parsedHeaders = resolve(headers, context);
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

  parseUrl = (urlPointer) => {
    const context = this.getContext();
    const url = resolve(urlPointer, context);
    if (_.isArray(url)) {
      return _.compact(url).join('/');
    }
    return url;
  };

  requestUrl = (baseUrl, path) => {
    const parsedBaseUri = this.parseUrl(baseUrl);
    const parsedPath = this.parseUrl(path);
    const urlArray = _.compact([parsedBaseUri, parsedPath]);
    return urlArray.join('/').replace(/([^:]\/)\/+/g, '$1') || '/';
  };

  mock = ({ body }) => {
    const { mock } = this.options;
    const context = this.getContext();
    const parsedBody = JSON.parse(body);
    const parsedMock = resolve(mock, parsedBody, context);
    const mockedBody = _.isPlainObject(parsedMock) ? parsedMock : parsedBody;
    return {
      ok: true,
      body: { id: uuid(), ...mockedBody },
    };
  };

  async postProcess(status, body, payload) {
    const { options } = this;
    const { onSuccess, onError } = this.options;
    if (onSuccess && status === 'success') {
      await onSuccess(body, { payload, options });
    } else if (onError && status === 'error') {
      await onError(body, { payload, options });
    }
  }

  getRequestPaginator() {
    const { paginate } = this.options;
    const context = this.getContext();
    const pagination = resolve(paginate);
    return pagination || (context ? cleanDeep({
      sort: _.snakeCase(context.sort),
      order: context.order,
      page: context.page,
    }) : false);
  }

  parseFilters() {
    const context = this.getContext();
    const { filter: rawFilter } = this.options;
    const filters = resolve(rawFilter, context);
    const parsedFilters = this.transform(filters, _.snakeCase);
    return _.pickBy(parsedFilters, _.identity);
  }

  getRequestParams() {
    const context = this.getContext();
    const filters = this.parseFilters();
    if (context) {
      const { search } = context;
      return search ? { search, ...filters } : filters;
    }
    return filters;
  }

  async cachedFetch(url, options, expiry) {
    const cacheKey = url;
    const cached = global.sessionStorage.getItem(cacheKey);
    const whenCached = global.sessionStorage.getItem(`${cacheKey}:ts`);
    if (cached !== null && whenCached !== null) {
      const age = (Date.now() - whenCached);
      if (age < expiry) {
        const response = new Response(new Blob([cached]));
        return Promise.resolve(response);
      }
      global.sessionStorage.removeItem(cacheKey);
      global.sessionStorage.removeItem(`${cacheKey}:ts`);
    }
    const response = await fetch(url, options);
    if (response.status === 200) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.match(/application\/json/i)) {
        const responseClone = await response.clone();
        const content = await responseClone.text();
        global.sessionStorage.setItem(cacheKey, content);
        global.sessionStorage.setItem(`${cacheKey}:ts`, Date.now());
      }
    }
    return response;
  }

  requestProcessor = async (payload) => {
    const { baseUrl, path, mock, expiry, cache, method } = this.options;
    const parsedUrl = this.requestUrl(baseUrl, path);
    const url = new URL(parsedUrl);
    const searchParams = queryString.parse(url.search);
    const pagination = this.getRequestPaginator();
    const params = this.getRequestParams();
    const requestOptions = await this.buildRequest(payload);
    if (mock) return this.mock(requestOptions);
    if (params || pagination) {
      url.search = new URLSearchParams({
        ...searchParams,
        ...pagination,
        ...params,
      });
    }
    const shadow = throttler.match({ ...requestOptions, url: url.toString() });
    if (shadow) {
      this.uniqueId = shadow.id;
      await shadow.promise;
      return shadow.request;
    }
    const request = (method === 'GET' && expiry && cache !== false)
      ? this.cachedFetch(url, requestOptions, expiry)
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

  async* defaultHook(request, parser, payload) {
    const response = yield request(payload);
    return yield parser(response);
  }

  async process(payload) {
    const { hook } = this.options;
    const context = this.getContext();
    const request = this.requestProcessor;
    const parser = this.responseProcessor;
    const requestHook = hook || this.defaultHook;
    const generator = await requestHook(request, parser, payload, context);
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
