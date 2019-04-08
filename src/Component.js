import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { StyleSheet, css } from './helpers/aphrodite';
import resolve from './helpers/resolve';
import Runtime from './Runtime';

export default (Pure) => {

  const composedProps = [];

  const defaultClassName = Pure.className || 'component';
  const displayName = Pure.name || 'Unnamed';
  let componentInstance = false;
  let uniqClassName = false;

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
        uniqClassName = css(styleWithNesting[className]);
        return [defaultClassName, uniqClassName];
      }
      return [defaultClassName];
    }
    return [defaultClassName, uniqClassName];
  }

  return class Component extends React.Component {

    static displayName = `Component(${displayName})`;

    getClassNames = (current) => { /* eslint-disable react/prop-types */
      const inlineClass = getCssClasses(this.props, this.state) || false;
      const currentClasses = current ? current.split(' ') : false;
      const { className } = this.props;
      const propClasses = className ? className.split(' ') : false;
      const uniq = _.uniq([...currentClasses, ...inlineClass, propClasses]);
      return classNames(...uniq);
    };

    assignCssClasses() { /* eslint-disable react/no-find-dom-node */
      const { className } = this.props;
      const cssClasses = getCssClasses(this.props, this.state);
      const fiber = _.get(componentInstance, '_reactInternalFiber');
      const sibling = _.get(fiber, 'child.sibling');
      const node = ReactDOM.findDOMNode(fiber.stateNode);
      if (node && (className || cssClasses)) {
        if (sibling) {
          const parent = node ? node.parentNode : false;
          if (parent) parent.className = this.getClassNames(parent.className);
        } else {
          node.className = this.getClassNames(node.className);
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

    render() {
      const Context = Runtime('context');
      return (
        <Context.Consumer>
          {(context) => {
            composedProps.push(..._.keys(context));
            return React.createElement(Pure, {
              ...context,
              ...this.props,
              ref: (reference) => { componentInstance = reference; },
            });
          }
          }
        </Context.Consumer>
      );
    }

  };
};
