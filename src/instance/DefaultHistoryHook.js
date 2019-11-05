import Action from '../Action';

class HistoryEventAction extends Action {

  static type = 'ROUTER.EVENT';

  call = async (payload) => payload;

}

export default HistoryEventAction;
