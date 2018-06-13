import _ from 'lodash';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { compose, withContext, lifecycle, setStatic, getContext,
  getDisplayName, setDisplayName } from 'recompose';

export default function wrapContainer(PureComponent) {

  const displayName = getDisplayName(PureComponent);
  const hookedActions = [];

  function getStateHelper(state) {
    return function stateHelper(...args) {
      const path = (args.length > 1 ? args : args[0]);
      return _.get(state, path);
    };
  }

  function filterHookedActions(allActions) {
    const actions = _.map(allActions, (action) => {
      const actionId = action.id;
      return (_.includes(hookedActions, actionId) ? action : false);
    });
    return Object.assign([], _.compact(actions));
  }

  function mapStateToProps(state, ownProps) {
    const stateToProps = PureComponent.mapStateToProps;
    const select = getStateHelper(state);
    if (typeof stateToProps !== 'function') return { select };
    const mappedProps = stateToProps(state, ownProps, { select });
    const actions = filterHookedActions(state.actions);
    return {
      select,
      actions,
      ...mappedProps
    };
  }

  function hookActionCreators(actionCreators) {
    const hookedActionCreators = {};
    const keys = Object.keys(actionCreators);
    for (const index in keys) {
      if (actionCreators.hasOwnProperty(keys[index])) {
        const key = keys[index];
        hookedActionCreators[key] = (data, options) => {
          const actionId = actionCreators[key](data, {
            delegate: false,
            ...options
          });
          hookedActions.unshift(actionId);
          return actionId;
        };
      }
    }
    return hookedActionCreators;
  }

  function mapDispatchToProps(dispatch, ownProps) {
    const dispatchToProps = PureComponent.mapDispatchToProps || {};
    const actionCreators = _.isFunction(dispatchToProps)
      ? dispatchToProps(dispatch, ownProps) : dispatchToProps;
    const boundActionCreators = bindActionCreators(actionCreators, dispatch);
    const hookedActionsCreators = hookActionCreators(boundActionCreators);
    return {
      dispatch,
      ...hookedActionsCreators
    };
  }

  function defineContext() {
    const mapPropsToContext = PureComponent.mapPropsToContext;
    const contextTypes = PureComponent.__contextTypes || {};
    const defaultProps = PureComponent.defaultProps;
    return withContext(
      { context: PropTypes.shape(contextTypes), actions: PropTypes.array.isRequired },
      (props) => {
        const { select } = props;
        const allActions = select('actions');
        const ownActions = filterHookedActions(allActions);
        const hocActions = _.cloneDeep(props.actions) || [];
        const hocContext = props.context || {};
        const context = mapPropsToContext ? mapPropsToContext(props) : {};
        _.each(context, (item, key) => {
          if (item === undefined) context[key] = defaultProps[key];
        });
        return {
          actions: [...hocActions, ...ownActions],
          context: { ...hocContext, ...context }
        };
      }
    );
  }

  function setName() {
    return setDisplayName(`${displayName}Container`);
  }

  function getRouter() {
    return withRouter;
  }

  function setLifecycle() {
    return lifecycle({
      componentWillUnmount() {
        /* clean-up actions log */
      }
    });
  }

  function connectRedux() {
    return connect(mapStateToProps, mapDispatchToProps);
  }

  function getActions() {
    return getContext({ actions: PropTypes.array, context: PropTypes.object });
  }

  function setState() {
    return setStatic('getDerivedStateFromProps', (props, state = {}) => {
      const actions = {};
      const keys = Object.keys(PureComponent.mapDispatchToProps);
      _.each(keys, (actionName) => {
        actions[actionName] = _.filter(props.actions, (action) => {
          const actionId = action.id;
          return (_.includes(hookedActions, actionId) ? action : false);
        });
      });
      return { ...state, actions };
    });
  }

  function setContext() {
    const contextTypes = PureComponent.__contextTypes || {};
    return getContext({ context: PropTypes.shape(contextTypes), actions: PropTypes.array });
  }

  class WrappedContainer extends PureComponent {

    state = {};

  }

  return compose(
    setName(),
    getActions(),
    getRouter(),
    setLifecycle(),
    connectRedux(),
    defineContext(),
    setContext(),
    setState(),
  )(WrappedContainer);
}

