import { shallow } from 'enzyme';
import { createStore } from 'redux';
import React from 'react';
import { diveTo, createRouterContext } from './helpers/testUtils';
import MockContainer from './__mocks__/MockContainer';

describe('Container Wrapper', () => {
  let container;
  beforeAll(() => {
    const store = createStore((state, action) => {
      if (action.type === 'test') {
        return { foo: 'dispatched' };
      }
      return { foo: 'fromStore' };
    });
    const context = createRouterContext({ bar: 'fromContext' });
    container = diveTo(shallow(<MockContainer store={store} />, context), 'MockContainer', context);
  });

  test('the container should be created correctly', () => {
    expect(container).toBeDefined();
  });

  test('the container should have the right name', () => {
    expect(MockContainer.displayName).toEqual('MockContainerContainer');
  });

  test('the container should delete his actions on unmount', () => {
    // TODO
  });

  test('the container should be connected to Redux state', () => {
    const props = container.props();
    expect(props).toHaveProperty('storeSubscription');
    expect(props).toHaveProperty('store');
  });

  test('the container should have the props from the store defined in mapStateToProps', () => {
    const props = container.props();
    expect(props).toHaveProperty('foo', 'fromStore');
  });

  test('the container should have the dispatchable actions defined in mapDispatchToProps', () => {
    const props = container.props();
    expect(props).toHaveProperty('doSomething');
    expect(props.doSomething).toBeInstanceOf(Function);
  });

  test('the container should have the actions array super prop', () => {
    const props = container.props();
    expect(props).toHaveProperty('actions');
    expect(props.actions).toBeInstanceOf(Array);
  });

  test('the container should have the router props', () => {
    const props = container.props();
    expect(props).toHaveProperty('match');
    expect(props).toHaveProperty('location');
    expect(props).toHaveProperty('history');
  });

  test('the container can dispatch an action and redux catch it', () => {
    container.props().dispatch({ type: 'test' });
    expect(container.props().store.getState()).toHaveProperty('foo', 'dispatched');
  });

  test('the container should render correctly', () => {
    expect(container.html()).toEqual('<div>fromStore</div>');
  });
});
