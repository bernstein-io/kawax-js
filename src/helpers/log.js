/* eslint-disable no-console */
import _ from 'lodash';

const defaultMessage = '[Logger]';

function error(message = defaultMessage, ...args) {
  if (!_.isEmpty(args)) {
    console.groupCollapsed(`%c${message}`, 'background: #FFF0F0; color: #FD4146');
    console.error(...args);
    console.groupEnd();
  } else {
    console.error(message);
  }
}

function warning(message = defaultMessage, ...args) {
  if (!_.isEmpty(args)) {
    console.groupCollapsed(`%c${message}`, 'background: #FFFBE6; color: #77592b');
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
