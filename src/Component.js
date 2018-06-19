import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { StyleSheet, css } from './helpers/aphrodite';
import Runtime from './Runtime';

export default (Pure) => class ComponentWrapper extends React.Component {

  static displayName = `${Pure.name}Component`;

  static propTypes = {
    className: PropTypes.oneOfType([PropTypes.string, PropTypes.bool])
  };

  static defaultProps = {
    className: false
  };

  render() {
    const wrapper = this.composeHOC();
    const withContext = this.wrapContext(wrapper);
    return this.wrapStyle(withContext);
  }

  wrapContext(wrapper) {
    const Context = Runtime('context');
    return (
      <Context.Consumer>
        {(context) => wrapper({ ...context, ...this.props })}
      </Context.Consumer>
    );
  }

  composeHOC() {
    return React.createFactory(Pure);
  }

  classNames = () => classNames(
    this.getStyle(),
    this.props.className
  );

  wrapStyle(component) {
    if (Pure.cssStyle || classNames) {
      return (
        <div className={this.classNames()}>
          {component}
        </div>
      );
    }
    return component;
  }

  mapNestedStyle(stylesheet) {
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

  getStyle() {
    const componentStyle = Pure.cssStyle;
    if (componentStyle) {
      const stylesheet = StyleSheet.create({ component: componentStyle });
      const styleWithNesting = this.mapNestedStyle(stylesheet);
      return css(styleWithNesting.component);
    }
  }

};
