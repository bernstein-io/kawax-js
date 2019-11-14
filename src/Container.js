import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { setStatic } from 'recompose';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { StyleSheet, css } from './helpers/aphrodite';
import Runtime from './Runtime';
import ActionStack from './internal/ActionStack';
import resolve from './helpers/resolve';
import SelectHelper from './helpers/select';

const instanceKeys = [];

export default (Pure) => {

  /* -------------------------------------------------------------------------------------------- *\
  |*                                         Pure props                                           *|
  \* -------------------------------------------------------------------------------------------- */

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

  const displayName = Pure.name || 'Unnamed';

  /* -------------------------------------------------------------------------------------------- *\
  |*                                       Props & Context                                        *|
  \* -------------------------------------------------------------------------------------------- */

  /* eslint-disable no-unused-vars */
  let prevProps = {};
  let prevContext = {};

  /* -------------------------------------------------------------------------------------------- *\
  |*                                        Action Stack                                          *|
  \* -------------------------------------------------------------------------------------------- */

  const actionStacks = {};

  function getActionStack(instanceKey) {
    if (!actionStacks[instanceKey]) {
      actionStacks[instanceKey] = new ActionStack();
    }
    return actionStacks[instanceKey];
  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                           Wrapper                                            *|
  \* -------------------------------------------------------------------------------------------- */

  /* eslint-disable react/no-multi-comp */
  const wrapper = (component) => class ContainerWrapper extends React.Component {

    static displayName = `Wrapper(${displayName})`;

    instanceKey = `${displayName}-${_.uniqueId()}`;

    componentDidMount() {
      instanceKeys.push(this.instanceKey);
    }

    flushActionStack = () => { /* eslint-disable react/prop-types */
      const { instanceKey } = this.props;
      const actionStack = getActionStack(instanceKey);
      actionStack.clear(true);
    };

    render() {
      const ownProps = this.props;
      const instanceKey = this.instanceKey;
      const withStatic = setStatic('flushActionStack', this.flushActionStack)(component);
      const factory = React.createFactory(withStatic);
      if (Pure.contextToProps || Pure.propsToContext) {
        const Context = Runtime('context');
        return React.createElement(Context.Consumer, null, (context) => {
          prevContext = context;
          const contextProps = resolve.call(this, Pure.contextToProps, { context, ownProps });
          composedProps.push(..._.keys(contextProps));
          if (Pure.contextToProps) {
            return factory({ ...contextProps, ...ownProps, instanceKey });
          } else {
            return factory({ ...ownProps, instanceKey });
          }
        });
      } else {
        return factory({ ...ownProps, instanceKey });
      }
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
  |*                                      Container Wrapper                                       *|
  \* -------------------------------------------------------------------------------------------- */

  class Container extends React.Component {

    state = {};

    componentInstance = false;

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

    getClassNames = (currentClassNames) => { /* eslint-disable react/prop-types */
      const current = currentClassNames.split(' ');
      const currentClass = current ? _.reject(current, (i) => (i === previousClassName)) : false;
      const computedClass = getCssClasses(this.fullProps, this.state) || false;
      const { className } = this.fullProps;
      const propClasses = className ? className.split(' ') : false;
      const uniq = _.uniq([...currentClass, ...computedClass, propClasses]);
      return classNames(_.compact(uniq));
    };

    assignCssClasses() { /* eslint-disable react/no-find-dom-node */
      const { className } = this.fullProps;
      const cssClasses = getCssClasses(this.fullProps, this.state);
      const fiber = _.get(this.componentInstance, '_reactInternalFiber');
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

    componentDidUpdate = () => {
      if (Pure.className || Pure.css) {
        this.assignCssClasses();
      }
    };

    componentDidMount = () => {
      if (Pure.className || Pure.css) {
        this.assignCssClasses();
      }
    };

    async componentWillUnmount() {
      const { instanceKey } = this.props;
      await new Promise(() => {
        const actionStack = getActionStack(instanceKey);
        actionStack.clear();
      });
    }

    render() {
      const factory = React.createFactory(Pure);
      if (Pure.propsToContext) {
        return this.contextProvider(factory);
      }
      return this.renderComponent(factory);
    }

    renderComponent(factory, props = {}) {
      const ownClassNames = this.classNames || String();
      this.fullProps = { ...props, ...this.props, ownClassNames };
      return factory({
        ...this.fullProps,
        ref: (reference) => { this.componentInstance = reference; },
      });
    }

    computeContext(ownProps) {
      const withRouter = !!Runtime('withRouter');
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
      if (propsToContext) {
        composedProps.push(..._.keys({ ...prevContext, ...propsToContext }));
        return (
          <Context.Provider value={{ ...prevContext, ...propsToContext }}>
            {this.renderComponent(factory, {
              ...ownProps,
              ref: (reference) => { this.componentInstance = reference; },
            })}
          </Context.Provider>
        );
      }
      return this.renderComponent(factory, ownProps);
    };

  }

  /* -------------------------------------------------------------------------------------------- *\
  |*                                           Redux                                              *|
  \* -------------------------------------------------------------------------------------------- */

  function wrapStateToProps() {
    const stateToProps = Pure.stateToProps || {};
    return (state, { instanceKey, ...props }) => {
      const select = getSelect(state);
      const ownProps = omitProps(props);
      const nextProps = resolve(stateToProps, { state, ownProps, select }) || {};
      const actions = getActionStack(instanceKey);
      const ownActions = actions.own();
      composedProps.push(..._.keys(nextProps));
      return { actions, instanceKey, ownActions, ...nextProps };
    };
  }

  function createActions(actionConstructors, dispatch, { instanceKey, ...props }) {
    return _.mapValues(actionConstructors, (actionConstructor, key) => (...data) => {
      const { getState } = Runtime('store');
      const instance = actionConstructor({
        origin: instanceKey,
        delegate: false,
        props: props,
      });
      const id = instance.run(...data)(dispatch, getState);
      const actionStack = getActionStack(instanceKey);
      actionStack.push({ id, key, instance });
      return id;
    });
  }

  function wrapDispatchToProps() {
    const dispatchToProps = Pure.dispatchToProps || {};
    return (dispatch, ownProps) => {
      const actionConstructors = resolve(dispatchToProps, { dispatch, ownProps }) || {};
      const actions = createActions(actionConstructors, dispatch, ownProps);
      composedProps.push(..._.keys(actions));
      return actions;
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

  /* -------------------------------------------------------------------------------------------- *\
  |*                                      Compose and Render                                      *|
  \* -------------------------------------------------------------------------------------------- */

  const reduxConnect = connect(mapStateToProps, mapDispatchToProps, mergeProps, {
    ...options,
    areStatesEqual: (next, prev) => (prev === next),
    areOwnPropsEqual: (next, prev) => _.isEqual(next, prev),
    areStatePropsEqual: (next, prev) => _.isEqual(next, prev),
    areMergedPropsEqual: (next, prev) => _.isEqual(next, prev),
  });

  return compose(wrapper, reduxConnect)(Container);
};
