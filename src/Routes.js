import _ from 'lodash';
import Smart from './Smart';
import resolve from './helpers/resolve';

class Routes extends Smart {

  initialize(routes = {}) {
    this._mount = resolve(routes) || {};
  }

  scope(scope) {
    if (scope) {
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
    }
  }

  draw(scope) {
    const node = scope ? this._getNode(scope) : this._mount;
    return this._parseNode(node, scope);
  }

  extends(scope) {
    const node = this.scope(scope);
    return node.routes;
  }

  _parseNode(node, scope, parentProviders = []) {
    const routes = resolve(node.routes, this);
    const providers = _.compact([...parentProviders, node.provider]);
    const subRoutes = _.flatten(this._mapNode(routes, scope, providers));
    const currentRoute = this._getRoute(node, scope, providers, true);
    return _.compact([
      ..._.flatten(subRoutes),
      currentRoute,
    ]);
  }

  _mapNode(routes, scope, providers = []) {
    return _.map(routes, (node, key) => {
      if (node.routes) {
        return this._parseNode(node, `${scope}/${node.path}`, providers);
      }
      return this._getRoute(node, scope, providers);
    });
  }

  _getScopedPath(path, scope) {
    return scope ? `${scope}/${path}` : path;
  }

  _getRoute(route, scope, providers = [], node = false) {
    return route.component && _.pickBy({
      ...route,
      path: `/${node ? scope : this._getScopedPath(route.path, scope)}`,
      providers: !_.isEmpty(providers) && providers,
      component: route.component || false,
      resource: route.resource || false,
    }, _.identity);
  }

  _getNode(scope = false) {
    return scope ? this.scope(scope) : this._mount;
  }

}

export default Routes;
