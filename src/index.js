import fs from 'fs';
import net from 'net';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import pipe from './pipe.js';
import MessageParser from './message-parser.js';

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
    this.server       = net.createServer(this.socketHandler_.bind(this));
    this.connections  = [];
  }

  /**
   * Add socket into connection list
   * @param {net.Socket} socket
   */
  addConnection_(socket) {
    let msgParser = new MessageParser;
    this.connections.push(socket);
    socket.pipe(msgParser);
    msgParser.on('data', this.socketMsg_(socket));
  }

  /**
   * Remove socket connection from list
   * @param {net.Socket} socket
   */
  removeConnection_(socket) {
    let i = this.connections.indexOf(socket);
    if (!~i) return;
    this.connections.splice(i, 1);
  }

  /**
   * Socket connection handler
   * @param {net.Socket} socket
   */
  socketHandler_(socket) {
    socket.id = crypto.randomUUID();
    this.addConnection_(socket);
    this.sockError_(socket);
    this.emit('connected', socket);
    socket.on('close', () => {
      this.emit('disconnected', socket);
      this.removeConnection_(socket);
    });
  }

  /**
   * Socket message handler
   * @param {net.Socket} socket
   */
  socketMsg_(socket) {
    return buf => {

      if (Buffer.isBuffer(buf)) {
        let msg = MessageParser.decode(buf);

        // Skip if that is not an array
        if (!Array.isArray(msg)) return;

        for (let k in msg) {
          // normalize k to int
          k = parseInt(k);

          // Skip if that is not buffer
          if (!Buffer.isBuffer(msg[k])) return;

          switch(k) {
            case 0:
              msg[0] = msg[0].toString();
              break;
            case 1:
              try {
                msg[1] = JSON.parse(msg[1].toString());
              } catch (err) { /* nothing to do */ }

              break;
          }
        }

        this.emit('message', msg);
      }
    }
  }

  /**
   * Socket error handler
   * @param socket
   */
  sockError_(socket) {
    socket.on('error', err => {
      this.emit('conn_error', err);
      this.removeConnection_(socket);
    });
  }

  /**
   * Server error handler
   * @param err
   */
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
