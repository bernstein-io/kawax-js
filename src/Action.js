import _ from 'lodash';
import uuid from 'uuid';
import Smart from './Smart';
import Runtime from './Runtime';
import resolve from './helpers/resolve';
import log from './helpers/log';
import select from './helpers/select';

class Action extends Smart {

  static actionCreators = {};

  static type = '__UNDEFINED__';

  static warnOnClose = false;

  static defaults = (options) => options;

  constructor({ success, error, log: logEnabled, ...options }) {
    super(options);
    this.id = uuid();
    this.onError = error;
    this.onSuccess = success;
    this.log = logEnabled || true;
    this.options = options;
  }

  payload = (payload) => payload;

  pendingPayload = (data) => {};

  successPayload = (success, data) => success;

  errorPayload = (error, data) => error;

  notice = (payload) => false;

  pendingNotice = (data) => false;

  successNotice = (success, data) => false;

  errorNotice = (error, data) => false;

  options = (options) => options;

  setStatus = (status) => { this.status = status; };

  export = (action) => action;

  _export = (payload) => this.export({
    id: this.id,
    status: this.status,
    timestamp: this.timestamp,
    type: this.constructor.type,
    notice: this._parseNotice(payload) || false,
    payload: this._parsePayload(payload) || false,
    options: this.options,
    log: this.log,
  });

  _parseOptions(options) {
    return resolve.call(this, this.options, options);
  }

  _parsePayload(payload) {
    return resolve.call(this, this.payload, payload);
  }

  _parseNotice(payload = {}) {
    if (this.notice === false) return false;
    let notice;
    if (this.status === 'pending') notice = resolve.call(this, this.pendingNotice, payload);
    else if (this.status === 'error') notice = resolve.call(this, this.errorNotice, payload);
    else if (this.status === 'success') notice = resolve.call(this, this.successNotice, payload);
    const finalNotice = resolve.call(this, this.notice, _.isPlainObject(notice) ? notice : payload);
    const defaultMessage = (this.status === 'error')
      ? 'An error has occured' : 'Action successfully processed';
    return !finalNotice && !notice ? false : {
      message: payload.message || defaultMessage,
      ...notice,
      ...finalNotice,
    };
  }

  run(...data) {
    this._setWindowUnloadListener();
    this.timestamp = Date.now();
    return (dispatch, getState) => {
      this._setGetState(getState);
      this._dispatchPending(dispatch, ...data);
      new Promise(async () => { /* eslint-disable-line no-new */
        this._bindActionsCreators(dispatch, getState);
        const payload = await this._processPayload(...data);
        const action = this._export(payload);
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

  _setGetState(getState) {
    this.getState = (...args) => {
      const path = (args.length > 1 ? args : args[0]);
      const state = getState();
      return select(state, path);
    };
  }

  _dispatchPending(dispatch, ...data) {
    this.setStatus('pending');
    const pendingPayload = resolve.call(this, this.pendingPayload, ...data);
    dispatch(this._export(pendingPayload));
  }

  _bindActionsCreators(dispatch, getState) {
    const actionCreators = this.constructor.actionCreators;
    _.each(actionCreators, (action, key) => {
      if (typeof action === 'function') {
        this[key] = (...data) => new Promise((success, error) => {
          const actionInstance = action({
            success: success,
            error: error,
            delegate: true,
          });
          actionInstance.run(...data)(dispatch, getState);
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
        return resolve.call(this, this.successPayload, payload, ...data);
      } catch (exception) {
        if (exception instanceof Error) log.error(exception);
        const payload = (exception instanceof Error) ? {} : exception;
        this.setStatus('error');
        return resolve.call(this, this.errorPayload, payload, ...data);
      }
    } else if (this.call !== undefined) {
      return this.call;
    }
    return this._processSuccess(...data);
  }

  async _processSuccess(payload, ...data) {
    this.setStatus('success');
    return resolve.call(this, this.successPayload, payload, ...data);
  }

  async _processError(payload, ...data) {
    this.setStatus('error');
    return resolve.call(this, this.errorPayload, payload, ...data);
  }

  async _afterDispatch(payload, ...data) {
    if (this.status === 'success') {
      await resolve.call(this, this.afterDispatch, payload, ...data);
    }
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
    return (...data) => new Promise((success, error) => {
      const { dispatch, getState } = Runtime('store');
      const action = new this({
        success: success,
        error: error,
        delegate: true,
        ...context,
      });
      action.run(...data)(dispatch, getState);
    });
  }

}

export default Action;
