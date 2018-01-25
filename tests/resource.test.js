import _ from 'lodash';
import Action from '../src/actions';
import Constant from './mocks/constant.mock.js';
import Resource from './mocks/resource.mock.js';

import {asynchronousAction} from './mocks/action.mock.js';

import Request from 'request-promise-native';

describe('ANY RESOURCE', () => {

  it('Resource.method() returns a function (instance reflector)', () => {
    let postMethod = Resource.any();
    expect(_.isFunction(postMethod)).toBe(true);
  });

  it('Resource.method()({context}) method returns a function (processor)', () => {
    let methodProcessor = Resource.any()({});
    expect(_.isFunction(methodProcessor)).toBe(true);
  });

  it('Resource.method()({context})({payload}) method returns a function', async () => {
    let action = await asynchronousAction();
    let postMethod = Resource.any()(action.context);
    expect(_.isFunction(postMethod)).toBe(true);
  });

  it('Calling Resource.method()({context})() method returns a promise', async () => {
    let action = await asynchronousAction();
    let anyMethodCall = Resource.any()(action.context)({});
    expect(anyMethodCall).toBeInstanceOf(Promise);
  });

  it('Resource should have a {payload} attribute', async () => {
    let actionPayload = await asynchronousAction();
    let resource = await Resource.any()(actionPayload)({});
    expect(resource.payload).toBeDefined();
    expect(_.isPlainObject(resource.payload)).toBe(true);
  });

  it('Resource should have a {response} attribute', async () => {
    let actionPayload = await asynchronousAction();
    let resource = await Resource.any()(actionPayload)({});
    expect(resource.response).toBeDefined();
    expect(_.isPlainObject(resource.response)).toBe(true);
  });

  // it('Resource request has {payload, options, request}', async () => {
  //   let request = await Request({
  //     json: true,
  //     method: 'GET',
  //     uri: 'http://www.mocky.io/v2/5185415ba171ea3a00704eed',
  //     form: {},
  //     resolveWithFullResponse: true
  //   });
  //   let resource = await Resource.post(actionPayload)({});
  //   let actionPayload = await asynchronousAction();
  // });


});
