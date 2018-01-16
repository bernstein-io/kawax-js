import _ from 'lodash';
import SmartClass from 'smart-class';
import Constants from './constants';
import BodyParser from './body_parser';
import Resource from './resource';
import {Exception} from 'lib/exception';

export default class Action extends SmartClass {

  static required = [];

  defaultProps(options = {}) {
    return {
      resource: null,
      required: [],
      logLevel: 'debug',
      hook: false
    }
  }

  defaults(options = {}) {
    return {
      status: Constants.builtins('STATUS.OK'),
      context: {
        async: !!(this.props.resource && !(options.async === false))
      }
    }
  }

  validate() {
    let required = _.clone(this.props.required).push('type');
    let context = this.props.context;
    let valid = true;
    let missing = [];
    for(attribute in required) {
      if (!_.includes(context, attribute)) {
        missing.push(attribute);
        valid = false;
      }
    };
    if (!valid) Exception.warn('Missing required attributes [' + missing.join(',') + ']');
    return valid;
  }

  async processResourceAttempt(body) {
    let resourceProcessor = this.props.resource(this.context);
    if (_.isFunction(resourceProcessor)) {
      let resource = await resourceProcessor(body);
      return this.export({
        status: Constants.builtins('STATUS.REQUEST.SUCCESS'),
        payload: resource.payload,
        resource: resource
      });
    } else {
      throw Exception.error({
        message: 'Incorrect resource (not a function)',
        data: {resource: this.props.resource, resourceContext}
      });
    }
  }

  processResourceFail(error) {
    let exception = Exception.warn('Action: Could not process request', {error});
    return this.export({
      status: Constants.builtins('STATUS.REQUEST.ERROR'),
      error: exception.error,
      errorCode: exception.code
    });
  }

  process = ({payload = {}, ...context} = {}) => {
    this.set({context});
    if (this.props.resource && this.context.async == true) {
      return async () => {
        try {
          return await this.processResourceAttempt(payload);
        } catch(error) {
          return this.processResourceFail(error);
        }
      }
    } else {
      return this.export({payload});
    }
  }

  hook(payload) {
    if (_.isFunction(this.props.hook)) {
      return this.props.hook(this, payload);
    } else {
      return payload;
    }
  }

  export(options) {
    return this.hook({
      type: this.props.type,
      status: options.status || this.status,
      context: this.context,
      logLevel: this.props.logLevel,
      ...options
    });
  }

  static define(action) {
    return (options) => {
      let instance = this.new(action);
      return instance.process({...options});
    }
  }

}

