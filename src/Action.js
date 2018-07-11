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

  static export(options, ...args) {
    return (context) => new this({ ...options, ...context }, ...args);
  }

  defaults({ success, error, ...options }) {
    return {
      _successCallback: success,
      _errorCallback: error,
      options,
    };
  }

  parsePayload = (payload) => payload;

  pendingPayload = (data) => {};

  payload = (payload, data) => payload;

  error = (error, data) => ({ message: 'Oops, something went wrong', ...error });

  setStatus = (status) => { this.status = status; };

  export = (action) => action;

  defaultOptions = (options) => options;

  _defaultOptions = (options) => this.defaultOptions({
    delegate: false,
    ...options,
  });

  _export = (payload) => this.export({
    payload: this._parsePayload(payload) || false,
    type: this.constructor.type,
    timestamp: this.timestamp,
    options: this.options,
    status: this.status,
    id: this.id,
  });

  _parsePayload(payload) {
    return resolve.call(this, this.parsePayload, payload);
  }

  _call(...data) {
    this.id = uuid();
    this.timestamp = Date.now();
    return (dispatch, getState) => {
      this._setGetState(getState);
      this._dispatchPending(dispatch, ...data);
      new Promise(async () => { /* eslint-disable-line no-new */
        this._bindActionsCreators(dispatch, getState);
        const payload = await this._processPayload(...data);
        await dispatch(this._export(payload));
        await this._afterDispatch(payload, ...data);
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
          const actionInstance = action({ success, error, delegate: true });
          actionInstance._call(...data)(dispatch, getState);
        });
      }
    });
  }

  async _processPayload(...data) {
    if (typeof this.call === 'function') {
      try {
        const call = await this.call(...data);
        const payload = await resolve(call);
        return await this._processSuccess(payload, ...data);
      } catch (exception) {
        if (exception instanceof Error) log.error(exception);
        const error = (exception instanceof Error) ? {} : exception;
        return this._processError(error, ...data);
      }
    } else if (this.call !== undefined) {
      return this.call;
    }
    return this._processSuccess(...data);
  }

  async _afterDispatch(payload, ...data) {
    if (this.status === 'success') {
      await resolve.call(this, this._successCallback, payload);
      resolve.call(this, this.afterDispatch, payload, ...data);
    } else {
      resolve.call(this, this._errorCallback, payload);
    }
  }

  async _processSuccess(payload, ...data) {
    this.setStatus('success');
    const success = resolve.call(this, this.payload, payload, ...data);
    await resolve.call(this, this._successCallback, payload, ...data);
    return success;
  }

  async _processError(payload, ...data) {
    this.setStatus('error');
    const error = resolve.call(this, this.error, payload, ...data);
    await resolve.call(this, this._errorCallback, error, ...data);
    return error;
  }

  static bind(context) {
    return (...data) => new Promise((success, error) => {
      const { dispatch, getState } = Runtime('store');
      const action = this.export({ success, error, delegate: true, ...context });
      const actionInstance = action();
      actionInstance._call(...data)(dispatch, getState);
    });
  }

}

export default Action;
