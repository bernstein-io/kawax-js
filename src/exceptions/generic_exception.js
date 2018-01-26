import SmartClass from 'smart-class';
import _ from 'lodash';
import uuid from  'uuid';

export default class BaseException extends SmartClass {

  static levels = {
    SILENT: 0,
    LOG: 1,
    WARN: 2,
    ERROR: 3
  }

  export() {
    let state = this.state.toObject();
    return `id: ${state.id}\n` +
          ` code: ${state.code}\n` +
          ` error: ${state.error}\n` +
          ` stack: [${state.stack}]`;
  }

  defaultProps(props) {
    return {
      isCli: !(this.window === this),
      level: 'warn',
      silent: false
    }
  }

  defaultState() {
    return {
      id: uuid(),
      level: this.getLevel(),
      code : this.getCode(),
      error: this.getError(),
      message: this.getMessage(),
      stack: []
    }
  }

  initialize(exception = {}) {
    this.extend(new Error());
    let writter = console;
    let headers = this.getHeaders();
    let level = this.getLevel();
    let isSilent = this.props.silent;
    this.pushStack();
    if (!isSilent && process.env.NODE_ENV != 'production') {
      if (level == 'log') {
        writter.log(...headers, this.export());
      } else if (level == 'warn') {
        writter.warn(...headers, this.export());
      } else if (level == 'error') {
        writter.error(...headers, this.export());
      }
    }
  }

  pushStack() {
    let exception = _.clone(this.getError());
    if (exception && exception.error) {
      if (exception.error instanceof BaseException) exception.error.stack = false;
      this.stack = [exception.error, ...(exception.stack ? exception.stack : [])];
    }
  }

  getError() {
    if (this.props.error) {
      return this.props.error;
    } else {
      return false;
    }
  }

  getLevel() {
    let level = 0;
    let error = this.getError();
    let rank = this.__getLevelRank(this.props.level);
    let silentProp = this.props.silent;
    let isSilent = silentProp ? true : ((rank <= level) ? false : true);
    if(isSilent) return this.props.level;
    if(error && error.level) return error.level;
    return 'default';
  }

  getCode() {
    let error = this.getError();
    if(this.props.code) return this.props.code;
    if(error && error.code) return error.code;
    if(error && error.statusCode) return error.statusCode;
    return false;
  }

  getHeaders() {
    if (this.headers) return this.headers;
    let isCli = this.props.isCli;
    let code = this.getCode();
    let message = this.getMessage();
    let nativeMessage = this.getNativeMessage();
    let style = "font-weight: bold; color: black;";
    return [
      (isCli ? "" : "%c") +
      "Exception: " + (code != 0 ? code + " - ": "") + message +
      (nativeMessage ? " (" + nativeMessage + ")": ""),
      (isCli ? "" : style),
      (isCli ? "\n" : "")
    ]
  }

  getMessage() {
    let error = this.getError();
    if (this.props.message) return this.props.message;
    if (error && error.name) return error.name;
    if (error && error.message && error.message.length < 300) {
      return error.message;
    }
    return 'An error has occured';
  }

  getNativeMessage() {
    let error = this.getError();
    let message = this.getMessage();
    let nativeMessage = error ? error.message : null;
    if (nativeMessage && nativeMessage != message) {
      if (nativeMessage.length < 300) {
        return nativeMessage;
      } else {
        return _.truncate(nativeMessage, {length: 300});
      }
    } else {
      return null;
    }
  }

  __getLevelRank(level) {
    switch(level) {
      case 'silent': return 0;
      case 'error': return 1;
      case 'warn': return 2;
      case 'log': return 3;
      default: return 3;
    }
  }

  static __formatProps(exception, options = {}) {
    switch(true) {
      case (exception instanceof Error):
        return {error: exception, ...options};
      case (_.isString(exception)):
        return {message: exception, ...options};
      default:
        return {...exception, ...options};
    }
  }

  static log(exception, options) {
    let props = this.__formatProps(exception, {...options, level: 'log'});
    return this.new(props);
  }

  static warn(exception, options) {
    let props = this.__formatProps(exception, {...options, level: 'warn'});
    return this.new(props);
  }

  static error(exception, options) {
    let props = this.__formatProps(exception, {...options, level: 'error'});
    return this.new(props);
  }

  static silent(exception, options) {
    let props = this.__formatProps(exception, {...options, silent: true});
    return this.new(props);
  }

}
