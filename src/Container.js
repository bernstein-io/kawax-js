import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { compose, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Runtime from './Runtime';
import resolve from './helpers/resolve';


export default (Pure) => {

  const displayName = Pure.name || 'Unnamed';
  const defaultKey = `${displayName}-${_.uniqueId()}`;
  let hookedActions = {};
  let prevContext = {};
  let prevProps = {};

  function omitProps(props) {
    const omitted = Pure.omitProps || ['staticContext'];
    return _.omit(props, omitted);
  }

  function resetHookedActions(props) {
    const { containerKey: prevKey = defaultKey } = prevProps;
    const { containerKey: nextKey = defaultKey } = props;
    if (!_.isEqual(prevKey, nextKey)) {
      hookedActions = {};
    }
  }

  function getActions(props, state) {
    resetHookedActions(props);
    const actions = _.cloneDeep(state.actions);
    return _.mapValues(
      hookedActions,
      (actionIds) => _.map(actionIds, (id) =>
        _.cloneDeep(_.find(actions, (action) => (action.id === id))))
    );
  }

  function getSelect(state) {
    return function select(...args) {
      const path = (args.length > 1 ? args : args[0]);
      return _.get(state, path);
    };
  }

  function wrapStateToProps() {
    const stateToProps = Pure.stateToProps || {};
    return (state, props) => {
      const select = getSelect(state);
      const ownProps = omitProps(props);
      const boundProps = resolve(stateToProps, { state, ownProps, select });
      const containerKey = boundProps.key || defaultKey;
      const actions = getActions({ containerKey, ...boundProps }, state);
      return { actions, select, containerKey, ...boundProps };
    };
  }

  function wrapActions(actions) {
    return _.mapValues(actions, (action, key) => (data, options) => {
      const id = action(data, { delegate: false, ...options });
      const idStack = hookedActions[key] || [];
      hookedActions[key] = [...idStack, id];
    });
  }

  function wrapDispatchToProps() {
    const dispatchToProps = Pure.dispatchToProps || {};
    return (dispatch, ownProps) => {
      const actionCreators = resolve(dispatchToProps, { dispatch, ownProps });
      const boundActions = bindActionCreators(actionCreators, dispatch);
      const actions = wrapActions(boundActions);
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

    static displayName = `Container(${displayName})`;

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
      })
    };

    static getDerivedStateFromProps(props, state) {
      prevProps = props;
      return state;
    }

    state = {};

    componentWillUnmount() {
      hookedActions = {};
    }

    render() {
      const factory = React.createFactory(Pure);
      return this.contextProvider(factory);
    }

    computeContext(ownProps) {
      const withRouter = Runtime('wrapRouter');
      const state = this.context.store.getState();
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
      const props = this.props;
      return React.createElement(Consumer, null, (context) => {
        prevContext = context;
        return factory({ ...context, ...props });
      });
    }

  };

  const reduxConnect = connect(mapStateToProps, mapDispatchToProps, mergeProps, options);
  return compose(contextConsumer, reduxConnect)(Container);
};

