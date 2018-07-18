import _ from 'lodash';
import Smart from '../Smart';
import resolve from '../helpers/resolve';

class ResourceCall extends Smart {

  defaults(context) { return { context }; }

  async _entityParser(entity) {
    const { collection, entityParser } = this.context;
    if (collection === true) {
      const parsedEntities = entity.map((value) => entityParser(value, this.context));
      return Promise.all(parsedEntities);
    }
    return entityParser(entity, this.context);
  }

  async _collectionParser(response) {
    return response.collection;
  }

  async _responseBodyParser(body) {
    const { responseParser, collection, responseTransform, entityParser } = this.context;
    const response = resolve.call(this, responseParser, body) || body;
    let payload = collection ? await this._collectionParser(response) : response;
    payload = responseTransform ? this._transform(payload, responseTransform) : payload;
    payload = entityParser ? await this._entityParser(payload) : payload;
    return payload;
  }

  _exceptionParser(exception) {
    return {
      code: exception.code || 0,
      status: exception.status || 'javascript_error',
      message: exception.message || 'Oops, something went wrong',
      ...exception,
    };
  }

  _fetchErrorParser(response, body) {
    const { responseTransform } = this.context;
    return this.context.errorParser({
      ...(responseTransform ? this._transform(body, responseTransform) : body),
      code: response.status,
      message: response.statusText,
      status: _.snakeCase(response.statusText),
    });
  }

  _bodyTypeParser(response) {
    const { responseType } = this.context;
    switch (responseType.toLowerCase()) {
      case 'json':
        return response.json();
      case 'text':
        return response.text();
      case 'formdata':
        return response.formData();
      case 'arraybuffer':
        return response.arrayBuffer();
      case 'blob':
        return response.blob();
      default:
        throw new Error('Unsupported response type');
    }
  }

  _responseParser(response) {
    return {
      body: this._bodyTypeParser(response),
      status: _.snakeCase(response.statusText),
      code: response.status,
    };
  }

  _requestPayloadParser(payload) {
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

  _requestOptions(payload) {
    const { method, headers, allowCors, credentials } = this.context;
    const options = {
      method,
      credentials,
      cors: allowCors ? 'cors' : 'no-cors',
      headers: new Headers(headers),
    };
    if (method !== 'GET' && method !== 'HEAD') {
      const parsedPayload = this._requestPayloadParser(payload);
      if (_.isPlainObject(parsedPayload)) {
        options.body = JSON.stringify(parsedPayload);
        options.headers.append('Content-Type', 'application/json');
      } else {
        options.body = parsedPayload;
      }
    }
    return options;
  }

  _requestUrl(baseUri, path) {
    const url = baseUri ? `${baseUri.replace(/\/$/, '')}${path}` : path;
    return url !== '/' ? url.replace(/\/$/, '') : url;
  }

  _request(payload) {
    const { baseUri, path } = this.context;
    const url = this._requestUrl(baseUri, path);
    const options = this._requestOptions(payload);
    return fetch(url, options);
  }

  call = async (payload) => {
    try {
      const response = await this._request(payload);
      const body = await this._bodyTypeParser(response);
      if (!response.ok) throw this._fetchErrorParser(response, body);
      return this._responseBodyParser(body);
    } catch (exception) {
      throw this._exceptionParser(exception);
    }
  };

}

export default ResourceCall;
