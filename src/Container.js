import _ from 'lodash';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { compose, withProps, setPropTypes, withContext, lifecycle,
  renderComponent, getDisplayName, setDisplayName } from 'recompose';

export default function wrapContainer(PureComponent) {

  const displayName = getDisplayName(PureComponent);
  const stateToProps = PureComponent.mapStateToProps || {};
  const dispatchToProps = PureComponent.mapDispatchToProps || {};
  const hookedActions = [];

  function getStateHelper(state) {
    return function stateHelper(...map) {
      const path = (map.length === 1 ? map[0] : map);
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
    if (typeof stateToProps !== 'function') return {};
    const mappedState = stateToProps(state, ownProps, { select: getStateHelper(state) });
    return {
      actions: filterHookedActions(state.actions),
      ...mappedState
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
    const actionCreators = _.isFunction(dispatchToProps)
      ? dispatchToProps(dispatch, ownProps)
      : dispatchToProps;
    const boundActionCreators = bindActionCreators(actionCreators, dispatch);
    const hookedActionsCreators = hookActionCreators(boundActionCreators);
    return {
      dispatch,
      ...hookedActionsCreators
    };
  }

  function setContext() {
    const mapContext = PureComponent.mapContext;
    const contextTypes = PureComponent.contextTypes;
    const defaultProps = PureComponent.defaultProps;
    if (mapContext) {
      return withContext(
        contextTypes,
        (props) => {
          const { getState } = props;
          const contextMap = mapContext(props, getState);
          _.each(contextMap, (item, key) => {
            if (item === undefined) contextMap[key] = defaultProps[key];
          });
          return contextMap;
        }
      );
    }
    return renderComponent(PureComponent);
  }

  function wrapLifecycle() {
    return lifecycle({
      componentWillUnmount() {
        /* clean-up actions log */
      }
    });
  }

  const withName = setDisplayName(`${displayName}Container`);
  const withLifecycle = wrapLifecycle();
  const superPropTypes = setPropTypes({ actions: PropTypes.array });
  const reduxConnect = connect(mapStateToProps, mapDispatchToProps);
  const reactContext = setContext();

  return compose(
    withName,
    withRouter,
    superPropTypes,
    withLifecycle,
    reduxConnect,
    reactContext,
  )(PureComponent);
}

