import _ from 'lodash';
import Action from '../src/Action';
import MockAction from './__mocks__/MockAction';

describe('Action class', () => {
  let action;

  beforeEach(() => {
    action = new Action();
  });

  test('type is undefined by default', () => {
    expect(Action.type).toEqual('__UNDEFINED__');
  });

  test('setStatus is correctly set the status', () => {
    action.setStatus('error');
    expect(action.status).toEqual('error');
  });

  test('export correctly returns a wrapper to the action constructor', () => {
    expect(Action.export()).toBeInstanceOf(Function);
    expect(Action.export()()).toBeInstanceOf(Action);
  });

  test('_dispatchPending works correctly', () => {
    const mock = jest.fn();
    action._dispatchPending(mock, { foo: 'bar' });
    expect(action.status).toEqual('pending');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test('_setGetState works correctly', () => {
    action._setGetState(() => ({ foo: 'bar', nested: { foo: 'bar' } }));
    expect(action.getState('foo')).toEqual('bar');
    expect(action.getState('nested', 'foo')).toEqual('bar');
    expect(action.getState('bar')).toBeUndefined();
  });

  test('_processSuccess sets success status, call the onSuccess method and correcly returns', async () => {
    const onSuccess = jest.fn();
    const payload = { foo: 'bar' };
    action._successCallback = onSuccess;
    const returnedSuccess = await action._processSuccess(payload, 'data');
    expect(action.status).toEqual('success');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(payload, 'data');
    expect(returnedSuccess).toEqual(payload);
  });

  test('_processError sets error status, call the onError method and correcly returns', async () => {
    const onError = jest.fn();
    const payload = { foo: 'bar' };
    action._errorCallback = onError;
    const returnedError = await action._processError(payload);
    expect(action.status).toEqual('error');
    expect(onError).toHaveBeenCalledTimes(1);
    const shouldHaveReturned = { ...action.error(), ...payload };
    expect(returnedError).toEqual(shouldHaveReturned);
  });

  test('_processPayload return the call object if it not a function', async () => {
    action.call = { foo: 'bar' };
    expect(await action._processPayload()).toBe(action.call);
  });

  test('_processPayload should call the call function if it is a function', async () => {
    const mock = jest.fn();
    action.call = mock;
    await action._processPayload('foo', 'bar');
    expect(mock).toHaveBeenCalledWith('foo', 'bar');

  });

  test('_processPayload should call processSuccess and return the result if call does not throw', async () => {
    const mockProcessSuccess = jest.fn(async () => 'foo');
    action._processSuccess = mockProcessSuccess;
    const returnedValue = await action._processPayload('foo', 'bar');
    expect(mockProcessSuccess).toHaveBeenCalledTimes(1);
    expect(returnedValue).toEqual('foo');
  });

  test('_processPayload should call processError and return the result if call does throw', async () => {
    action.call = () => {
      throw new Error('test');
    };
    const mockProcessError = jest.fn(async () => 'foo');
    action._processError = mockProcessError;
    const returnedValue = await action._processPayload('foo', 'bar');
    expect(mockProcessError).toHaveBeenCalledTimes(1);
    expect(returnedValue).toEqual('foo');
  });

  test('_afterDispatch should call _successCallback on success', async () => {
    action.status = 'success';
    const mockSuccess = jest.fn();
    action._successCallback = mockSuccess;
    await action._afterDispatch('foo');
    expect(mockSuccess).toHaveBeenCalledWith('foo');
  });

  test('_afterDispatch should call _errorCallback on error', async () => {
    action.status = 'error';
    const mockError = jest.fn();
    action._errorCallback = mockError;
    await action._afterDispatch('foo');
    expect(mockError).toHaveBeenCalledWith('foo');
  });

  test('_bindActionCreators should works correctly', () => {
    const mock = jest.fn(() => () => 'foo');
    Action.actionCreators = {
      foo: mock,
      bar: mock,
      notAFunction: 'bar',
    };

    action._bindActionsCreators();
    expect(action.foo).toBeDefined();
    expect(action.bar).toBeDefined();
    // If both foo and bar are defined we don't have to test everything for both
    expect(action.notAFunction).toBeUndefined();
    expect(action.bar).toBeInstanceOf(Function);
    expect(action.bar()).toBeInstanceOf(Promise);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

// Utility to test the format of the action object
const testPayloadFormat = (obj) => {
  expect(obj).toHaveProperty('id');
  expect(obj).toHaveProperty('timestamp');
  expect(obj).toHaveProperty('type');
  expect(obj).toHaveProperty('status');
  expect(obj).toHaveProperty('payload');
  expect(obj).toHaveProperty('options');
  expect(obj.options).toHaveProperty('delegate');
  expect(obj.options).toBeInstanceOf(Boolean);
};

describe('the Action flow is correct', () => {
  let mockFunc;
  let firstCall;
  let secondCall;
  beforeAll(async () => {
    const action = MockAction.export()();
    mockFunc = jest.fn();
    const tester = (data) => {
      mockFunc(data);
      testPayloadFormat(_.last(mockFunc.mock.calls)[0]);
    };
    action._call()(tester);
    await new Promise((res) => process.nextTick(res));
    [firstCall, secondCall] = _.flatten(mockFunc.mock.calls);
  });

  test('the action is correctly dispatched 2 times', () => {
    expect(mockFunc).toHaveBeenCalledTimes(2);
  });

  test('the action has the right status at each dispatch', () => {
    expect(firstCall).toHaveProperty('status', 'pending');
    expect(secondCall).toHaveProperty('status', 'success');
  });

  test('the action has the right payload at each dispatch', () => {
    expect(firstCall.payload).toHaveProperty('bar', 'foo');
    expect(secondCall.payload).toHaveProperty('foo', 'bar');
  });

  test('the action has the right type at each dispatch', () => {
    expect(firstCall).toHaveProperty('type', 'TEST');
    expect(secondCall).toHaveProperty('type', 'TEST');
  });
});
