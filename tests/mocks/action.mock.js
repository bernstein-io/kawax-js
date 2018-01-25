import _ from 'lodash';
import Action from '../../src/actions';
import Constant from './constant.mock.js';
import Resource from './resource.mock.js';

export const asynchronousAction = Action.define({
  type: Constant('ACTIONS.ASYNC'),
  resource: Resource.any()
});

export   const synchronousAction = Action.define({
  type: Constant('ACTIONS.SYNC')
});
