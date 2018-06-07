import PropTypes from 'prop-types';
import React from 'react';
import Component from '../../src/Component';

class MockComponent extends React.Component {

  static propTypes = {
    foobar: PropTypes.string.isRequired,
    defaultProp: PropTypes.string,
  };

  static defaultProps = {
    defaultProp: 'autoset'
  };

  render() {
    return (
      <h1>{this.props.foobar} : { this.props.defaultProp }</h1>
    );
  }

}

export default Component(MockComponent);
