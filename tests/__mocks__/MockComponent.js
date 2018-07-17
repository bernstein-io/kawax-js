import PropTypes from 'prop-types';
import React from 'react';
import Component from '../../src/Component';

class MockComponent extends React.Component {

  static propTypes = {
    foobar: PropTypes.string.isRequired,
    defaultProp: PropTypes.string,
  };

  static defaultProps = {
    defaultProp: 'autoset',
  };

  render() {
    const { foobar, defaultProp } = this.props;
    return (
      <h1>
        {foobar}
        {' '}
:
        {' '}
        {defaultProp}
      </h1>
    );
  }

}

export default Component(MockComponent);
