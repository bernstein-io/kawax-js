import _ from 'lodash';
import uuid from 'uuid';
import Smart from './Smart';
import Runtime from './Runtime';
import resolve from './helpers/resolve';
import select from './helpers/select';
import Log from './helpers/log';

class Action extends Smart {

  static actionCreators = {};

  static type = '__UNDEFINED__';

  static warnOnClose = false;

  static defaults = (defaults) => defaults;

  constructor({ success, error, log, ...context }) {
    super(context);
    this.id = uuid();
    this.onError = error;
    this.onSuccess = success;
    this.log = log || true;
    this.context = context;
  }

  pendingPayload = (data) => {};

  successPayload = (data) => (success) => success;

  errorPayload = (data) => (error) => error;

  payload = (data) => (payload) => payload;

  pendingNotice = (data) => false;

  successNotice = (data) => (success) => false;

  errorNotice = (data) => (error) => false;

  notice = (data) => (payload) => false;

  setStatus = (status) => { this.status = status; };

  export = (action) => action;

  _export = (payload, ...data) => {
    const parsedPayload = this._parsePayload(payload, ...data);
    return this.export({
      id: this.id,
      log: this.log,
      payload: parsedPayload,
      status: this.status,
      timestamp: this.timestamp,
      type: this.static.type,
      class: this.constructor.name,
      notice: this._parseNotice(parsedPayload, ...data) || false,
      context: this._parseContext(parsedPayload, ...data) || false,
    });
  };

  _resolve = (callback, payload, ...data) => {
    const shallow = resolve.call(this, callback, ...data);
    return resolve.call(this, shallow, payload);
  };

  _parseContext(payload = {}, ...data) {
    const defaultContext = this._resolve(this.defaultContext, payload, ...data) || {};
    return _.isPlainObject(this.context) ? { ...defaultContext, ...this.context } : defaultContext;
  }

  _parsePayload(payload, ...data) {
    return this._resolve(this.payload, payload, ...data) || false;
  }

  _parseNotice(payload = {}, ...data) {
    let notice;
    if (this.status === 'pending') notice = this._resolve(this.pendingNotice, payload, ...data);
    else if (this.status === 'error') notice = this._resolve(this.errorNotice, payload, ...data);
    else if (this.status === 'success') notice = this._resolve(this.successNotice, payload, ...data);
    const finalNotice = this._resolve(this.notice, notice, ...data);
    const defaultMessage = (this.status === 'error') ? 'An error has occured.' : String();
    return !notice && !finalNotice ? false : {
      message: payload.message || defaultMessage,
      ...notice,
      ...finalNotice,
    };
  }

  run(...data) {
    this._setWindowUnloadListener();
    this.timestamp = Date.now();
    return (dispatch, getState) => {
      this._getState = getState;
      this._dispatch = dispatch;
      this._defineGetState();
      this._defineSetContext(...data);
      this._dispatchPending(...data);
      new Promise(async () => { /* eslint-disable-line no-new */
        this._bindActionsCreators();
        const payload = await this._processPayload(...data);
        const action = this._export(payload, ...data);
        await this._beforeDispatch(payload, ...data);
        await dispatch(action);
        if (this.status === 'success') {
          await resolve.call(this, this.onSuccess, payload, ...data);
        } else {
          await resolve.call(this, this.onError, payload, ...data);
        }
        await this._afterDispatch(payload, ...data);
        this._removeWindowUnloadListener();
      });
      return this.id;
    };
  }

  _defineSetContext = (...data) => {
    this.setContext = async (context = {}) => {
      _.extend(this.context, context);
      const action = this._export({}, ...data);
      return this._dispatch(action);
    };
  };

  _defineGetState() {
    this.getState = (...args) => {
      const path = (args.length > 1 ? args : args[0]);
      const state = this._getState();
      return select(state, path);
    };
  }

  _dispatchPending(...data) {
    this.setStatus('pending');
    const pendingPayload = this._resolve(this.pendingPayload, {}, ...data);
    const action = this._export(pendingPayload, ...data);
    this._dispatch(action);
  }

  _bindActionsCreators() {
    const actionCreators = this.constructor.actionCreators;
    _.each(actionCreators, (action, key) => {
      if (typeof action === 'function') {
        this[key] = (...data) => new Promise(async (success, error) => {
          const actionInstance = action({
            success: success,
            error: error,
            delegate: true,
          });
          await actionInstance._setState(...data);
          actionInstance.run(...data)(this._dispatch, this._getState);
        });
      }
    });
  }

  async _processPayload(...data) {
    if (typeof this.call === 'function') {
      try {
        const call = await this.call(...data);
        const payload = await resolve(call);
        this.setStatus('success');
        return this._resolve(this.successPayload, payload, ...data);
      } catch (exception) {
        if (exception instanceof Error) Log.error(exception);
        this.setStatus('error');
        return this._resolve(this.errorPayload, exception, ...data);
      }
    } else if (this.call !== undefined) {
      return this.call;
    }
    return this._processSuccess(data);
  }

  async _processSuccess(payload, data) {
    this.setStatus('success');
    return this._resolve(this.successPayload, payload, ...data);
  }

  async _processError(payload, ...data) {
    this.setStatus('error');
    return this._resolve(this.errorPayload, payload, ...data);
  }

  async _beforeDispatch(payload, ...data) {
    if (this.status === 'success') {
      await this._resolve(this.beforeDispatch, payload, ...data);
    } else if (this.status === 'error') {
      await this._resolve(this.beforeRescue, payload, ...data);
    }
  }

  async _afterDispatch(payload, ...data) {
    if (this.status === 'success') {
      await this._resolve(this.afterDispatch, payload, ...data);
    } else if (this.status === 'error') {
      await this._resolve(this.afterRescue, payload, ...data);
    }
  }

  async _setState(...args) {
    this.state = await resolve.call(this, this.state, ...args);
  }

  _setWindowUnloadListener() {
    if (this.constructor.warnOnClose) {
      window.addEventListener('beforeunload', this._handleWindowUnloadEvent);
    }
  }

  _removeWindowUnloadListener() {
    if (this.constructor.warnOnClose) {
      window.removeEventListener('beforeunload', this._handleWindowUnloadEvent);
    }
  }

  _handleWindowUnloadEvent(event) {
    const dialogText = 'Warning ! Changes you have made may not be saved if you leave this page.';
    event.returnValue = dialogText;
    return dialogText;
  }

  static bind(context) {
    return (...data) => new Promise(async (success, error) => {
      const { dispatch, getState } = Runtime('store');
      const action = new this({
        success: success,
        error: error,
        delegate: true,
        ...context,
      });
      await action._setState(...data);
      action.run(...data)(dispatch, getState);
    });
  }

}

export default Action;
