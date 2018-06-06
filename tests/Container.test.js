import { shallow } from 'enzyme';
import { createStore } from 'redux';
import React from 'react';
import MockContainer from './__mocks__/MockContainer';

describe('Container Wrapper', () => {
  let store;
  beforeAll(() => {
    store = createStore(() => ({
      foo: 'fromStore',
    }));
  });

  test('the container should be created correctly', () => {
    const wrapper = shallow(<MockContainer store={store} />);
    expect(wrapper).toBeDefined();
  });

  test('the container should have the right name', () => {
    expect(MockContainer.displayName).toEqual('MockContainerContainer');
  });

  test('the container should have the lifecycle functions wrapped', () => {
    const wrapper = shallow(<MockContainer store={store} />);
    expect(wrapper.name()).toEqual('lifecycle(Connect(withContext(MockContainer)))');
  });

  test('the container should delete his actions on unmount', () => {
    // TODO
  });

  test('the container should be connected to Redux state', () => {
    const wrapper = shallow(<MockContainer store={store} />).dive();
    expect(wrapper.name()).toEqual('Connect(withContext(MockContainer))');
  });

  test('the container should have the props from the store defined in mapStateToProps', () => {
    const wrapper = shallow(<MockContainer store={store} />).dive().dive();
    expect(wrapper.props()).toHaveProperty('foo', 'fromStore');
  });

  test('the container should have the actions defined in mapDispatchToProps', () => {
    const wrapper = shallow(<MockContainer store={store} />).dive().dive();
    expect(wrapper.props()).toHaveProperty('doSomething');
  });

  test('the container should have the actions array super prop', () => {
    const wrapper = shallow(<MockContainer store={store} />).dive().dive();
    expect(wrapper.props()).toHaveProperty('actions');
    expect(wrapper.props().actions).toBeInstanceOf(Array);
  });

  test('the container should have the context props', () => {
    const wrapper = shallow(<MockContainer store={store} />).dive().dive();
    expect(wrapper.name()).toEqual('withContext(MockContainer)');
  });

  test('the container should render correctly', () => {
    const wrapper = shallow(<MockContainer store={store} />).dive().dive();
    expect(wrapper.html()).toEqual('<div>fromStore</div>');
  });
});
