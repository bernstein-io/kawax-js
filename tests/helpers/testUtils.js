import _ from 'lodash';
import { BrowserRouter } from 'react-router-dom';

/**
 * Given an Enzyme ShallowWrapper and component identifier, dives() down until the
 * specified component is the root component.
 *
 * @param { Enzyme.ShallowWrapper } shallowWrapper - wrapper to dive into
 * @param { string } name of wrapper to dive for.
 * @param { object= } options to pass to dive()
 */
function diveTo(shallowWrapper, identifier, options = { context: {} }) {
  const element = shallowWrapper.getElement();
  if (!(element && element.type)) {
    throw new Error(`Failed to dive to ${identifier} - is it not in the component tree?`);
  }
  const instance = shallowWrapper.instance();

  if (shallowWrapper.name() === identifier) {
    return shallowWrapper; // We found it!
  }

  // Enzyme limitation workaround: until https://github.com/airbnb/enzyme/issues/664 is resolved,
  // it's necessary to manually pass down child context like this
  const context = _.extend(
    {}, instance && instance.getChildContext ? instance.getChildContext() : {},
    options.context,
  );

  return diveTo(shallowWrapper.dive({ context }), identifier, { context });
}

const createRouterContext = (otherContext) => {
  const router = {
    history: new BrowserRouter().history,
    route: {
      location: {},
      match: {},
    },
  };
  return { context: { ...otherContext, router } };
};

export { diveTo, createRouterContext };
