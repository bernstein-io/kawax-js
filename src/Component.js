import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { StyleSheet, css } from './helpers/aphrodite';
import resolve from './helpers/resolve';
import Runtime from './Runtime';

export default (Pure) => {
  const defaultClassName = Pure.className || 'component';
  const displayName = Pure.name || 'Unnamed';
  let componentInstance = false;
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
        uniqClassName = css(styleWithNesting[className]);
        return `${defaultClassName} ${uniqClassName}`;
      }
      return defaultClassName;
    }
    return `${defaultClassName} ${uniqClassName}`;
  }

  return class Component extends React.Component {

    static displayName = `Component(${displayName})`;

    classNames = (current) => { /* eslint-disable react/prop-types */
      const cssClasses = getCssClasses(this.props, this.state);
      const inlineClass = cssClasses || false;
      const currentClasses = current ? current.split(' ') : false;
      const { className } = this.props;
      const propClasses = className ? className.split(' ') : false;
      const uniq = _.uniq([...currentClasses, inlineClass, propClasses]);
      return classNames(...uniq);
    };

    computeCssClasses() { /* eslint-disable react/no-find-dom-node */
      const node = ReactDOM.findDOMNode(this);
      const { className } = this.props;
      const cssClasses = getCssClasses(this.props, this.state);
      const sibling = _.get(componentInstance, '_reactInternalFiber.child.sibling');
      if (node && (className || cssClasses)) {
        if (sibling) {
          const parent = node ? node.parentNode : false;
          if (parent) parent.className = this.classNames(parent.className);
        } else {
          node.className = this.classNames(node.className);
        }
      }
    }

    componentDidUpdate = () => {
      if (Pure.className || Pure.css) {
        this.computeCssClasses();
      }
    };

    componentDidMount = () => {
      if (_.isFunction(Pure.css)) {
        this.computeCssClasses();
      }
    };

    render() {
      const Context = Runtime('context');
      return (/* eslint-disable no-return-assign */
        <Context.Consumer>
          {(context) => React.createElement(Pure, {
            ...context,
            ...this.props,
            ref: (reference) => { componentInstance = reference; },
          })}
        </Context.Consumer>
      );
    }

  };
};
