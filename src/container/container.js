import Component from './component';
import {connect} from 'react-redux';

export default class Container extends Component {

  static connect(mapStateToProps, mapDispatchToProps, mergeProps, options) {
    return connect(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options
    )(this);
  }

}
