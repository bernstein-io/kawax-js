import React from 'react';
import PropTypes from 'prop-types';
import { Router as ReactRouter } from 'react-router-dom';
import Container from './Container';
import History from './History';

class Router extends React.Component {

  static displayName = 'ConnectedRouter';

  static dispatchToProps = ({ ownProps }) => ({
    historyAction: ownProps.historyAction ||
      (({ location, action }) => ({ type: 'ROUTER.EVENT', payload: { location, action } }))
  });

  static propTypes = {
    history: PropTypes.object,
    historyAction: PropTypes.func.isRequired
  };

  static defaultProps = {
    history: History
  };

  static propsToContext = ({ ownProps }) => ({
    location: ownProps.history.location,
    history: ownProps.history
  });

  constructor(props, state) {
    super(props, state);
    this.toggleHistory = props.history.listen((location, action) => {
      props.historyAction({ location, action });
    });
  }

  componentWillUnmount() {
    this.toggleHistory();
  }

  render() {
    return <ReactRouter {...this.props} />;
  }

}

export default Container(Router, { wrapRouter: false });
