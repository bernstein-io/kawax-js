import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import ShallowRenderer from 'react-test-renderer/shallow';
import { isElement, isFragment } from 'react-is';
import { StyleSheet, css } from './helpers/aphrodite';
import Runtime from './Runtime';

export default (Pure) => {

  const shallowRenderer = new ShallowRenderer();
  let wrappedComponent = false;

  function mapNestedStyle(stylesheet) {
    _.each(stylesheet, (item, selectorKey) => {
      const selectors = item._definition;
      _.each(selectors, (selector, key) => {
        if (_.isPlainObject(selector) && key[0] !== '&' && key[0] !== ':' && key[0] !== '@') {
          delete selectors[key];
          selectors[`&${key}`] = selector;
        }
      });
    });
    return stylesheet;
  }

  function getCssClasses() {
    const componentStyle = Pure.css;
    if (componentStyle) {
      const stylesheet = StyleSheet.create({ component: componentStyle });
      const styleWithNesting = mapNestedStyle(stylesheet);
      return css(styleWithNesting.component);
    }
  }

  const displayName = Pure.name || 'Unnamed';
  const inlineCssClasses = getCssClasses();

  class Component extends React.Component {

    static displayName = `${displayName}Component`;

    render() {
      const factory = React.createFactory(Pure);
      return this.wrapContext(factory);
    }

    classNames = (current) => { /* eslint-disable react/prop-types */
      const propClasses = this.props.className || false;
      const inlineClasses = inlineCssClasses || false;
      const currentClasses = current ? current.split(' ') : false;
      return classNames(propClasses, inlineClasses, _.uniq(currentClasses));
    };

    computeCssClasses() { /* eslint-disable react/no-find-dom-node */
      const shallow = shallowRenderer.render(wrappedComponent);
      const node = ReactDOM.findDOMNode(this);
      if (node && (this.props.className || inlineCssClasses)) {
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

  }

  return Component;
};
