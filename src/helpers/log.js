/* eslint-disable no-console */
import _ from 'lodash';

const defaultMessage = '[Logger]';

function isDarkModeEnabled() {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function getStyle(level) {
  const darkMode = isDarkModeEnabled();
  if (level === 'error') {
    return darkMode ? 'color: #fd4146;' : 'color: #ff443a;';
  } if (level === 'warning') {
    return darkMode ? 'color: #fedc9e;' : 'color: #77592b;';
  }
  return darkMode ? 'color: white;' : 'color: black;';

}

function error(message = defaultMessage, ...args) {
  if (!_.isEmpty(args)) {
    const style = getStyle('error');
    console.groupCollapsed(`%c${message}`, style);
    console.error(...args);
    console.groupEnd();
  } else {
    console.error(message);
  }
}

function warning(message = defaultMessage, ...args) {
  if (!_.isEmpty(args)) {
    const style = getStyle('warning');
    console.groupCollapsed(`%c${message}`, style);
    console.warn(...args);
    console.groupEnd();
  } else {
    console.warn(message);
  }
}

function info(message = defaultMessage, ...args) {
  console.info(message, ...args);
}

function debug(message = defaultMessage, ...args) {
  if (__DEV__) {
    console.debug(message, ...args);
  }
}

function group(message = defaultMessage, ...args) {
  console.groupCollapsed(message, ...args);
}

function groupEnd() {
  console.groupEnd();
}

export default { error, warning, info, debug, group, groupEnd };
