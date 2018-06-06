import Store from '../src/Store';

describe('Store Class', () => {
  beforeAll(() => {
    global.__DEV__ = true;
  });

  test('Store should be initialized correctly and have called the reducer', () => {
    const mock = jest.fn();
    const store = new Store({ reducer: mock });
    expect(store).toBeDefined();
    expect(mock).toHaveBeenCalled();
  });
});
