import PropTypes from 'prop-types';
import React from 'react';
import Container from '../../src/Container';
import MockAction from './MockAction';

class MockContainer extends React.Component {

  static mapStateToProps = (state, props, { select }) => ({
    foo: select('foo'),
  });

  static mapDispatchToProps = {
    doSomething: MockAction.export(),
  };

  static propTypes = {
    foo: PropTypes.string,
  };

  static defaultProps = {
    foo: 'bar',
  };

  render() {
    return <div>{this.props.foo}</div>;
  }

}

export default Container(MockContainer);
