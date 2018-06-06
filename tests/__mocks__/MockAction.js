import Action from '../../src/Action';

class MockAction extends Action {

  static type = 'TEST';
  call = (data, options) => data;
  payload = (payload, data) => ({
    foo: 'bar',
  });
  pendingPayload = (data) => ({
    bar: 'foo',
  });

}

export default MockAction;
