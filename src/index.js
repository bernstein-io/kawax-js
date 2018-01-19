import Store from './store';
import Action from './actions';
import Reducer from './reducers';
import Component from './components';
import Container from './containers';
import Factory from './factories';
import Resource from './resources';
import {Constants} from './misc';

const Kawax = {Store, Reducer, Resource, Action, Factory, Component, Container, Constants};

export default Kawax;
module.exports = Kawax;
