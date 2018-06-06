/*eslint-disable */

import './tempPolyfills'; // Hack to not have "Warning: React depends on requestAnimationFrame" spammed all over the tests

import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
/* eslint-enable */

configure({ adapter: new Adapter() });
global.__DEV__ = false;

