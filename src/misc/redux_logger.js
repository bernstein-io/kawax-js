const timeNow = () => {
  if ((typeof performance !== 'undefined' && performance !== null)
    && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

const logFormatter = ({action, getState, timeStarted, duration}) => {
  let header = [`%c✉ %cdispatched: ${String(action.type)}`];
  header.push(`%c${action.status ? '[' + action.status + ']' : '[NO STATUS]'}`);
  header.push(`%c(in ${duration.toFixed(2)} ms)`);
  header.push(`\n%c| Action Payload: %O`);
  header.push(`\n%c| Next State:     %O\n\n`);
  return [
    header.join(' '),
    'color: #754EB9; font: normal 20px "Lucida Sans Unicode", "Lucida Grande", "Arial Unicode MS", sans-serif;',
    'color: black; font-weight: bold;',
    'color: #7A669D; font-weight: lighter;',
    'color: #9F90B9; font-weight: lighter;',
    'color: #7A669D; font-size: 0.8em;', action,
    'color: #7A669D; font-size: 0.8em;', getState()
  ];
}

export default () => {
  return ({ getState }) => next => (action) => {
    let timeStarted = this.timeNow();
    let payload = next(action);
    let duration = this.timeNow(); - timeStarted;
    let logEntries = this.logFormatter({action, getState, timeStarted, duration})
    action.logLevel ? console[action.logLevel](...logEntries) : console.debug(...logEntries);
    return payload;
  }
}
