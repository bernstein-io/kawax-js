import _ from 'lodash';
import Reducer from '../Reducer';

class InternalReducer extends Reducer {

  static applyEmbeddedReducer = false;

  static initialState = {
    actions: [],
    router: [],
    resources: {},
  };

  logAction(state, {
    id,
    type,
    status,
    origin,
    tracked,
    timestamp,
    class: className,
    context: { props, ...context } = {},
  }) {
    if (id && status && tracked) {
      return [{ id, status, timestamp, className, origin, type, context }];
    }
  }

  clearAction = (state, { payload: origin }) => this.removeItem(
    (action) => (action.origin === origin),
  );

  mapResource(state, { payload }) {
    const pageNo = _.get(payload, 'meta.currentPage');
    const url = payload.url && _.snakeCase(payload.url);
    const sort = payload.sort && _.snakeCase(payload.sort);
    const order = payload.order && _.snakeCase(payload.order);
    const search = payload.search && _.snakeCase(payload.search);
    const resourceMap = _.compact([payload.resourceId, url, sort, order, search]);
    const resourceKey = resourceMap.join('#');
    if (pageNo) {
      return {
        [resourceKey]: {
          actionIds: [payload.actionId],
          totalPages: _.get(payload, 'meta.totalPages'),
          pages: {
            [pageNo]: {
              itemIds: payload.itemIds,
              timestamp: _.get(payload, 'meta.timestamp'),
            },
          },
        },
      };
    }
  }

  routerEvent(state, { payload }) {
    return payload;
  }

  state = this.match({
    '.': {
      actions: this.logAction,
    },
    '@@CLEAR_ACTION': {
      actions: this.clearAction,
    },
    '@@ROUTER_EVENT': {
      router: this.routerEvent,
    },
    '@@RESOURCE_CALL': {
      resources: this.mapResource,
    },
  });

}

export default InternalReducer;
