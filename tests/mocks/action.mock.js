import _ from 'lodash';
import Action from '../../modules/action.js';
import Constants from './constants.mock.js';
import Resource from './resource.mock.js';

export const asynchronousAction = Action.define({
  type: Constants('ACTIONS.ASYNC'),
  resource: Resource.any()
});

export   const synchronousAction = Action.define({
  type: Constants('ACTIONS.SYNC')
});
