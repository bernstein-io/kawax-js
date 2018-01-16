import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';

class Component extends React.Component {

  constructor(props, context) {
    super(props, context);
    if (!this.state) { this.state = {}};
    this.class = this.__proto__.constructor;
    this.initialize(props);
  }

  initialize(props = {}) { }


  defaultProps() {
    let defaultProps = this.__proto__.constructor.defaultProps;
    return _.omit(_.clone(this.props), _.keys(defaultProps));
  }

  ownProps() {
    let propTypesKeys = _.keys(this.class.propTypes);
    let defaultPropsKeys = _.keys(this.class.defaultProps);
    return _.pick(this.props, [...propTypesKeys, ...defaultPropsKeys]);
  }

  omitOwnProps() {
    let ownProps = this.ownProps();
    return _.omit(_.clone(this.props), _.keys(ownProps));
  }


  classNames(...options) {
    let klass = classNames(options);
    if (this.props.className) {
      klass += ' ' + this.props.className;
    }
    return klass;
  }

}

export default Component;
