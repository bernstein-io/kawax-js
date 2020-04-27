import _ from 'lodash';
import Smart from './Smart';

class Routes extends Smart {

  initialize(routes = {}) {
    this._root = routes;
  }

  scope = (scope) => {
    const node = this._getNode();
    let match = null;
    let routes = node.routes;
    const paths = scope.split('/');
    _.each(paths, (path) => {
      const next = _.find(routes, { path });
      if (next) {
        match = next;
        routes = next.routes;
      } else {
        match = null;
      }
    });
    return match;
  };

  draw = (scope) => {
    const node = scope ? this._getNode(scope) : this._root;
    // console.log('draw', node, scope);
    return this._parseNode(node, scope);
  };

  _parseNode = (node, scope) => {
    // console.log('_parseNode', node, scope);
    const subRoutes = _.flatten(this._mapNode(node.routes, scope));
    // console.log('_parseNode:subRoutes', subRoutes);
    const currentRoute = this._getRoute(node, scope, true);
    // console.log('_parseNode:currentRoute', currentRoute);
    return _.compact([
      ..._.flatten(subRoutes),
      currentRoute,
    ]);
  };

  _mapNode = (routes, scope) => _.map(routes, (node, key) => {
    if (node.routes) {
      // console.log('_mapNode:routes!', node, `${scope}/${node.path}`);
      return this._parseNode(node, `${scope}/${node.path}`);
    }
    return this._getRoute(node, scope);
  });

  _getScopedPath(path, scope) {
    return scope ? `${scope}/${path}` : path;
  }

  _getRoute(route, scope, node = false) {
    return route.component && {
      ...route,
      path: node ? scope : this._getScopedPath(route.path, scope),
      component: route.component || false,
      resource: route.resource || false,
    };
  }

  _getNode(scope = false) {
    return scope ? this.scope(scope) : this._root;
  }

}

export default Routes;
