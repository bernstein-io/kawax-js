import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import ShallowRenderer from 'react-test-renderer/shallow';
import { isElement, isFragment } from 'react-is';
import { StyleSheet, css } from './helpers/aphrodite';
import resolve from './helpers/resolve';
import Runtime from './Runtime';

export default (Pure) => {

  const shallowRenderer = new ShallowRenderer();
  const displayName = Pure.name || 'Unnamed';
  let wrappedComponent = false;
  let uniqClassName = false;

  function mapSelectors(selectors, applyWildcard = false) {
    const specialChars = ['*', '&', ':', '@'];
    const mappedSelectors = {};
    _.each(selectors, (selector, key) => {
      const newKey = !_.includes(specialChars, key[0]) ? `&${key}` : key;
      if (_.isPlainObject(selector)) {
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

  function getCssClass(props, state) {
    if (_.isFunction(Pure.css) || uniqClassName === false) {
      const componentStyle = resolve(Pure.css, props, state);
      if (componentStyle) {
        const className = Pure.name || 'Component';
        const stylesheet = StyleSheet.create({ [className]: componentStyle });
        const styleWithNesting = mapNestedStyle(stylesheet);
        uniqClassName = css(styleWithNesting[className]);
        return uniqClassName;
      }
    } else {
      return uniqClassName;
    }
  }

  return class Component extends React.Component {

    static displayName = `Component(${displayName})`;

    render() {
      const factory = React.createFactory(Pure);
      return this.wrapContext(factory);
    }

    classNames = (current) => { /* eslint-disable react/prop-types */
      const cssClass = getCssClass(this.props, this.state);
      const inlineClass = cssClass || false;
      const currentClasses = current ? current.split(' ') : false;
      const { className } = this.props;
      const propClasses = className ? className.split(' ') : false;
      const uniq = _.uniq([...currentClasses, inlineClass, propClasses]);
      return classNames(...uniq);
    };

    computeCssClasses() { /* eslint-disable react/no-find-dom-node */
      const shallow = shallowRenderer.render(wrappedComponent);
      const node = ReactDOM.findDOMNode(this);
      const { className } = this.props;
      const cssClass = getCssClass(this.props, this.state);
      if (node && (className || cssClass)) {
        if (isElement(shallow) && !isFragment(shallow)) {
          node.className = this.classNames(node.className);
        } else {
          const parent = node ? node.parentNode : false;
          if (parent) parent.className = this.classNames(parent.className);
        }
      }
    }

    componentDidUpdate() {
      this.computeCssClasses();
    }

    componentDidMount() {
      this.computeCssClasses();
    }

    wrapContext(factory) {
      const Context = Runtime('context');
      return (/* eslint-disable no-return-assign */
        <Context.Consumer>
          {(context) => wrappedComponent = factory({ ...context, ...this.props })}
        </Context.Consumer>
      );
    }

  };
};
