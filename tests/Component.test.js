import { shallow } from 'enzyme';
import React from 'react';
import MockComponent from './__mocks__/MockComponent';
import { diveTo, createRouterContext } from './helpers/testUtils';


describe('Component Class', () => {
  let component;
  beforeAll(() => {
    const context = createRouterContext({ foo: 'fromContext' });
    component = diveTo(shallow(<MockComponent foobar="bar" />, context), 'WrappedComponent', context);
  });

  test('the component should be created correctly', () => {
    expect(component).toBeDefined();
  });

  test('the component should have the correct name', () => {
    expect(MockComponent.displayName).toEqual('MockComponentComponent');
  });

  test('the component should have the right props defined', () => {
    const props = component.props();
    expect(props).toHaveProperty('foobar', 'bar');
  });

  test('component should have the right rendered html', () => {
    const html = component.html();
    expect(html).toEqual('<div><h1>bar : autoset</h1></div>');
  });

  // TODO : test context props / test css styles
});
