import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Runtime from './Runtime';
import resolve from './helpers/resolve';

export default (Pure) => {

  let hookedActions = {};

  function getActions(state) {
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
    return (state, ownProps) => {
      const actions = getActions(state);
      const select = getSelect(state);
      const props = resolve(stateToProps, { state, ownProps, select });
      return { actions, select, ...props };
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

  class Container extends React.Component {

    static displayName = `${Pure.name}Container`;

    static propTypes = Pure.propTypes;

    static defaultProps = Pure.defaultProps;

    static contextTypes = {
      store: PropTypes.shape({
        getState: PropTypes.func.isRequired,
        subscribe: PropTypes.func.isRequired,
      }),
      location: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
      ]),
      history: PropTypes.shape({
        listen: PropTypes.func.isRequired,
        location: PropTypes.object.isRequired,
        push: PropTypes.func.isRequired,
      })
    };

    render() {
      const withHOC = this.composeHOC();
      return this.wrapContext(withHOC);
    }

    wrapContext = (factory) => {
      const ownProps = this.props;
      const Context = Runtime('context');
      const state = this.context.store.getState();
      const select = getSelect(state);
      const propsToContext = resolve(Pure.propsToContext, { ownProps, select });
      return (
        <Context.Consumer>
          {(context) => {
            if (propsToContext) {
              return (
                <Context.Provider value={{ ...context, ...propsToContext }}>
                  {factory({ ...context, ...ownProps })}
                </Context.Provider>
              );
            }
            return factory({ ...context, ...ownProps });
          }}
        </Context.Consumer>
      );
    };

    componentWillUnmount() {
      hookedActions = {};
    }

    composeHOC() {
      return React.createFactory(Pure);
    }

  }

  const mapStateToProps = wrapStateToProps();
  const mapDispatchToProps = wrapDispatchToProps();
  const mergeProps = mergeConnectProps();
  const options = getConnectOptions();

  return connect(mapStateToProps, mapDispatchToProps, mergeProps, options)(Container);
};

