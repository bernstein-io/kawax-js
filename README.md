Kawax: (React + Redux) on steroids 🚀
=======

[![npm](https://img.shields.io/npm/v/kawax-js.svg?style=flat-square)](https://www.npmjs.com/package/kawax-js)

Kawax is a complete framework build around React and Redux.

## Install

`npm install kawax-js`

## Documentation

### # Resources

```
  import { Resource } from 'kawax-js' ;

  class TodoResource extends Resource {

    getItem = this.define({
      method: "GET",
      path: (todoId) => `/todos/${todoId}`
    });
  }

  export default TodoResource.export();
```

All options:

```
  {
    schema: resolver('schema') || {},
    mock: resolver('mock', false) || false,
    path: resolver('path', false),
    baseUri: resolver('baseUri', false),
    method: resolver('method') || 'GET',
    paginate: resolver('paginate') || false,
    allowCors: resolver('allowCors') || false,
    credentials: resolver('credentials') || 'same-origin',
    reader: resolver('reader') || 'json',
    headers: resolver('headers', false),
    collection: resolver('collection') || false,
    entityParser: resolver('entityParser', false) || false,
    payloadParser: resolver('payloadParser', false) || false,
    errorParser: resolver('errorParser', false) || ((payload) => payload),
    responseParser: resolver('responseParser', false) || ((response, body) => body),
    requestTransform: resolver('requestTransform') === false ? false : _.snakeCase,
    responseTransform: resolver('responseTransform') === false ? false : _.camelCase,
    resourceClass: this.constructor.name || 'Resource',
    onSuccess: resolver('onSuccess', false) || false,
    onError: resolver('onError', false) || false,
    hook: resolver('hook', false) || false,
  }
```

### # Actions

```
  import { Action } from 'kawax-js';

  class AddTodo extends Action {

    static type = "ADD_TODO";

    call = async (todoContent = "Some stuff to do") => {
      return {
        id: 1,
        text: todoContent
      };
    }
  }
```

Running the action above will dispatch the following payload:

```
{
  class: "AddTodo"
  context: {}
  id: "769a056b-1193-4960-a791-a65edcf33ed0" // random uuid
  log: true
  notice: false
  payload: { id: 1, text: "Some stuff to do" }
  status: "success"
  timestamp: 1551449632049
  type: "ADD_TODO"
}
```

#### Methods

##### async call(...args)

```
  async call(...input) {
    const payload = "My action payload";
    return payload;
  }
```

##### pendingPayload = (...input) => (payload)

##### successPayload = (...input) => (payload)

##### errorPayload = (...input) => (payload)

##### payload = (...input) => (payload)

##### beforeDispatch = (...input) => (payload)

##### afterDispatch = (...input) => (payload)

##### beforeRescue = (...input) => (payload)

##### afterRescue = (...input) => (payload)

##### pendingNotice = (...input) => (payload)

##### successNotice = (...input) => (payload)

##### errorNotice = (...input) => (payload)

##### notice = (...input) => (payload)

##### setContext({ ...context })

##### setStatus({ ...context })

##### export(action)

### # Reducer

```
import { Reducer } from 'kawax-js';

class RootReducer extends Reducer {

  static initialState = {
    todos: []
  };

  setAllTodos = (state, { payload }) => payload;

  setOneTodo = (state, { payload }) => [payload];

  state = this.match({
    ADD_TODO: {
      todos: this.setOneTodo,
    },
    FETCH_ALL: {
      todos: this.setAllTodos
    }
  });

}

export default RootReducer;
```

#### Methods

##### call(state, action)

##### match(map)

##### matchPending(map)

##### matchSuccess(map)

##### matchError(map)

##### matchOn(statuses)

##### shallow(nextState, depth)

##### forceAssign(predicate)

##### removeItem(predicate)

### # Components

```
  import { Component } from 'kawax-js' ;

  class TodosView extends React.Component {
     static css = {
       p: {
         fontWeight: 'bold',
       }
     };

     render () {
       const { todos } = this.props;
       return (
         <div>
           <p>Todos:</p>
           <ul>
             {_.map(todos, (todo) => (
               <li key={todo.id}>{todo.text}</li>
             ))}
          </ul>
        </div>
      );
    }
  }

  export default Component(TodosView);
```

#### Methods

##### css({ state, ownProps, select })
```
  static css = (props) => ({
    //...stylesheet
  });
```

### # Containers

```
  import { Container } from 'kawax-js' ;

  class Todos extends React.Component {
    render () {
      return (
        <div>
          Todos:
          <TodosView />
        </div>
      );
    }
  }

  export default Container(Todos);
```

#### Methods

##### stateToProps({ state, ownProps, select })
```
  static stateToProps = ({ select }) => ({
    todos: select('todos')
  });
```

##### dispatchToProps({ dispatch, ownProps })
```
  static dispatchToProps = () => ({
    add: AddAction.build(),
    remove: RemoveAction.build()
  });
```

##### propsToContext({ ownProps, select })
```
  static propsToContext = () => ({
    todos: ownProps.todos
  });
```

### # App

```
import Kawax from 'kawax-js';

window.onload = () => {
  Kawax.new({
    htmlRoot: 'app',
    container: Todos,
    reducer: RootReducer.export(),
    historyHook: Navigate.build(), // optional
  });
};

```


## Experimental package
Kawax API is still undergoing active development ; For that reason, we try to, but do not always follow the common versionning scheme. Use it at your own risk.

## License
[MIT](LICENSE.md)
