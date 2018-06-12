import _ from 'lodash';

export default function select(source, path, { match = 'id' } = {}) {
  let value = source;
  const currentPath = [];
  const pathArray = _.isString(path) ? path.split('.') : path;
  _.each(pathArray, (key) => {
    currentPath.push(key);
    if (_.isArray(value)) {
      value = _.find(value, (item) => (item[match] === key));
    } else {
      value = value ? value[key] : undefined;
    }
  });
  return value;
}
