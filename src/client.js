import net from 'net';
import { EventEmitter } from 'events';
import MessageParser from './message-parser.js';

// Socket default options
const DEFAULT_OPTIONS = {
  path: '/tmp/aulia-ipc.sock',
  encoding: 'utf8',
};

const RETRY_TIMEOUT = 1000;
const MAX_TIMEOUT   = 1000 * 60; // 1 Minutes

/**
 * Aulia Client class
 * @class
 */
class Client extends EventEmitter {

  /**
   * Constructor
   * @param options
   */
  constructor(options) {
    super();
    options             = options || {};
    this.path           = options.path || DEFAULT_OPTIONS.path;
    this.encoding       = options.encoding || DEFAULT_OPTIONS.encoding;
    this.retryCount     = 1;
    this.socket         = new net.Socket();

    this.socket.setNoDelay();
  }

  /**
   * Connect to IPC Server
   */
  connect() {
    this.socket.setNoDelay();
    this.socket.on('error', err => this.socketDisconnect_.bind(this));
    this.socket.on('connect', () => {
      this.retryCount = 1;
      this.emit('ready')
    });
    this.socket.on('close', this.socketDisconnect_.bind(this));

    this.socket.connect({ path: this.path });
  }

  /**
   * Send payload into scoped
   * @param scope
   * @param msg
   */
  sendTo(scope, msg) {
    scope = Buffer.from(scope);
    msg = Buffer.from(JSON.stringify(msg));
    let encoded = MessageParser.encode([scope, msg]);
    this.socket.write(encoded);
  }

  /**
   * Socket disconnect handler
   * automatically reconnect after disconnect
   * or error
   */
  socketDisconnect_() {
    let ms = Math.min(RETRY_TIMEOUT * this.retryCount, MAX_TIMEOUT);

    setTimeout(() => {
      this.socket.destroy();
      this.retryCount++;

      this.socket.connect({ path: this.path });
    }, ms);
  }

}

export default Client;
