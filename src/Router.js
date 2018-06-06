import React from 'react';
import PropTypes from 'prop-types';
import { Router as ReactRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import History from './History';

class Router extends React.Component {

  static propTypes = {
    history: PropTypes.object,
    historyAction: PropTypes.func.isRequired
  };

  static defaultProps = {
    history: History
  };

  static getDerivedStateFromProps(props, state) {
    const toggleHistory = props.history.listen((location, action) => {
      props.historyAction({ location, action });
      // if (action === 'POP') props.history.push(location.pathname);
    });
    return { toggleHistory };
  }

  state = {
    toggleHistory: false
  };

  componentWillUnmount() {
    this.state.toggleHistory();
  }

  render() {
    const history = this.props.history;
    const props = { ...this.props, history };
    return <ReactRouter {...props} />;
  }

}

export default connect(null, (dispatch, props) => ({
  historyAction: props.historyAction ||
      (({ location, action }) => ({ type: 'ROUTER.EVENT', payload: { location, action } }))
}))(Router);
