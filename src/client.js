import net from 'net';
import { EventEmitter } from 'events';
import MessageParser from './message-parser.js';

// Socket default options
const DEFAULT_OPTIONS = {
  path: '/tmp/aulia-ipc.sock',
  encoding: 'utf8',
};

/**
 * Aulia Client class
 * @class
 */
class Client extends EventEmitter {

  constructor(options) {
    super();
    this.options    = Object.assign(DEFAULT_OPTIONS, options);
    this.socket     = new net.Socket();
    this.connected  = false;
  }

  connect() {
    this.socket.setNoDelay();
    this.socket.on('error', err => this.emit('error', err));
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connected');
    });

    this.socket.connect(this.options);
  }

  sendTo(scope, msg) {
    scope = Buffer.from(scope);
    msg = Buffer.from(msg);

    let encoded = MessageParser.encode([scope, msg]);
    this.socket.write(encoded);
  }

}

export default Client;
