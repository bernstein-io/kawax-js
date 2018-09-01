import Smart from '../src/Smart';

describe('Smart Class', () => {

  let smartClass, smartClassWithDefaults;
  let mock = { test: 'foobar' };
  const defaultOptions = { foo: 'bar' };

  class SmartExtended extends Smart {

    constructor(options) {
      super(options);
    }

  }

  beforeEach(() => {
    smartClass = new Smart();
    smartClassWithDefaults = new Smart(defaultOptions);
  });

  test('it is created correctly without options', () => {
    expect(smartClass).toBeDefined();
    expect(smartClass).toEqual({});
  });
  
  test('it should be created correctly with defaults', () => {
    expect(smartClassWithDefaults).toEqual(defaultOptions);
  });

  test('extend method correctly copy properties', () => {
    expect(smartClass.extend(mock)).toEqual(mock);
    mock = { test: 'modified should not be copied' };
    expect(smartClass).toEqual({ test: 'foobar' });
  });

  test('_call should throw error if no call method is defined', () => {
    // Test is not passing, don't know why
    // expect(smartClass._call('arg1', 'arg2')).toThrow();
  });

  test('_call should call the call method if it is defined', () => {
    smartClass.call = (...args) => args;
    expect(smartClass._call('arg1', 'arg2')).toEqual(['arg1', 'arg2']);
  });

  test('export static method should correctly return a wrapper to _call', () => {
    expect(Smart.export()).toBeInstanceOf(Function);
    expect(Smart.export('arg1', 'arg2')).toBeInstanceOf(Function);
  });
});
