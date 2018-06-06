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
      history: options.history || undefined,
      historyAction: options.historyAction || undefined,
      reducer: options.reducer || ((state) => state),
      container: options.container || (() => <div>It works!</div>),
      store: new Store({ reducer: options.reducer })
    });
  }

  initialize(env) {
    const htmlRoot = document.getElementById(this.htmlRoot) || document.body;
    const ReactRouter = this.router;
    const Container = this.container;
    const ReactContext = this._contextRenderer(Container, ReactRouter);
    render(ReactContext, htmlRoot);
  }

  _contextRenderer(Container, ReactRouter) {
    return (
      <Provider store={this.store}>
        <ReactRouter history={this.history} historyAction={this.historyAction}>
          <Container />
        </ReactRouter>
      </Provider>
    );
  }

}

export default Core;
