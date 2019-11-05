import React from 'react';
import PropTypes from 'prop-types';
import { Router as ReactRouter } from 'react-router-dom';
import Container from './Container';
import History from './History';
import DefaultHistoryHook from './instance/DefaultHistoryHook';

class Router extends React.Component {

  static dispatchToProps = ({ ownProps }) => ({
    historyHook: ownProps.historyHook || DefaultHistoryHook.build(),
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
    navigateTo: (to) => (event) => {
      const { history } = ownProps;
      event.preventDefault();
      history.push(to);
    },
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
