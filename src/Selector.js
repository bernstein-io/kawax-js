import { createSelector } from 'reselect';
import Smart from './Smart';
import Runtime from './Runtime';
import select from './helpers/select';

class Selector extends Smart {

  getState = () => {
    const { getState } = Runtime('store');
    return getState();
  };

  select = (...args) => {
    const path = (args.length > 1 ? args : args[0]);
    const { getState } = Runtime('store');
    if (getState) {
      const state = getState();
      return select(state, path);
    }
    return false;
  };

  createSelector = (...options) => createSelector(...options);

}

export default Selector;
