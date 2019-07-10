import _ from 'lodash';
import Reducer from '../Reducer';

class InternalReducer extends Reducer {

  static initialState = {
    actions: [],
    resources: {},
  };

  logActions(state, action) {
    const { status } = action;
    if (action.id && !action.context.delegate) {
      return [(status === 'success') ? _.omit(action, ['payload']) : action];
    }
  }

  mapResource(state, { payload }) {
    const pageNo = _.get(payload, 'meta.currentPage');
    const search = payload.search && _.snakeCase(payload.search);
    const resourceKey = search ? `${payload.resourceId}/${search}` : payload.resourceId;
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

  state = this.match({
    '.': {
      actions: this.logActions,
    },
    '@@RESOURCE_CALL': {
      resources: this.mapResource,
    },
  });

}

export default InternalReducer;
