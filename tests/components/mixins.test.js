import React from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import Component from '../../src/Component';
import Reducer from '../../src/Reducer';
import Store from '../../src/Store';
import Mixin from '../../src/Mixin';
import { setRuntime } from '../../src/instance/Runtime';

/* ---------------------------------------------------------------------------------------------- *\
**                                           Reducer
\* ---------------------------------------------------------------------------------------------- */

class RootReducer extends Reducer {

  static initialState = {
    iterator: 0,
  };

  setPayload = (state, { payload }) => ({
    iterator: payload.iterator,
  });

  state = this.match({
    ACTION: this.setPayload,
  });

}

/* ---------------------------------------------------------------------------------------------- *\
**                                           App SetUp
\* ---------------------------------------------------------------------------------------------- */

const reduxStore = new Store({
  name: 'KawaxStore',
  reducer: RootReducer.export(),
});

setRuntime({
  store: reduxStore,
});

/* ---------------------------------------------------------------------------------------------- *\
**                                              Mixin
\* ---------------------------------------------------------------------------------------------- */

class KawaxMixin extends Mixin {

  static stateToProps = ({ select, ownProps }) => {
    const iterator = select('iterator');
    return { iterator };
  };

  static propTypes = {
    iterator: PropTypes.number.isRequired,
  };

  call(value) {
    const { iterator } = this.props;
    return iterator;
  }

}

const kawaxMixin = new KawaxMixin();

/* ---------------------------------------------------------------------------------------------- *\
**                                             Component
\* ---------------------------------------------------------------------------------------------- */

class ReactComponent extends React.Component {

  static mixins = { kawaxMixin };

  static stateToProps = ({ state, select, mixins, ...opt }) => {
    const iterator = select('iterator');
    return {
      iterator: iterator,
      mixin: mixins.kawaxMixin,
    };
  };

  static propTypes = {
    mixin: PropTypes.func.isRequired,
    /* eslint-disable-next-line react/no-unused-prop-types */
    iterator: PropTypes.number.isRequired,
  };

  testMixin() {
    const { mixin } = this.props;
    return mixin();
  }

  render() {
    return (<div>Hello world</div>);
  }

}

const KawaxComponent = Component(ReactComponent);

const Wrapper = (
  <Provider store={reduxStore.internal}>
    <Provider store={reduxStore}>
      <KawaxComponent iterator={0} />
    </Provider>
  </Provider>
);

/* ---------------------------------------------------------------------------------------------- *\
**                                               Tests
\* ---------------------------------------------------------------------------------------------- */

test('Test mixin value after dispatch', async () => {
  const wrapper = mount(Wrapper);
  const component = wrapper.find(ReactComponent);
  const componentInstance = component.instance();
  reduxStore.dispatch({ type: 'ACTION', payload: { iterator: 1 } });
  const firstMixinValue = componentInstance.testMixin();
  expect(firstMixinValue).toEqual(1);
  reduxStore.dispatch({ type: 'ACTION', payload: { iterator: 2 } });
  const secondMixinValue = componentInstance.testMixin();
  expect(secondMixinValue).toEqual(2);
});
