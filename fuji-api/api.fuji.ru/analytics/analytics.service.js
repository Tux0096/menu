import axios from 'axios';
import eventEmitter from '../services/EventEmitter.js';

const onOrderCreate = async (order) => {

};
export default () => {
  eventEmitter.on('order:create', onOrderCreate);
};
