import fs from 'fs';
import net from 'net';
import pipe from './pipe.js';
import { EventEmitter } from 'events';

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
    options = options || {};

    this.options      = {
      path: pipe(options.path || DEFAULT_OPTIONS.path),
      encoding: options.encoding || DEFAULT_OPTIONS.encoding,
    };
    this.server       = net.createServer();
  }

  serverError_(err) {
    if (err.code == 'EADDRINUSE') {
      // Unix file socket and error EADDRINUSE is the case if
      // the file socket exists. We check if other processes
      // listen on file socket, otherwise it is a stale socket
      // that we could reopen
      // We try to connect to socket via plain network socket
      let s = new net.Socket();

      s.on('error', err2 => {
        if (err2.code == 'ECONNREFUSED') {
          // No other server listening, so we can delete stale
          // socket file and reopen server socket
          fs.unlinkSync(this.options.path);
          this.server.listen({ path: this.options.path });
        }
      });

      s.connect({ path: this.options.path}, () => {
        // Connection is possible, so other server is listening
        // on this file socket
        throw err;
      });
    }
  }

  /**
   * Start IPC Server
   */
  start() {

    this.server.on('error', this.serverError_.bind(this));
    this.server.on('listening', () => this.emit('ready'));

    this.server.listen({ path: this.options.path });
  }

}

export default Aulia;
