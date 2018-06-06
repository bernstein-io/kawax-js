import { render } from 'react-dom';
import { mount } from 'enzyme';

import Core from '../src/Core';

import MockReducer from './__mocks__/MockReducers';
import MockContainer from './__mocks__/MockContainer';

jest.mock('react-dom', () => ({
  render: jest.fn((JSX) => JSX),
}));

describe('Core class', () => {

  test('Core should be correctly created and call react-dom render method', () => {
    Core.new({
      htmlRoot: 'app',
      reducer: MockReducer.export(),
      container: MockContainer,
    });
    expect(render).toHaveBeenCalledTimes(1);
  });

  test('Core should be correctly mounted with Provider, Rooter and Root Container', () => {
    Core.new({
      htmlRoot: 'app',
      reducer: MockReducer.export(),
      container: MockContainer,
    });
    const reactRoot = render.mock.calls[0][0];
    const wrapper = mount(reactRoot);
    expect(wrapper.find('Provider')).toHaveLength(1);
    expect(wrapper.find('Router')).toHaveLength(2);
    expect(wrapper.find(MockContainer.displayName)).toHaveLength(1);
  });
});

