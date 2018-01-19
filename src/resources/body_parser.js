import _ from 'lodash';
import SmartClass from 'smart-class';
import Constants from '../misc/constants';
import Exception from '../exceptions';

export default class BodyParser extends SmartClass {

  defaultProps(options) {
    return {
      schema: options.schema || {},
      collection: options.collection || false
    }
  }

  camelize(payload) {
    let camelizedPayload = {}
    for(let rawKey in payload) {
      let key = _.camelCase(rawKey)
      camelizedPayload[key] = payload[rawKey];
    }
    return camelizedPayload;
  }

  mapCipher(key, property, body) {
    let cipher = body[key];
    return this.attempt(() => {
      if (_.isPlainObject(cipher) && cipher.text) {
        return cipher;
      } else if (body[key] && body[key + '_iv']) {
        return {
          text: body[key],
          iv: body[key + '_iv']
        };
      } else if (_.isString(cipher)) {
        return JSON.parse(cipher);
      }
    });
  }

  async mapAttribute(key, {type} = {}, body) {
    let attribute = body[key];
    return this.begin({
      attempt: async () => {
        switch(type) {
          case 'object':
            return _.isObject(attribute) ? attribute : JSON.parse(attribute);
          default: {
            return attribute;
          }
        }
      },
      rescue: () => attribute
    });
  }

  async mapResource(body) {
    let resource = {}
    let properties = this.props.schema.properties || {};
    for(let rawKey in body) {
      let key = _.camelCase(rawKey);
      let attribute = body[rawKey];
      let property = properties[key] || {};
      if (attribute && (this.props.strict === false || properties[key])) {
        await this.begin({
          attempt: async () => {
            if (property.cipher === true) {
              resource[key] = this.mapCipher(rawKey, property, body);
            } else {
              resource[key] = await this.mapAttribute(rawKey, property, body)
            }
          },
          rescue: (error) => Exception.warn(error)
        });
      }
    }
    return resource;
  }

  async process({body, ...response}) {
    this.set({body, response});
    if (this.props.collection) {
      let resources = [];
      let collection = body.collection;
      for (let index in collection) {
        resources[index] = await this.mapResource(collection[index]);
      }
      return {
        collection: resources,
        pagination: this.camelize(body.pagination)
      }
      return object;
    } else {
      return await this.mapResource(body);
    }
  }

}


