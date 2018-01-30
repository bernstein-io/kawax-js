import _ from 'lodash';
import SmartClass from 'smart-class';
import {Constant} from '../misc';
import Resource from '../resources';
import Exception from '../exceptions';
import {BodyParser} from '../resources';

const STATUS = Constant('STATUS', {
  'PENDING': true,
  'SUCCESS': true,
  'ERROR': true
});

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

  defaultState(options) {
    return {
      status: STATUS('PENDING'),
      async: !!(this.props.resource && !(this.props.async === false))
    }
  }

  validate() {
    let required = _.clone(this.props.required).push('type');
    let state = this.props.state;
    let valid = true;
    let missing = [];
    for(attribute in required) {
      if (!_.includes(state, attribute)) {
        missing.push(attribute);
        valid = false;
      }
    };
    if (!valid) Exception.warn('Missing required attributes [' + missing.join(',') + ']');
    return valid;
  }

  async processResourceAttempt(body) {
    let resourceProcessor = this.props.resource(this.state);
    if (_.isFunction(resourceProcessor)) {
      let resource = await resourceProcessor(body);
      return this.export({
        status: STATUS('SUCCESS'),
        payload: resource.payload,
        resource: resource
      });
    } else {
      throw Exception.error({
        message: 'Incorrect resource (not a function)',
        data: {resource: this.props.resource, resourceState}
      });
    }
  }

  processResourceFail(error) {
    let exception = Exception.warn('Action: Could not process request', {error});
    return this.export({
      status: Constant('STATUS.REQUEST.ERROR'),
      error: exception.error,
      errorCode: exception.code
    });
  }

  process = ({payload = {}, ...options} = {}) => {
    this.setState(options);
    if (this.props.resource && this.state.async == true) {
      return async () => {
        try {
          return await this.processResourceAttempt(payload);
        } catch(error) {
          return this.processResourceFail(error);
        }
      }
    } else {
      this.setState({status: STATUS('SUCCESS')});
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
      context: this.state,
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

