import Smart from './Smart';
import Runtime from './Runtime';
import select from './helpers/select';

class Selector extends Smart {

  createSelector = (path) => (options) => this.select(path);

  select = (path) => {
    const { getState } = Runtime('store');
    const state = getState();
    return select(state, path);
  };

}

export default Selector;
