import _ from 'lodash';
import Resource, { ResourceCall } from '../src/Resource';

describe('Resource Class', () => {

  let resource;
  beforeEach(() => {
    resource = Resource.export();
  });

  test('export should return an instance to the class', () => {
    expect(resource).toBeDefined();
    expect(resource).toBeInstanceOf(Resource);
  });

  test('default returns the options', () => {
    const options = { someOption: 'foo' };
    const instance = Resource.export(options);
    expect(instance.defaults(options)).toEqual(options);
    expect(instance.someOption).toBeDefined();
  });

  test('_getResolver should returns a function', () => {
    expect(resource._getResolver()).toBeInstanceOf(Function);
  });

  test('the method returned by _getResolver should return the key from the options', () => {
    const func = resource._getResolver({ foo: 'bar' });
    expect(func('foo')).toEqual('bar');
  });

  test('the method returned by _getResolver should try to call the key method from the instance if not in options with the payload', () => {
    resource.foo = jest.fn();
    resource.foo.mockReturnValue('bar');
    const func = resource._getResolver({}, 'payload');
    expect(func('foo')).toEqual('bar');
    expect(resource.foo).toHaveBeenCalledTimes(1);
    expect(resource.foo).toHaveBeenLastCalledWith('payload');
  });

  test('the method returned by _getResolver should try to return the attribute from the instance if call is set to false', () => {
    resource.foo = 'bar';
    const func = resource._getResolver({}, 'payload');
    expect(func('foo', false)).toEqual('bar');
    expect(func('foo')).toEqual('bar');
  });

  test('the method returned by _getResolver should only return the function if key gives a function and call is set to false', () => {
    const mock = jest.fn();
    const func = resource._getResolver({ mock });
    expect(func('mock', false)).toEqual(mock);
    expect(mock).not.toHaveBeenCalled();
  });

  test('the method _getResolver should prioritize options attributes over instance attributes', () => {
    resource.foo = 'bar';
    const func = resource._getResolver({ foo: 'foo' });
    expect(func('foo')).toEqual('foo');
  });

  test('define should return a wrapper to make a ressource call', () => {
    ResourceCall.export = jest.fn(() => jest.fn());
    expect(resource.define()).toBeInstanceOf(Function);
    resource.define({ path: 'foo', method: 'bar' })();
    expect(ResourceCall.export).toHaveBeenCalledTimes(1);
  });
});

describe('Ressource Call Class', () => {
  let resourceCall;
  beforeEach(() => {
    resourceCall = new ResourceCall();

  });

  test('_collection parser should return the correct attribute', async () => {
    const collection = await resourceCall._collectionParser({ body: { collection: 'foo' } });
    expect(collection).toEqual('foo');
  });

  test('_transform should parse correctly the payload object using the transform function given', () => {
    const obj = { fooProperty: 'some',
      barProp: {
        otherProp: 'bar',
      } };
    expect(resourceCall._transform(obj, _.snakeCase)).toEqual({ foo_property: 'some', bar_prop: { other_prop: 'bar' } });
  });

  test('_transform should parse correctly the payload array using the transform function given', async () => {
    const arr = [{ someProp: 'someProp' }];
    expect(resourceCall._transform(arr, _.snakeCase)).toEqual([{ some_prop: 'someProp' }]);
  });

  test('call should throw without payload', async () => {
    await expect(resourceCall.call()).rejects.toBeInstanceOf(Error);
  });

  test('defaults should return an object wrapping the context in the context property', () => {
    expect(resourceCall.defaults({ foo: 'bar' })).toEqual({ context: { foo: 'bar' } });
  });

  test('_entityParser should use the context entityParser and return', async () => {
    const mockParser = jest.fn();
    mockParser.mockReturnValue('foo');
    resourceCall.context = { entityParser: mockParser };
    const obj = { foo: 'bar' };
    expect(await resourceCall._entityParser(obj)).toEqual('foo');
    expect(mockParser).toHaveBeenCalledWith(obj, resourceCall.context);
  });

  test('responseParser should parse the response with responseParser', async () => {
    resourceCall.context = {
      responseParser: jest.fn((val) => val),
    };
    const response = await resourceCall._responseParser({ body: { foo: 'bar' } });
    expect(response).toBeDefined();
    expect(response).toEqual({ foo: 'bar' });
    expect(resourceCall.context.responseParser).toHaveBeenCalledTimes(1);
  });

  test('responseParser should parse the response with collection parser if collection is true', async () => {
    resourceCall.context = {
      collection: true,
    };
    resourceCall._collectionParser = jest.fn((val) => val.body);
    const response = await resourceCall._responseParser({ body: { foo: 'bar' } });
    expect(response).toBeDefined();
    expect(response).toEqual({ foo: 'bar' });
    expect(resourceCall._collectionParser).toHaveBeenCalledTimes(1);
  });

  test('responseParser should transform the response if responseTransform is set to true', async () => {
    resourceCall.context = {
      responseTransform: true,
    };
    resourceCall._transform = jest.fn((val) => val);
    const response = await resourceCall._responseParser({ body: { foo: 'bar' } });
    expect(response).toBeDefined();
    expect(response).toEqual({ foo: 'bar' });
    expect(resourceCall._transform).toHaveBeenCalledTimes(1);
  });

  test('responseParser should parse entities from the response if entityParser is set to true', async () => {
    resourceCall.context = {
      entityParser: true,
    };
    resourceCall._entityParser = jest.fn((val) => val);
    const response = await resourceCall._responseParser({ body: { foo: 'bar' } });
    expect(response).toBeDefined();
    expect(response).toEqual({ foo: 'bar' });
    expect(resourceCall._entityParser).toHaveBeenCalledTimes(1);
  });

});
