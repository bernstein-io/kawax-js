function error(...args) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

function warning(...args) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

function info(...args) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
}

function debug(...args) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

export default { error, warning, info, debug };
