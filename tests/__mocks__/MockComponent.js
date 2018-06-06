import PropTypes from 'prop-types';
import React from 'react';
import Component from '../../src/Component';

class MockComponent extends React.Component {

  static withContext = ['foo'];

  static propTypes = {
    foo: PropTypes.string.isRequired,
    foobar: PropTypes.string.isRequired,
    defaultProp: PropTypes.string,
  };

  static defaultProps = {
    defaultProp: 'autoset'
  };

  render() {
    return (
      <h1>{this.props.foo} : {this.props.foobar} : { this.props.defaultProp }</h1>
    );
  }

}

export default Component(MockComponent);
