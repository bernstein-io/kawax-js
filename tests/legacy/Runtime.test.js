import Runtime, { setRuntime } from '../src/Runtime';

describe('Runtime', () => {

  test('Runtime should be set correctly', () => {
    const mock = { options: 'foo' };
    expect(setRuntime(mock)).toEqual(mock);
  });

  test('Runtime should be accessed correctly', () => {
    const mock = { options: 'foo' };
    setRuntime(mock);
    expect(Runtime('options')).toEqual('foo');
  });
});
