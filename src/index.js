import fs from 'fs';
import pipe from './pipe.js';

const DEFAULT_OPTIONS = {
  path: '/tmp/aulia-ipc.sock',
  encoding: 'utf8',
};

/**
 * Aulia IPC Class
 * @class
 */
class Aulia {

  /**
   * Constructor
   * @param options
   */
  constructor(options) {
    this.options      = Object.assign(DEFAULT_OPTIONS, options);
    this.options.path = pipe(this.options.path);

    // Nodemon breaking the exists socket path
    // so annoying
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
}

export default Aulia;
