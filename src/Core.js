import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import Smart from './Smart';
import Store from './Store';
import Router from './Router';
import { setRuntime } from './Runtime';

class Core extends Smart {

  static defaults = (options) => setRuntime({
    ...options,
    htmlRoot: options.htmlRoot || false,
    router: options.router || Router,
    withRouter: options.withRouter !== false,
    history: options.history || undefined,
    historyHook: options.historyHook || undefined,
    reducer: options.reducer || ((state) => state),
    container: options.container || (() => (<div>It works!</div>)),
    context: options.context || React.createContext({}),
    store: new Store({ reducer: options.reducer }),
  });

  initialize(env) {
    const htmlRoot = document.getElementById(this.htmlRoot) || document.body;
    const ReactContext = this._providerRenderer();
    render(ReactContext, htmlRoot);
  }

  _providerRenderer() {
    return (
      <Provider store={this.store}>
        {this._contextRenderer()}
      </Provider>
    );
  }

  _contextRenderer(children) {
    const Context = this.context;
    return (
      <Context.Provider>
        {this._routerRenderer()}
      </Context.Provider>
    );
  }

  _routerRenderer() {
    const ReactRouter = this.router;
    if (this.withRouter === true) {
      return (
        <ReactRouter history={this.history} historyHook={this.historyHook}>
          {React.createElement(this.container)}
        </ReactRouter>
      );
    }
    return React.createElement(this.container);
  }

}

export default Core;
