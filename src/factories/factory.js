import _ from 'lodash';
import SmartClass from 'smart-class';
import Constants from './constants';
import BodyParser from './body_parser';
import {Exception, Warn} from 'lib/exception';
import Store from 'src/store';

export default class Factory extends SmartClass {

  succeeded(action) {
    if (action.status == Constants.builtins('STATUS.REQUEST.SUCCESS')) {
      return true;
    } else {
      return false;
    }
  }

  notFound(action) {
    if (action.status == Constants.builtins('STATUS.REQUEST.ERROR') &&
        _.get(action, 'errorCode') == 404) {
      return true;
    } else {
      return false;
    }
  }

  async dispatch(action) {
    return await Store.dispatch(async (dispatch) => {
      let payload = _.isPlainObject(action) ? action : await action();
      if (!_.isEmpty(payload)) {
        this.action = payload;
        return await dispatch(payload);
      } else {
        return Exception.error("Factory can't dispatch an empty action.");
      }
    });
  }

  static async run(callback) {
    let builder = this.new();
    callback.bind(builder);
    return await callback(builder);
  }

}
