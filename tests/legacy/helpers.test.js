import resolve from '../src/helpers/resolve';

describe('resolve function', () => {
  test('resolve should call the function with args and return the result if supplied with a function', () => {
    const mock = jest.fn();
    mock.mockReturnValue('ok');
    expect(resolve(mock, 'arg1', 'arg2')).toEqual('ok');
    expect(mock).toHaveBeenLastCalledWith('arg1', 'arg2');
  });

  test('resolve should return the first argument if not a function', () => {
    expect(resolve('test', 'arg', 'arg2')).toEqual('test');
    expect(resolve({ foo: 'bar' })).toEqual({ foo: 'bar' });
  });
});
