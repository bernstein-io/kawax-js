import _ from 'lodash';
import Redux from 'redux';
import reduxThunk from 'redux-thunk';
import SmartClass from 'smart-class';
import {applyMiddleware, createStore, compose, composeEnhancers} from 'redux';
import ReduxLogger from './misc/redux_logger';

const DEVTOOLS = global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;

export class Store extends SmartClass {

  required = ['root'];

  defaultProps(props) {
    console.warn('defaultProps! (kawax)', this)
    return {
      root: props.root || this.logger.warn('store','missing `root` property')
    }
  }

  getEnhancers() {
    let middlewares = [reduxThunk];
    if (this.props.env == 'production') {
      return applyMiddleware(...middlewares);
    } else {
      middlewares.push(ReduxLogger);
      let composer = DEVTOOLS || compose;
      return composer(applyMiddleware(...middlewares));
    }
  }

  start(options) {
    let enhancers = this.getEnhancers();
    let root = this.props.root;
    let rootReducer = root.export({});
    let reduxStore = createStore(rootReducer, enhancers);
    return this.extend(reduxStore);
  }
}

export default Store;
