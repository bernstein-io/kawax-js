import _ from 'lodash';
import Constant from '../src/misc/constant';

describe('Defining a Constant', () => {
  let scope = Constant('test1', {'n1': true, 'n2': 'someValue'});

  it("returns a function", () => {
    expect(_.isFunction(scope)).toBe(true);
  });

  it("can be used as a scope", () => {
    let constant = scope('n1');
    expect(constant).toEqual('TEST1.N1');
  });

  it("mirrors path (upperCase)", () => {
    let constant = scope('n2');
    expect(constant).toEqual('TEST1.N2');
  });

  it("persists values", () => {
    let constant = Constant('test1.n1');
    expect(constant).toEqual('TEST1.N1');
  });
});

describe('Defining a Constant with an Array', () => {
  let scope = Constant('test2', {
    'n1': [
      'n1-1',
      {'n1-2': ['n1-2-1','n1-2-2']}
    ]
  });

  it("turns it into an object", () => {
    let constant = Constant('test2.n1.n1-2.n1-2-1');
    expect(constant).toEqual('TEST2.N1.N1-2.N1-2-1');
  });
});

describe('Accessing a Constant', () => {
  Constant('test3', {
    'n1': true,
    'n2': {
      'n2-1': {
        'n2-1-1': false
      },
      'n2-2': true
    }
  });

  it("returns mirrored path (end node)", () => {
    let constant = Constant('test3.n2.n2-1.n2-1-1');
    expect(constant).toEqual('TEST3.N2.N2-1.N2-1-1');
  });

  it("returns mirrored path (intermediate node)", () => {
    let constant = Constant('test3.n2.n2-1');
    expect(constant).toEqual('TEST3.N2.N2-1');
  });

});

describe('Accessing all constants', () => {
  let constants = Constant();

  it("returns a plain object", () => {
    expect(_.isPlainObject(constants)).toEqual(true);
  });

});

