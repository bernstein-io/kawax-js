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

  // static contextToProps = ({ context }) => ({
  //   location: context.location,
  // });

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

  renderRoutes() {
    const routes = this.getRoutes();
    return (
      <Switch>
        {_.map(routes, (route) => {
          const key = `route-${_.uniqueId()}`;
          const component = loadable(route.component);
          const fullPath = this.getFullPath(route.path);
          return (<Route key={key} path={fullPath} component={component} />);
        })}
      </Switch>
    );
  }

  renderWrapper() {
    const scope = this.getScope();
    const routes = this.renderRoutes();
    if (scope.layout) {
      const Layout = loadable(scope.layout);
      return (<Layout>{routes}</Layout>);
    }
    return routes;
  }

  render() {
    return this.renderWrapper();
  }

}

export default Component(Junction);
