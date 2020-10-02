import Smart from '../src/Smart';

describe('Smart Class', () => {

  let smartClass;
  const mock = { test: 'foobar' };

  class SmartExtended extends Smart {

    defaults() {
      return { foo: 'bar' };
    }

  }

  beforeEach(() => {
    smartClass = new Smart();
  });

  test('it is created correctly without options', () => {
    expect(smartClass).toBeDefined();
  });

  test('extend method correctly copy properties', () => {
    expect(smartClass.extend(mock)).toHaveProperty('test', 'foobar');
  });

  test('initialize method should return the instance', () => {
    expect(smartClass.initialize()).toBe(smartClass);
  });

  test('defaults options are correctly set', () => {
    expect(smartClass.defaults()).toBeFalsy();
  });

  test('_call should return the instance if no call method is defined', () => {
    expect(smartClass._call()).toBe(smartClass);
  });

  test('_call should call the call method if it is defined', () => {
    smartClass.call = (...args) => args;
    expect(smartClass._call('arg1', 'arg2')).toEqual(['arg1', 'arg2']);
  });

  test('export static method should correctly return a wrapper to _call', () => {
    expect(Smart.export()).toBeInstanceOf(Function);
    expect(Smart.export('arg1', 'arg2')).toBeInstanceOf(Function);
  });

  test('it should be created correctly with defaults', () => {
    const instance = new SmartExtended();
    expect(instance).toEqual({
      foo: 'bar',
    });
  });
});
