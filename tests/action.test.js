import _ from 'lodash';
import Action from '../src/actions';

import {Constant} from '../src/misc';
import {synchronousAction, asynchronousAction} from './mocks/action.mock.js';

describe('SYNCHRONOUS_ACTION', () => {

  it('Action.define return function', async () => {
    expect(_.isFunction(synchronousAction)).toBe(true);
  });

  it('Call action (no payload) returns plain object', async () => {
    let action = synchronousAction();
    expect(_.isPlainObject(action)).toBe(true);
  });

  it('Call action with payload returns plain object with payload', () => {
    let payload = {firstName: "Walter", lastName: "White"};
    let action = synchronousAction({payload});
    expect(_.isPlainObject(action)).toBe(true);
    expect(action.payload).toEqual(payload);
  });

});

describe('ASYNCHRONOUS_ACTION', () => {

  it('Action.define return function', () => {
    expect(_.isFunction(asynchronousAction)).toBe(true);
  });

  it('Call action with resource returns function (Promise)', () => {
    expect(_.isFunction(asynchronousAction())).toBe(true);
    expect(asynchronousAction()()).toBeInstanceOf(Promise);
  });

  it('Call action with async:false options', async () => {
    let action = await asynchronousAction({async: false});
    expect(_.isPlainObject(action)).toBe(true);
  });

  it('Call action (no payload) returns plain object', async () => {
    let action = await asynchronousAction()();
    expect(_.isPlainObject(action)).toBe(true);
  });

  it('Call action with payload returns plain object with payload', async () => {
    let payload = {firstName: "Walter", lastName: "White"};
    let action = await asynchronousAction({payload})();
    expect(action.payload).toEqual(payload);
  });

});
