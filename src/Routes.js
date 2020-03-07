import _ from 'lodash';
import Smart from './Smart';

class Routes extends Smart {

  initialize(routes) {
    this.routes = routes;
  }

  for = (scope) => {
    let match = null;
    let routes = this.routes;
    const paths = scope.split('/');
    _.each(paths, (path) => {
      const next = _.find(routes, { path });
      if (next) {
        match = next;
        // eslint-disable-next-line prefer-destructuring
        routes = next.routes;
      } else {
        match = null;
      }
    });
    return match;
  };

}

export default Routes;
