import React from 'react';
import PropTypes from 'prop-types';
import { Router as ReactRouter } from 'react-router-dom';
import Container from './Container';
import History from './History';
// import HistoryHook from './instance/HistoryHook';
import Runtime from './Runtime';

class Router extends React.Component {

  static stateToProps = ({ ownProps }) => {
    const Store = Runtime('store');
    const state = Store.getInternalState();
    return {
      events: state.router,
    };
  };

  static dispatchToProps = ({ ownProps, dispatch }) => {
    const customHistoryHook = ownProps.historyHook;
    return {
      // historyHook: HistoryHook.build({ customHistoryHook }),
      customHistoryHook,
    };
  };

  static propTypes = {
    history: PropTypes.object,
    // historyHook: PropTypes.func.isRequired,
    customHistoryHook: PropTypes.func.isRequired,
  };

  static defaultProps = {
    history: History,
  };

  static propsToContext = ({ ownProps }) => ({
    location: ownProps.history.location,
    history: ownProps.history,
    navigateTo: (to) => (event) => {
      const { history } = ownProps;
      event.preventDefault();
      history.push(to);
    },
  });

  constructor(props, state) {
    super(props, state);
    const { history, customHistoryHook } = this.props;
    this.toggleHistory = history.listen((location, action) => {
      customHistoryHook({ location, action });
      // historyHook({ location, action });
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
