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

    // Nodemon breaking when socket path exists
    this.cleanUp_();
  }

  /**
   * Remove socket path when already exists
   */
  cleanUp_() {
    if (fs.existsSync(this.options.path)) {
      fs.unlinkSync(this.options.path);
    }
  }

  /**
   * Run IPC Server
   */
  run() {

    const server = net.createServer();

    server.on('error', err => this.emit('error', err));
    server.on('listening', () => this.emit('ready'));

    try {
      server.listen({ path: this.options.path });
    } catch (err) {
      this.emit('error', err);
    }
  }
}

export default Aulia;
