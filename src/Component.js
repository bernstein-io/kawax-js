import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import warning from 'warning';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { StyleSheet, css } from './helpers/aphrodite';
import Context from './instance/Context';
import Runtime from './instance/Runtime';
import ActionStack from './internal/ActionStack';
import resolve from './helpers/resolve';
import SelectHelper from './helpers/select';

export default function Component(Pure) {

  if (!Pure.prototype.isReactComponent) warning(Pure, 'should be a class based React Component');

  const persistActionStack = Pure.persistActionStack || false;

  /* -------------------------------------------------------------------------------------------- *\
  |*                                          Instance                                            *|
  \* -------------------------------------------------------------------------------------------- */

  const instanceKeys = [];

  let composedProps = [
    'instanceKey',
    'select',
    'actions',
    'dispatch',
    'children',
    'ownActions',
    'ownClassNames',
  ];

  function updateComposedProps(props) {
    composedProps = _.uniq([...composedProps, ..._.keys(props)]);
    return composedProps;
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                         Pure props                                           *|
  \* -------------------------------------------------------------------------------------------- */

  Pure.prototype.getPureProps = function getPureProps() {
    return _.omitBy(this.props, (value, key) => _.includes(composedProps, key));
  };

  Pure.prototype.getForwardProps = function getForwardProps() {
    /* eslint-disable-next-line react/forbid-foreign-prop-types */
    const ownProps = _.keys(Pure.propTypes);
    return _.omitBy(
      this.props, (value, key) => (_.includes(ownProps, key) || _.includes(composedProps, key)),
    );
  };

  /* -------------------------------------------------------------------------------------------- *\
  |*                                        Display Name                                          *|
  \* -------------------------------------------------------------------------------------------- */

  const displayName = Pure.name || 'Functionnal';

  /* -------------------------------------------------------------------------------------------- *\
  |*                                  Props, Context & Instance                                   *|
  \* -------------------------------------------------------------------------------------------- */

  let componentInstance;
  /* eslint-disable-next-line no-unused-vars */
  let prevProps = {};
  let prevContext = {};

  /* -------------------------------------------------------------------------------------------- *\
  |*                                            Mixins                                            *|
  \* -------------------------------------------------------------------------------------------- */

  function aggregateStaticWithMixins(key) {
    return _.compact([
      Pure[key] || {},
      ..._.map(Pure.mixins, (mixin) => _.isObject(mixin.props) && mixin.props[key]),
    ]);
  }

  function resolveStaticWithMixins(key, options = {}) {
    const resolved = {};
    const staticMap = aggregateStaticWithMixins(key);
    _.each(staticMap, (item) => {
      _.assign(resolved, resolve.call(componentInstance, item, options));
    });
    return resolved;
  }

  function bindMixin(mixin) {
    if (_.isFunction(mixin)) return mixin.bind(componentInstance);
    if (_.isObject(mixin) && !_.isUndefined(mixin.call)) {
      return (...options) => {
        _.assign(mixin, componentInstance);
        return mixin.call(...options);
      };
    }
    return mixin;
  }

  function getMixins() {
    const mixins = {};
    if (Pure.mixins) {
      _.each(Pure.mixins, (mixin, key) => {
        mixins[key] = bindMixin(mixin);
      });
    }
    return mixins;
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                        Action Stack                                          *|
  \* -------------------------------------------------------------------------------------------- */

  /* eslint-disable-next-line no-mixed-operators */
  let actionStack = {};

  function getActionStack(instanceKey) {
    const key = (persistActionStack === true) ? '__persistent__' : instanceKey;
    actionStack[key] = actionStack[key] || new ActionStack();
    return actionStack[key];
  }

  async function clearActionStack(keys = actionStack.keys) {
    const store = Runtime('store');
    actionStack = _.pickBy(actionStack, async (instance, key) => {
      if (_.includes(keys, key)) {
        await instance.abort();
        store._dispatch({ type: '@@CLEAR_ACTION', payload: key });
      } else {
        return true;
      }
    });
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                           Wrapper                                            *|
  \* -------------------------------------------------------------------------------------------- */

  /* eslint-disable-next-line react/no-multi-comp */
  const contextWrapper = (component) => class Wrapper extends React.Component {

    static displayName = `Wrapper(${displayName})`;

    instanceKey = `${displayName}Component${_.uniqueId()}`;

    componentDidMount() {
      instanceKeys.push(this.instanceKey);
    }

    render() {
      const ownProps = this.props;
      const { instanceKey } = this;
      const contextToProps = aggregateStaticWithMixins('contextToProps');
      if (!_.isEmpty(contextToProps) || Pure.propsToContext) {
        return React.createElement(Context.Consumer, null, (context) => {
          prevContext = context;
          const contextProps = resolveStaticWithMixins('contextToProps', { context, ownProps });
          updateComposedProps(contextProps);
          if (!_.isEmpty(contextProps)) {
            return React.createElement(component, { ...contextProps, ...ownProps, instanceKey });
          }
          return React.createElement(component, { ...ownProps, instanceKey });
        });
      }
      return React.createElement(component, { ...ownProps, instanceKey });
    }

  };

  /* -------------------------------------------------------------------------------------------- *\
  |*                                     CSS Helpers Vars                                         *|
  \* -------------------------------------------------------------------------------------------- */

  const defaultClassName = Pure.className || false;
  let previousClassName = false;
  let uniqClassName = false;

  function mapSelectors(selectors, applyWildcard = false) {
    const specialChars = ['*', '&', ':', '@'];
    const mappedSelectors = {};
    _.each(selectors, (selector, key) => {
      const native = !!_.includes(specialChars, key[0]);
      const newKey = !native ? `&${key}` : key;
      if (_.isPlainObject(selector) && !native) {
        mappedSelectors[newKey] = mapSelectors(selector);
      } else {
        mappedSelectors[key] = selector;
      }
    });
    return mappedSelectors;
  }

  function mapNestedStyle(stylesheet) {
    _.each(stylesheet, (item, selectorKey) => {
      const selectors = item._definition;
      stylesheet[selectorKey]._definition = mapSelectors(selectors, true);
    });
    return stylesheet;
  }

  function getCssClasses(props, state) {
    if (_.isFunction(Pure.css) || uniqClassName === false) {
      const componentStyle = resolve(Pure.css, props, state);
      if (componentStyle) {
        const className = Pure.name || 'Component';
        const stylesheet = StyleSheet.create({ [className]: componentStyle });
        const styleWithNesting = mapNestedStyle(stylesheet);
        if (uniqClassName) previousClassName = uniqClassName;
        uniqClassName = css(styleWithNesting[className]);
        return [defaultClassName, uniqClassName];
      }
      return [defaultClassName];
    }
    return [defaultClassName, uniqClassName];
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                          Helpers                                             *|
  \* -------------------------------------------------------------------------------------------- */

  function omitProps(props) {
    const omitted = Pure.omitProps || ['staticContext'];
    return _.omit(props, omitted);
  }

  function getSelect(state) {
    return function helper(...args) {
      return SelectHelper(state, ...args);
    };
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                      Component Wrapper                                       *|
  \* -------------------------------------------------------------------------------------------- */

  /* eslint-disable-next-line react/no-multi-comp */
  class PureReflection extends React.Component {

    state = {
      initialized: false,
    };

    static displayName = `Component(${displayName})`;

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

    getClassNames = (currentClassNames) => { /* eslint-disable react/prop-types */
      const current = currentClassNames ? currentClassNames.split(' ') : false;
      const currentClass = current ? _.reject(current, (i) => (i === previousClassName)) : false;
      const computedClass = getCssClasses(this.fullProps, this.state) || false;
      const uniq = _.uniq([...currentClass, ...computedClass]);
      return classNames(_.compact(uniq));
    };

    mapCssClasses() { /* eslint-disable react/no-find-dom-node */
      if (Pure.className || Pure.css) {
        const { className } = this.fullProps;
        const cssClasses = getCssClasses(this.fullProps, this.state);
        const fiber = _.get(componentInstance, '_reactInternalFiber');
        const sibling = _.get(fiber, 'child.sibling');
        const node = ReactDOM.findDOMNode(fiber.stateNode);
        if (node && (className || cssClasses)) {
          if (sibling) {
            const parent = node ? node.parentNode : false;
            if (parent) {
              this.classNames = this.getClassNames(parent.className);
              parent.className = this.classNames;
            }
          } else {
            this.classNames = this.getClassNames(node.className);
            node.className = this.classNames;
          }
        }
      }
    }

    componentDidUpdate = () => {
      this.mapCssClasses();
    };

    componentDidMount = () => {
      this.mapCssClasses();
    };

    async componentWillUnmount() {
      if (!persistActionStack === true) {
        const { instanceKey } = this.props;
        await clearActionStack([instanceKey]);
      }
    }

    computeContext(ownProps) {
      const { getState } = Runtime('store');
      const state = getState();
      const select = getSelect(state);
      const mixins = getMixins();
      return resolveStaticWithMixins('propsToContext', { ownProps, mixins, select });
    }

    renderComponent(ownProps = {}) {
      const ownClassNames = this.classNames || String();
      this.fullProps = { ...ownProps, ...this.props, ownClassNames };
      return React.createElement(Pure, {
        ...this.fullProps,
        ref: (reference) => { componentInstance = reference; },
      });
    }

    render() {
      const ownProps = omitProps(this.props);
      if (Pure.propsToContext) {
        const propsToContext = this.computeContext(ownProps);
        if (propsToContext) {
          updateComposedProps({ ...prevContext, ...propsToContext });
          return (
            <Context.Provider value={{ ...prevContext, ...propsToContext }}>
              {this.renderComponent(ownProps)}
            </Context.Provider>
          );
        }
      }
      return this.renderComponent(ownProps);
    }

  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                           Redux                                              *|
  \* -------------------------------------------------------------------------------------------- */

  let bindedActionCreators = {};

  function createActions(actionConstructors, { instanceKey, ...props }) {
    return _.mapValues(actionConstructors, (actionConstructor, key) => {
      if (_.isFunction(actionConstructor)) {
        return (...data) => {
          const { getState, dispatch } = Runtime('store');
          const instance = actionConstructor({
            origin: instanceKey,
            tracked: true,
            props: props,
          });
          const id = instance.run(...data)(dispatch, getState);
          const actions = getActionStack(instanceKey);
          actions.push({ id, key, instance });
          return id;
        };
      }
    });
  }

  function bindActionCreators({ state, actions, nextProps, select }) {
    const actionCreators = Pure.actionCreators || {};
    const actionConstructors = resolve(actionCreators, { nextProps }) || {};
    const actionsMap = createActions(actionConstructors, nextProps);
    updateComposedProps(actionsMap);
    return actionsMap;
  }

  function wrapStateToProps() {
    return (state, { instanceKey, ...props }) => {
      const select = getSelect(state);
      const ownProps = omitProps(props);
      const mixins = getMixins();
      const actions = getActionStack(instanceKey);
      const stateProps = resolveStaticWithMixins('stateToProps', { state, actions, ownProps, mixins, select });
      updateComposedProps(stateProps);
      const ownActions = _.isEmpty(actions) ? {} : actions.own();
      const nextProps = { ...ownProps, ...stateProps, actions, instanceKey, ownActions };
      bindedActionCreators = bindActionCreators({ state, actions, nextProps, select });
      return { actions, instanceKey, ownActions, ...stateProps };
    };
  }

  function wrapDispatchToProps() {
    const dispatchToProps = Pure.dispatchToProps || {};
    if (_.isFunction(dispatchToProps)) {
      return (dispatch, ownProps) => {
        const actionCreators = bindedActionCreators;
        const plainActions = resolve(dispatchToProps, { dispatch, ownProps, actionCreators }) || {};
        const actions = { ...actionCreators, ...plainActions };
        updateComposedProps(actions);
        return actions;
      };
    }
    return (dispatch) => {
      const actions = { ...bindedActionCreators, ...dispatchToProps };
      updateComposedProps(actions);
      return actions;
    };
  }

  function mergeConnectProps() {
    return Pure.mergeConnectProps || null;
  }

  function getConnectOptions() {
    return Pure.connectOptions || {};
  }

  const mapStateToProps = wrapStateToProps();
  const mapDispatchToProps = wrapDispatchToProps();
  const mergeProps = mergeConnectProps();
  const options = getConnectOptions();

  /* -------------------------------------------------------------------------------------------- *\
  |*                                      Compose and Render                                      *|
  \* -------------------------------------------------------------------------------------------- */

  const strictCompare = (next, prev) => (prev === next);

  const shallowCompare = (next, prev) => _.isEqual(next, prev);

  const reduxConnect = connect(mapStateToProps, mapDispatchToProps, mergeProps, {
    areStatesEqual: (next, prev) => strictCompare(next, prev),
    areStatePropsEqual: (next, prev) => shallowCompare(next, prev),
    areMergedPropsEqual: (next, prev) => shallowCompare(next, prev),
    ...options,
  });

  const component = compose(contextWrapper, reduxConnect)(PureReflection);

  /* -------------------------------------------------------------------------------------------- *\
  |*                                       Static helpers                                         *|
  \* -------------------------------------------------------------------------------------------- */

  component.clearActionStack = () => {
    clearActionStack();
  };

  return component;
}
