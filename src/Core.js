import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import Smart from './Smart';
import Store from './Store';
import Router from './instance/Router';
import Context from './instance/Context';
import { setRuntime } from './instance/Runtime';

class Core extends Smart {

  static defaults = (options) => setRuntime({
    ...options,
    context: options.context || Context,
    name: options.name || 'App',
    history: options.history || undefined,
    historyHook: options.historyHook || undefined,
    htmlRoot: options.htmlRoot || false,
    reducer: options.reducer || ((state) => state),
    root: options.root || (() => React.createElement('div', null, 'It works!')),
    router: options.router || Router,
    store: new Store({
      name: options.name,
      reducer: options.reducer,
      customMiddlewares: options.customMiddlewares,
    }),
    withRouter: options.withRouter !== false,
  });

  initialize(env) {
    const htmlRoot = document.getElementById(this.htmlRoot) || document.body;
    const ReactContext = this._providerRenderer();
    render(ReactContext, htmlRoot);
  }

  _providerRenderer() {
    return (
      <Provider store={this.store.internal}>
        <Provider store={this.store}>
          {this._routerRenderer()}
        </Provider>
      </Provider>
    );
  }

  _routerRenderer() {
    const ReactRouter = this.router;
    if (this.withRouter === true) {
      return (
        <ReactRouter history={this.history} historyHook={this.historyHook}>
          {React.createElement(this.root)}
        </ReactRouter>
      );
    }
    return React.createElement(this.root);
  }

}

export default Core;
