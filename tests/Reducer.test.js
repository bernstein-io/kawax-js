import { createStore } from 'redux';
import Reducer from '../src/Reducer';
import MockReducer from './__mocks__/MockReducers';

describe('Reducer Class', () => {
  let reducer;
  beforeEach(() => {
    reducer = new Reducer();
  });

  test('The reducer is instanciated correctly', () => {
    expect(reducer).toBeDefined();
  });

  test('The Reducer class has an empty initialState', () => {
    expect(Reducer.initialState).toEqual(false);
  });

  test('the assign method should merge the two objects if given two objects', () => {
    const obj1 = { foo: 'bar', test: { foo: 'bar' } };
    const obj2 = { bar: 'foo', test: { bar: 'foo' } };
    expect(reducer.assign(obj1, obj2)).toEqual(Object.assign({}, obj1, obj2));

  });

  test('the assign method should return the next parameter if both parameters are not objects', () => {
    const obj = { foo: 'bar', test: { foo: 'bar' } };
    const test = 'test';
    expect(reducer.assign(test, obj)).toBe(obj);
    expect(reducer.assign(obj, test)).toEqual(test);
  });

  test('_matchWithStatus should return a function', () => {
    expect(reducer._matchWithStatus([], jest.fn())).toBeInstanceOf(Function);
  });

  test('_matchWithStatus returned function should use the callback only if the status is right', () => {
    const mock = jest.fn();
    mock.mockReturnValue('ok');
    const state = { foo: 'bar', test: { foo: 'bar' } };
    const action = { status: 'success' };
    const returnedFunction = reducer._matchWithStatus(['error', 'success'], mock);
    expect(returnedFunction(state, action)).toEqual('ok');
    expect(mock).toHaveBeenCalledWith(state, action);
  });

  test('_matchWithStatus returned function should return the state if the status is not right', () => {
    const mock = jest.fn();
    const state = { foo: 'bar', test: { foo: 'bar' } };
    const action = { status: 'success' };
    const returnedFunction = reducer._matchWithStatus(['pending'], mock);
    expect(returnedFunction(state, action)).toBe(state);
    expect(mock).not.toHaveBeenCalled();
  });

  test('onPending provides a wrapper to only use the callback on pending actions', () => {
    const mockCallback = jest.fn();
    mockCallback.mockReturnValue('ok');
    const wrapper = reducer.onPending(mockCallback);
    expect(wrapper).toBeInstanceOf(Function);
    expect(wrapper('state', { status: 'pending' })).toEqual('ok');
    expect(wrapper('state', { status: 'success' })).toEqual('state');
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('onSuccess provides a wrapper to only use the callback on success actions', () => {
    const mockCallback = jest.fn();
    mockCallback.mockReturnValue('ok');
    const wrapper = reducer.onSuccess(mockCallback);
    expect(wrapper).toBeInstanceOf(Function);
    expect(wrapper('state', { status: 'success' })).toEqual('ok');
    expect(wrapper('state', { status: 'pending' })).toEqual('state');
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('onError provides a wrapper to only use the callback on error actions', () => {
    const mockCallback = jest.fn();
    mockCallback.mockReturnValue('ok');
    const wrapper = reducer.onError(mockCallback);
    expect(wrapper).toBeInstanceOf(Function);
    expect(wrapper('state', { status: 'error' })).toEqual('ok');
    expect(wrapper('state', { status: 'success' })).toEqual('state');
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('onDone provides a wrapper to only use the callback on error or success actions', () => {
    const mockCallback = jest.fn();
    mockCallback.mockReturnValue('ok');
    const wrapper = reducer.onDone(mockCallback);
    expect(wrapper).toBeInstanceOf(Function);
    expect(wrapper('state', { status: 'error' })).toEqual('ok');
    expect(wrapper('state', { status: 'success' })).toEqual('ok');
    expect(wrapper('state', { status: 'pending' })).toEqual('state');
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  test('every match helpers should call match', () => {
    const mock = jest.fn();
    reducer.match = mock;
    reducer.matchPending('test1');
    expect(mock).toHaveBeenLastCalledWith('test1');
    reducer.matchSuccess('test2');
    expect(mock).toHaveBeenLastCalledWith('test2');
    reducer.matchError('test3');
    expect(mock).toHaveBeenLastCalledWith('test3');
    reducer.matchDone('test4');
    expect(mock).toHaveBeenLastCalledWith('test4');
    expect(mock).toHaveBeenCalledTimes(4);

  });

  test('matchPending should call onPending', () => {
    const mock = jest.fn();
    reducer.onPending = mock;
    reducer.matchPending();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test('matchSuccess should call onSuccess', () => {
    const mock = jest.fn();
    reducer.onSuccess = mock;
    reducer.matchSuccess();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test('matchError should call onError', () => {
    const mock = jest.fn();
    reducer.onError = mock;
    reducer.matchError();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test('matchDone should call onDone', () => {
    const mock = jest.fn();
    reducer.onDone = mock;
    reducer.matchDone();
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

describe('Reducer Updates test', () => {

  let state;
  beforeEach(() => {
    state = createStore(MockReducer.export()).getState();
  });

  test('State should be correctly initialized', () => {
    expect(state).toEqual({ foo: 'bar', nested: { bar: 'foo' }, plainObject: {} });
  });

  test('Nothing should happen on an action not matched', () => {
    const newState = MockReducer.export()(state, { type: 'NOTMATCHED' });
    expect(newState).toEqual(state);
  });

  test('Direct match should correctly updates state', () => {
    const newState = MockReducer.export()(state, { type: 'FOO', payload: 'foo' });
    state.foo = 'foo';
    expect(newState).toEqual(state);
  });

  test('Nested match should correctly updates state', () => {
    const newState = MockReducer.export()(state, { type: 'NESTED.BAR', payload: 'bar' });
    state.nested.bar = 'bar';
    expect(newState).toEqual(state);
  });

  test('Nested match should correctly updates state inside objects', () => {
    const newState = MockReducer.export()(state, { type: 'PLAINOBJECT.ADDTOOBJECT' });
    state.plainObject = { test: 'foo' };
    expect(newState).toEqual(state);
  });

  test('Null state should reset the state of the reducer', () => {
    let newState = MockReducer.export()(state, { type: 'FOO', payload: 'test' });
    newState = MockReducer.export()(state, { type: 'PLAINOBJECT.ADDTOOBJECT' });
    expect(newState).not.toEqual(state);
    const resetedState = MockReducer.export()(null, { type: 'RESET' });
    expect(resetedState).toEqual(state);
  });

});
