import Action from '../Action';

class HistoryHook extends Action {

  static type = '@@ROUTER_EVENT';

  // static actionCreators = function bindedActions() {
  //   return {
  //     hook: this.customHistoryHook,
  //   };
  // };

  call = async ({ location, action }) => ({ location, action });

  // beforeDispatch = ({ location, action }) => this.hook({ location, action });

}

export default HistoryHook;
