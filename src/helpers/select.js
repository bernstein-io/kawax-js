import _ from 'lodash';

const argsToArray = (args = []) => ((_.isArray(_.first(args))) ? _.first(args) : args);

const parsePathArray = (args) => {
  const paths = argsToArray(args);
  const parsedPath = [];
  _.each(paths, (path) => {
    parsedPath.push(_.isString(path) ? path.split('.') : path);
  });
  return _.flatten(parsedPath);
};

function match(source, selector) {
  return _.filter(source, (item) => _.isMatch(item, selector));
}

export default function select(source, ...args) {
  let value = source;
  const currentPath = [];
  const primaryKey = 'id';
  const pathArray = parsePathArray(args);
  _.each(pathArray, (selector) => {
    currentPath.push(selector);
    if (_.isArray(value)) {
      if (_.isString(selector)) {
        value = _.find(value, (item) => (item[primaryKey] === selector));
      } else if (_.isPlainObject(selector)) {
        value = match(value, selector);
      }
    } else {
      value = value ? _.get(value, selector) : undefined;
    }
  });
  return value;
}
