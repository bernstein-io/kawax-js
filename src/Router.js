import React from 'react';
import PropTypes from 'prop-types';
import { Router as ReactRouter } from 'react-router-dom';
import Action from './Action';
import Container from './Container';
import History from './History';

class DefaultHistoryHook extends Action {

  static type = 'ROUTER.EVENT';

  call = async (payload) => payload;

}

class Router extends React.Component {

  static dispatchToProps = ({ ownProps }) => ({
    historyHook: ownProps.historyHook || DefaultHistoryHook.export(),
  });

  static propTypes = {
    history: PropTypes.object,
    historyHook: PropTypes.func.isRequired,
  };

  static defaultProps = {
    history: History,
  };

  static propsToContext = ({ ownProps }) => ({
    location: ownProps.history.location,
    history: ownProps.history,
  });

  constructor(props, state) {
    super(props, state);
    this.toggleHistory = props.history.listen((location, action) => {
      props.historyHook({ location, action });
    });
  }

  componentWillUnmount() {
    this.toggleHistory();
  }

  render() {
    ReactRouter.displayName = 'ReactRouter';
    return <ReactRouter {...this.props} />;
  }

}

export default Container(Router);
