import _ from 'lodash';
import keyMirror from 'key-mirror-nested';
import DeepMerge from 'deepmerge';
import SmartClass from 'smart-class';
import {Exception} from 'lib/exception';

export const BUILTINS = keyMirror({
  INIT: {
    REDUX: '@@INIT',
    KAWAX: '@@kawax/INIT'
  },
  ACTIONS: {
    RESET: null
  },
  STATUS: {
    OK: null,
    REQUEST: {
      SUCCESS: null,
      ERROR: null
    }
  }
});

export default class Constants extends SmartClass {

  defaultProps(options = {}) {
    let builtins = BUILTINS;
    let constants = keyMirror(options);
    return DeepMerge(builtins, constants);
  }

  lookup = (value) => {
    let normalizedConstant = _.toUpper(value);
    let map = normalizedConstant.split('.')
    let constant = _.get(this.props, map);
    if (!constant) {
      Exception.warn(`Undefined constant ${normalizedConstant}`)
      return null;
    }
    return _.isString(constant) ? constant : normalizedConstant;
  }

  reflector = (constant = null) => {
    if (constant) {
      return this.lookup(constant);
    } else {
      return this.props;
    }
  }

  static import(constants = {}) {
    let instance = this.new(constants);
    return instance.reflector;
  }

  static builtins(value) {
    if(!this.instance) this.instance = this.new({});
    return this.instance.lookup(value);
  }

}
