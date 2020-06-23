import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import loadable from '@loadable/component';
import { Switch, Route } from 'react-router';
import Component from '../Component';

class Junction extends React.Component {

  static propTypes = {
    scope: PropTypes.string,
    basePath: PropTypes.string,
    routes: PropTypes.object.isRequired,
  };

  static defaultProps = {
    scope: undefined,
    basePath: undefined,
  };

  state = {
    match: undefined,
  };

  shouldComponentUpdate(nextProps, nextState) {
    const { match } = this.state;
    const shouldUpdate = (!_.isEqual(match, nextState.match));
    return shouldUpdate;
  }

  setRef = (reference) => {
    if (reference) {
      this.setState({
        location: _.get(reference, 'props.location'),
        match: _.get(reference, 'props.computedMatch'),
      });
    }
  };

  renderComponent = () => {};

  getScope() {
    const { routes, scope } = this.props;
    return routes.scope(scope);
  }

  getRoutes() {
    const { routes, scope } = this.props;
    return routes.draw(scope);
  }

  getFullPath = (path) => {
    const { basePath } = this.props;
    return basePath ? `/${basePath}${path}` : path;
  };

  renderWithProviders = (screen, providers) => (props) => {
    let renderer = React.createElement(screen, props);
    _.each(providers, (Provider) => {
      renderer = React.createElement(Provider, props, renderer);
    });
    return renderer;
  };

  renderRoute(route) {
    const key = `route-${_.uniqueId()}`;
    const fullPath = this.getFullPath(route.path);
    const screen = loadable(route.component);
    if (route.providers) {
      const providers = _.map(route.providers, (provider) => loadable(provider));
      return (
        <Route
          key={key}
          path={fullPath}
          ref={this.setRef}
          render={this.renderWithProviders(screen, providers)}
        />
      );
    }
    return <Route key={key} path={fullPath} component={screen} ref={this.setRef} />;
  }

  renderRoutes() {
    const routes = this.getRoutes();
    return (
      <Switch>
        {_.map(routes, (route) => this.renderRoute(route))}
      </Switch>
    );
  }

  renderWrapper() {
    const scope = this.getScope();
    const routes = this.renderRoutes();
    const { match, location } = this.state;
    if (scope.layout) {
      const Layout = loadable(scope.layout);
      return (<Layout location={location} match={match}>{routes}</Layout>);
    }
    return routes;
  }

  render() {
    return this.renderWrapper();
  }

}

export default Component(Junction);
