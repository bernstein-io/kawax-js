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
    if (pageNo) {
      return {
        [payload.resourceId]: {
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
