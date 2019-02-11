import _ from 'lodash';
import uuid from 'uuid';
import Smart from '../Smart';

class CallThrottler extends Smart {

  stack = [];

  match(call) {
    const payload = JSON.stringify(call);
    const match = _.find(this.stack, (item) => (_.isEqual(item.payload, payload)));
    if (match && call.method === 'GET') {
      match.instances += 1;
      return match;
    }
    return false;
  }

  push(request, call) {
    let resolver;
    const id = uuid();
    const instances = 1;
    const payload = JSON.stringify(call);
    const promise = new Promise((resolveCall) => { resolver = resolveCall; });
    this.stack.push({ id, promise, request, resolver, payload, instances });
    return id;
  }

  clear(id) {
    const match = _.find(this.stack, (item) => (item.id === id));
    if (match) {
      match.resolver(true);
      if (match.instances === 1) {
        _.remove(this.stack, (item) => (item.id === id));
      } else {
        match.instances -= 1;
      }
    }
  }

  set(id, data) {
    const match = _.find(this.stack, (item) => (item.id === id));
    if (match) {
      _.extend(match, data);
    }
  }

  find(id) {
    const match = _.find(this.stack, (item) => (item.id === id));
    return match;
  }

}

export default CallThrottler;
