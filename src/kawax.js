import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import SmartClass from 'smart-class';

// import Config from 'src/config';
// import Session from 'src/session';
// import Store from 'src/store';
// import Router from 'src/router';
// import RootContainer from 'src/containers/root_container';
// import idleTimer from 'idle-timer';
// import SmartClass from 'smart-class';
// import {LEVELS, Exception} from 'lib/exception';
// import bowser from 'bowser';

import Action from './actions';
import Component from './components';
import Constant from './misc/constant';
import Container from './containers';
import Factory from './factories';
import Reducer from './reducers';
import Resource from './resources';
import Store from './store';

class Kawax extends SmartClass {

  defaults() {
    return {
      action: Action,
      component: Component,
      constant: Constant,
      container: Container,
      factory: Factory,
      reducer: Reducer,
      resource: Resource,
      store: Store
    }
  }

  defaultProps() {
    return { };
  }

  initialize(...args) {
    return this;
  }

  configure(config) {
    this.setState(config);
  }

  static browserSupport() {
    if (this.state.browserSupport) {
      let strict = true;
      let supportedBrowser = this.state.config.supportedBrowsers;
      let unsupported = bowser.isUnsupportedBrowser(supportedBrowser, strict);
      return !unsupported && !bowser.mobile && !bowser.tablet;
    }
    return true;
  }

  static start(options) {
    let support = this.browserSupport();
    if (support == true) {
      let application = this.new(options);
      return application;
    } else {
      global.location = 'http://www.bernstein.io/'
    }
  }

}

export default Kawax.new();


// export default Kawax.new();

// class Save {

//   defaults() {
//     return {
//       Store:
//     }
//   }

//   initialize(options) {
//     global.env = process.env.NODE_ENV;
//     Session.setAll(options);
//     Store.start();
//     this.setIdleTimeout();
//     this.render();
//   }

//   wrapper() {
//     return(
//       <Provider store={Store}>
//         <Router basename={Config.get('router.basePath')}>
//           <RootContainer />
//         </Router>
//       </Provider>
//     )
//   }

//   setIdleTimeout() {
//     if (!(global.__BERNSTEIN_IDLE_TIMEOUT__ === false)) {
//       idleTimer({
//         idleTime: global.__IDLE_TIME__ || 600000,
//         callback: () => {
//           Session.kill();
//         }
//       });
//     }
//   }

//   render() {
//     ReactDOM.render(this.wrapper(), document.getElementById('application'));
//   }



//   static start(options) {
//     let support = this.browserSupport();
//     if (support == true) {
//       let application = this.new(options);
//       return application;
//     } else {
//       global.location = 'http://www.bernstein.io/'
//     }
//   }

// }
