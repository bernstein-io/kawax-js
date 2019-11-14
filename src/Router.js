import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Router as ReactRouter } from 'react-router-dom';
import resolve from './helpers/resolve';
import Container from './Container';
import History from './History';
import HistoryHook from './instance/HistoryHook';
import Runtime from './Runtime';

class Router extends React.Component {

  static connectOptions = {
    areStatesEqual: () => false,
    areOwnPropsEqual: () => false,
    areStatePropsEqual: () => false,
    areMergedPropsEqual: () => false,
    pure: false,
  };

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
      historyHook: HistoryHook.build({ customHistoryHook }),
    };
  };

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
    navigateTo: (to) => (event) => {
      const { history } = ownProps;
      event.preventDefault();
      history.push(to);
    },
  });

  constructor(props, state) {
    super(props, state);
    const { history, historyHook } = this.props;
    this.toggleHistory = history.listen((location, action) => {
      // console.log('ToggleHistory', _.cloneDeep({ location, action }));
      historyHook({ location, action });
    });
  }

  componentWillUnmount() {
    this.toggleHistory();
  }

  render() {
    // console.log('Router:', _.cloneDeep(this.props));
    ReactRouter.displayName = 'ReactRouter';
    return <ReactRouter {...this.props} />;
  }

}

export default Container(Router);
