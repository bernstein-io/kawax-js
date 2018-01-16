import _ from 'lodash';
import Request from 'request-promise-native';
import UrlPattern from 'url-pattern';
import SmartClass from 'smart-class';
import Exception from 'smart-exception';

import BodyBuilder from './body_builder';
import BodyParser from './body_parser';

export default class Resource extends SmartClass {

  defaults() {
    return {
      payload: null,
      response: false
    }
  }

  defaultProps(props) {
    return {
      schema: props.schema || {},
      method: props.method || 'GET',
      path: props.path || '/',
      isRaw: props.raw || false,
      isCollection: props.collection || false,
      shouldEncrypt: props.encrypt || false,
      shouldSign: props.sign || false,
      shouldGenerateKeys: props.generateKeys || false,
      shouldGenerateSecret: props.generateSecret || false,
      existingSecret: props.secret || false,
      encryptionKey: props.encryptionKey || false,
      signatureKey: props.signatureKey || false,
      fromResource: props.from || false
    }
  }

  headers() {
    return {};
  }

  pathFor(path) {
    let baseUri = this.props.baseUri ? this.props.baseUri : ''
    if (path) {
      return baseUri + path
    }
    else {
      return baseUri
    }
  }

  getRaw(attributePath = []) {
    return _.get(this.response.body, attributePath);
  }

  getUrl() {
    let path = this.props.path;
    let pattern = new UrlPattern(path);
    let url = pattern.stringify(this.context);
    return this.pathFor(url);;
  }

  async postProcessor(payload, response) {
    return payload;
  }

  async parseBody(response) {
    let parsedBody = await BodyParser.process(response, this.props);
    return await this.postProcessor(parsedBody, response);
  }

  request(options) {
    try {
      return Request(options);
    } catch(exception) {
      if (exception.error && exception.error.name == 'StatusCodeError') {
        return exception.error;
      } else {
        throw Exception.warn('Error performing request', {error: exception});
      }
    }
  }

  async buildBody(payload) {
    return await BodyBuilder.process(payload, this.props);
  }

  async preProcessor(payload, response) {
    return payload;
  }

  async performRequest(payload) {
    let hookedPayload = await this.preProcessor(payload);
    let requestBody = await this.buildBody(hookedPayload);
    return await this.request({
      form: requestBody,
      method: this.props.method,
      uri: this.getUrl(),
      headers: this.headers(),
      resolveWithFullResponse: true,
      json: true
    });
  }

  process = (context) => {
    this.set({context});
    return async (payload) => {
      let response = await this.performRequest(payload);
      let body = await this.parseBody(response);
      this.set({payload: body, response});
      return this;
    };
  }

  static define(resource) {
    return (options) => {
      let instance = this.new(resource);
      return instance.process(options);
    }
  }
}
