import _ from 'lodash';
import React from 'react';
import { setStatic } from 'recompose';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import Runtime from './Runtime';
import ActionStack from './internal/ActionStack';
import resolve from './helpers/resolve';
import SelectHelper from './helpers/select';

export default (Pure) => {

  const composedProps = [
    'idKey',
    'select',
    'actions',
    'dispatch',
    'children',
  ];

  const displayName = Pure.name || 'Unnamed';
  const defaultKey = `${displayName}-${_.uniqueId()}`;

  const actionStack = new ActionStack();

  let prevContext = {};
  let prevProps = {};

  Pure.prototype.getPureProps = function getPureProps() {
    return _.omitBy(this.props, (value, key) => _.includes(composedProps, key));
  };

  function omitProps(props) {
    const omitted = Pure.omitProps || ['staticContext'];
    return _.omit(props, omitted);
  }

  function getActionStack(props, state) {
    const { idKey: prevKey = defaultKey } = prevProps;
    const { idKey: nextKey = defaultKey } = props;
    if (!_.isEqual(prevKey, nextKey)) actionStack.clear();
    return actionStack;
  }

  function getSelect(state) {
    return function helper(...args) {
      return SelectHelper(state, ...args);
    };
  }

  function wrapStateToProps() {
    const stateToProps = Pure.stateToProps || {};
    return (state, props) => {
      const select = getSelect(state);
      const ownProps = omitProps(props);
      const nextProps = resolve(stateToProps, { state, ownProps, select });
      const idKey = nextProps.key || defaultKey;
      const actions = getActionStack({ idKey, ...nextProps }, state);
      composedProps.push(..._.keys(nextProps));
      return { actions, select, idKey, ...nextProps };
    };
  }

  function createActions(actionConstructors, dispatch) {
    return _.mapValues(actionConstructors, (actionConstructor, key) => (...data) => {
      const { getState } = Runtime('store');
      const instance = actionConstructor({ delegate: false });
      const id = instance.run(...data)(dispatch, getState);
      actionStack.push({ id, key, instance });
      return id;
    });
  }

  function wrapDispatchToProps() {
    const dispatchToProps = Pure.dispatchToProps || {};
    return (dispatch, ownProps) => {
      const actionConstructors = resolve(dispatchToProps, { dispatch, ownProps });
      const actions = createActions(actionConstructors, dispatch);
      composedProps.push(..._.keys(actions));
      return { dispatch, ...actions };
    };
  }

  function mergeConnectProps() {
    return Pure.mergeConnectProps;
  }

  function getConnectOptions() {
    return Pure.connectOptions;
  }

  const mapStateToProps = wrapStateToProps();
  const mapDispatchToProps = wrapDispatchToProps();
  const mergeProps = mergeConnectProps();
  const options = getConnectOptions();

  class Container extends React.Component {

    state = {};

    static displayName = `Container(${displayName})`;

    // eslint-disable-next-line react/forbid-foreign-prop-types
    static propTypes = Pure.propTypes;

    static defaultProps = Pure.defaultProps;

    static contextTypes = {
      store: PropTypes.shape({
        getState: PropTypes.func.isRequired,
        subscribe: PropTypes.func.isRequired,
      }),
      history: PropTypes.shape({
        listen: PropTypes.func.isRequired,
        location: PropTypes.object.isRequired,
        push: PropTypes.func.isRequired,
      }),
    };

    static getDerivedStateFromProps(props, state) {
      prevProps = props;
      return state;
    }

    componentWillUnmount() {
        console.log('container comp will unmount', displayName);
        actionStack.clear();
    }

    render() {
      const factory = React.createFactory(Pure);
      return this.contextProvider(factory);
    }

    computeContext(ownProps) {
      const withRouter = Runtime('withRouter');
      const { getState } = Runtime('store');
      const state = getState();
      const select = getSelect(state);
      const propsToContext = resolve(Pure.propsToContext, { ownProps, select });
      if (withRouter && ownProps.match) {
        const match = ownProps.match;
        return { match, ...(propsToContext || {}) };
      }
      return propsToContext;
    }

    contextProvider = (factory) => {
      const Context = Runtime('context');
      const ownProps = omitProps(this.props);
      const propsToContext = this.computeContext(ownProps);
      composedProps.push(..._.keys({ ...prevContext, ...propsToContext }));
      if (propsToContext) {
        return (
          <Context.Provider value={{ ...prevContext, ...propsToContext }}>
            {factory(ownProps)}
          </Context.Provider>
        );
      }
      return factory(ownProps);
    };

  }

  /* eslint-disable react/no-multi-comp */
  const contextConsumer = (component) => class WithContext extends React.Component {

    static displayName = `WithContext(${displayName})`;

    render() {
      const Context = Runtime('context');
      const Consumer = Context.Consumer;
      const factory = React.createFactory(component);
      const ownProps = this.props;
      return React.createElement(Consumer, null, (context) => {
        prevContext = context;
        composedProps.push(..._.keys(context));
        return factory({ ...context, ...ownProps });
      });
    }

  };

  const reduxConnect = connect(mapStateToProps, mapDispatchToProps, mergeProps, {
    ...options,
  });

  const withStatic = setStatic('flushActionStack', () => {
    actionStack.clear(true);
  });

  if (Pure.withContext === false) {
    return compose(withStatic, reduxConnect)(Container);
  }

  return compose(withStatic, contextConsumer, reduxConnect)(Container);
};
