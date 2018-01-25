import _ from 'lodash';
import Constant from '../src/misc/constant';

describe('Defining a Constant', () => {
  let scope = Constant('root1', {'node1': true, 'node2': 'someValue'});

  it("returns a function", () => {
    expect(_.isFunction(scope)).toBe(true);
  });

  it("can be used as a scope", () => {
    let constant = scope('node1');
    expect(constant).toEqual('ROOT1.NODE1');
  });

  it("mirrors path (upperCase)", () => {
    let constant = scope('node2');
    expect(constant).toEqual('ROOT1.NODE2');
  });

  it("persists values", () => {
    let constant = Constant('root1.node2');
    expect(constant).toEqual('ROOT1.NODE2');
  });
});

describe('Accessing a Constant', () => {
  let scope = Constant('root2', {
    'node1': true,
    'node2': {
      'node3': {
        'node4': false
      }
    }
  });

  it("returns mirrored path (end node)", () => {
    let constant = Constant('root2.node2.node3.node4');
    expect(constant).toEqual('ROOT2.NODE2.NODE3.NODE4');
  });

  it("returns mirrored path (intermediate node)", () => {
    let constant = Constant('root2.node2.node3');
    expect(constant).toEqual('ROOT2.NODE2.NODE3');
  });

});

describe('Accessing all constants', () => {
  let constants = Constant();

  it("returns a plain object", () => {
    expect(_.isPlainObject(constants)).toEqual(true);
  });

});

