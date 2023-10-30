import fs from 'fs';
import net from 'net';
import { EventEmitter } from 'events';
import pipe from './pipe.js';

const DEFAULT_OPTIONS = {
  path: '/tmp/aulia-ipc.sock',
  encoding: 'utf8',
};

/**
 * Aulia IPC Class
 * @class
 */
class Aulia extends EventEmitter {

  /**
   * Constructor
   * @param options
   */
  constructor(options) {
    super();
    this.options      = Object.assign(DEFAULT_OPTIONS, options);
    this.options.path = pipe(this.options.path);
    this.server       = void 0; // initialize server

    // Nodemon breaking when socket path exists
    this.cleanUp_();
  }

  /**
   * Try remove socket path
   */
  cleanUp_() {
      try { fs.unlinkSync(this.options.path); } catch(e) { /* nothing */  }
  }

  /**
   * Run IPC Server
   */
  run() {

    const server = net.createServer();

    server.on('error', err => this.emit('error', err));
    server.once('listening', () => this.emit('ready'));

    try {
      server.listen({ path: this.options.path });
    } catch (err) {
      this.emit('error', err);
    }
  }
}

export default Aulia;
