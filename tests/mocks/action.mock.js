import _ from 'lodash';
import Action from '../../src/actions';
import {Constant} from '../../src/misc';
import Resource from './resource.mock.js';

Constant('ACTIONS', ['ASYNC', 'SYNC']);

export const asynchronousAction = Action.define({
  type: Constant('ACTIONS.ASYNC'),
  resource: Resource.any()
});

export   const synchronousAction = Action.define({
  type: Constant('ACTIONS.SYNC')
});
