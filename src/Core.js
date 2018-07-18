import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import Smart from './Smart';
import Store from './Store';
import Router from './Router';
import { setRuntime } from './Runtime';

class Core extends Smart {

  static new(options) {
    return new this(options);
  }

  defaults(options) {
    return setRuntime({
      ...options,
      htmlRoot: options.htmlRoot || false,
      router: options.router || Router,
      withRouter: options.withRouter !== false,
      history: options.history || undefined,
      historyHook: options.historyHook || undefined,
      reducer: options.reducer || ((state) => state),
      container: options.container || (() => (
        <div>
It works!
        </div>
      )),
      context: options.context || React.createContext({}),
      store: new Store({ reducer: options.reducer }),
    });
  }

  initialize(env) {
    const htmlRoot = document.getElementById(this.htmlRoot) || document.body;
    const ReactContext = this._contextRenderer();
    render(ReactContext, htmlRoot);
  }

  _wrapContext(children) {
    const Context = this.context;
    return (
      <Context.Provider>
        {children()}
      </Context.Provider>
    );
  }

  _wrapRouter(children) {
    const ReactRouter = this.router;
    if (this.withRouter === true) {
      return (
        <ReactRouter history={this.history} historyHook={this.historyHook}>
          {children()}
        </ReactRouter>
      );
    }
    return children();
  }

  _renderContainer() {
    const Container = this.container;
    return <Container />;
  }

  _contextRenderer() {
    return (
      <Provider store={this.store}>
        {
          this._wrapContext(() => this._wrapRouter(() => this._renderContainer()))
        }
      </Provider>
    );
  }

}

export default Core;
