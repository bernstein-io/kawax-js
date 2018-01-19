import _ from 'lodash';
import SmartClass from 'smart-class';
import Exception from '../exceptions';

export default class BodyMap extends SmartClass {

  defaults(options = {}) {
    return {
      payload: options.payload || {},
      schema: options.schema || {},
      method: options.method || 'GET',
      isRaw: options.isRaw || false,
      shouldEncrypt: options.shouldEncrypt || false,
      shouldGenerateKeys: options.shouldGenerateKeys || false,
      shouldGenerateSecret: options.shouldGenerateSecret || false,
      shouldSign: options.shouldSign || false,
      encryptionKey: options.encryptionKey,
      signatureKey: options.signatureKey,
      existingSecret: options.existingSecret,
      fromResource: options.fromResource
    };
  }

  csrf() { return {}; }

  parameterize(payload) {
    let body = {}
    for(let item in payload) {
      let key = item;
      if (_.isString(item)) {
        key = _.snakeCase(item)
      }
      body[key] = payload[item];
    }
    return body;
  }

  protectFromForgery(payload) {
    let csrf = this.csrf();
    if (csrf) {
      let csrfParam = csrf.param;
      let csrfToken = csrf.token;
      return (csrfParam && csrfToken) ? _.extend(payload, {
        [csrfParam]: csrfToken
      }) : payload;
    } else {
      return payload;
    }
  }

  async build(payload) {
    let body = this.parameterize(payload);
    return this.protectFromForgery(body);
  }

  static async process(payload, options) {
    let instance = this.new(options);
    return await instance.build(payload);
  }
}
