import Reducer from '../../src/Reducer';

class PlainObjectReducer extends Reducer {

  static initialState = {};

  addToObject = (state, action) => ({
    test: 'foo',
  });

  state = this.match({
    ADDTOOBJECT: this.addToObject,
  });

}

class NestedMockReducer extends Reducer {

  static initialState = {
    bar: 'foo',
  };

  setBar = (state, action) => ({
    bar: action.payload,
  });

  state = this.match({
    BAR: this.setBar,
  });

}

class MockReducer extends Reducer {

  static initialState = {
    foo: 'bar',
    nested: NestedMockReducer.export(),
    plainObject: PlainObjectReducer.export(),
  };

  setFoo = (state, action) => ({
    foo: action.payload,
  });

  state = this.match({
    NESTED: {
      nested: NestedMockReducer.export(),
    },
    PLAINOBJECT: {
      plainObject: PlainObjectReducer.export(),
    },
    FOO: this.setFoo,
  });

}

export default MockReducer;
