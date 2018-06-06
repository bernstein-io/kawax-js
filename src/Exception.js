import Smart from './Smart';
import log from './helpers/log';

class Exception extends Smart {

  _call(exception) {
    log.error(exception.message);
    return exception;
  }

}

export default Exception.export();
