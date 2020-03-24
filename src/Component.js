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

  /* -------------------------------------------------------------------------------------------- *\
  |*                                         Pure props                                           *|
  \* -------------------------------------------------------------------------------------------- */

  const instanceKeys = [];

  const composedProps = [
    'instanceKey',
    'select',
    'actions',
    'dispatch',
    'children',
    'ownActions',
    'ownClassNames',
  ];

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
      ..._.map(Pure.mixins, (mixin) => _.isObject(mixin.static) && mixin.static[key]),
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
    if (Pure.mixins && componentInstance) {
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
  let actionStack = !Pure.unscopedActionStack && {};

  function getActionStack(instanceKey) {
    if (Pure.unscopedActionStack === true) {
      return actionStack = actionStack || new ActionStack();
    }
    return actionStack[instanceKey] = actionStack[instanceKey] || new ActionStack();
  }

  function clearActionStack(instanceKey) {
    if (!Pure.unscopedActionStack === true) {
      const store = Runtime('store');
      store._dispatch({ type: '@@CLEAR_ACTION', payload: instanceKey });
      actionStack[instanceKey] = undefined;
    }
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                           Wrapper                                            *|
  \* -------------------------------------------------------------------------------------------- */

  /* eslint-disable-next-line react/no-multi-comp */
  const contextCrapper = (component) => class ContextWrapper extends React.Component {

    static displayName = `Wrapper(${displayName})`;

    instanceKey = `${displayName}-${_.uniqueId()}`;

    componentDidMount() {
      instanceKeys.push(this.instanceKey);
    }

    render() {
      const ownProps = this.props;
      const instanceKey = this.instanceKey;
      const contextToProps = aggregateStaticWithMixins('contextToProps');
      if (!_.isEmpty(contextToProps) || Pure.propsToContext) {
        return React.createElement(Context.Consumer, null, (context) => {
          prevContext = context;
          const contextProps = resolveStaticWithMixins('contextToProps', { context, ownProps });
          composedProps.push(..._.keys(contextProps));
          if (Pure.contextToProps) {
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

    state = {};

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
      const { className } = this.fullProps;
      const propClasses = className ? className.split(' ') : false;
      const uniq = _.uniq([...currentClass, ...computedClass, propClasses]);
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
      const { instanceKey } = this.props;
      await new Promise(() => {
        clearActionStack(instanceKey);
      });
    }

    computeContext(ownProps) {
      const withRouter = !!Runtime('withRouter');
      const { getState } = Runtime('store');
      const state = getState();
      const select = getSelect(state);
      const mixins = getMixins();
      const propsToContext = resolveStaticWithMixins('propsToContext', { ownProps, mixins, select });
      if (withRouter && ownProps.match) {
        const match = ownProps.match;
        return { match, ...(propsToContext || {}) };
      }
      return propsToContext;
    }

    contextProvider = () => {
      const ownProps = omitProps(this.props);
      const propsToContext = this.computeContext(ownProps);
      if (propsToContext) {
        composedProps.push(..._.keys({ ...prevContext, ...propsToContext }));
        return (
          <Context.Provider value={{ ...prevContext, ...propsToContext }}>
            {this.renderComponent({
              ...ownProps,
              ref: (reference) => { componentInstance = reference; },
            })}
          </Context.Provider>
        );
      }
      return this.renderComponent(ownProps);
    };

    renderComponent(ownProps = {}) {
      const ownClassNames = this.classNames || String();
      this.fullProps = { ...ownProps, ...this.props, ownClassNames };
      const props = {
        ...this.fullProps,
        ref: (reference) => { componentInstance = reference; },
      };
      return React.createElement(Pure, props);
    }

    render() {
      if (Pure.propsToContext) {
        return this.contextProvider();
      }
      return this.renderComponent();
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
    composedProps.push(..._.keys(actionsMap));
    return actionsMap;
  }

  function wrapStateToProps() {
    return (state, { instanceKey, ...props }) => {
      const select = getSelect(state);
      const ownProps = omitProps(props);
      const actions = getActionStack(instanceKey);
      const mixins = getMixins();
      const stateProps = resolveStaticWithMixins('stateToProps', { state, actions, ownProps, mixins, select });
      composedProps.push(..._.keys(stateProps));
      const ownActions = actions.own();
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
        composedProps.push(..._.keys(actions));
        return actions;
      };
    }
    return (dispatch) => {
      const actions = { ...bindedActionCreators, ...dispatchToProps };
      composedProps.push(..._.keys(actions));
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

  const shallowCompare = (next, prev) => _.isEqual(next, prev);

  const reduxConnect = connect(mapStateToProps, mapDispatchToProps, mergeProps, {
    areStatesEqual: (next, prev) => (prev === next),
    areStatePropsEqual: (next, prev) => shallowCompare(next, prev),
    areMergedPropsEqual: (next, prev) => shallowCompare(next, prev),
    ...options,
  });

  const component = compose(contextCrapper, reduxConnect)(PureReflection);

  /* -------------------------------------------------------------------------------------------- *\
  |*                                       Static helpers                                         *|
  \* -------------------------------------------------------------------------------------------- */

  component.clearActionStack = () => {
    actionStack = !Pure.unscopedActionStack && {};
  };

  return component;
}
