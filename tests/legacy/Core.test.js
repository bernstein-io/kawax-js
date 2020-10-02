import { render } from 'react-dom';

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

});
