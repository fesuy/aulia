import { Writable as Stream } from 'stream';

class MessageParser extends Stream {

  /**
   * Constructor
   */
  constructor() {
    super();
    this.state = 'message';
    this.lenbuff_ = Buffer.allocUnsafe(4);
  }

  /**
   * Encode
   * @param  args
   */
  static encode(args) {
    let version = 1;
    let argc = args.length;
    let len = 1;
    let off = 0;

    // data length
    for (let i = 0; i < argc; i++) {
      len += 4 + args[i].length;
    }

    // buffer
    let buf = Buffer.allocUnsafe(len);

    // pack meta
    buf[off++] = version << 4 | argc;

    // pack args
    for (let i = 0; i < argc; i++) {
      let arg = args[i];

      buf.writeUInt32BE(arg.length, off);
      off += 4;

      arg.copy(buf, off);
      off += arg.length;
    }

    return buf;
  }

  /**
   * Decode
   * @param buff
   */
  static decode(buff) {
    let off = 0;

    // unpack meta
    let meta = buff[off++];
    let version = meta >> 4;
    let argv = meta & 0xf;
    let args = new Array(argv);

    // unpack args
    for (let i=0;i<argv;i++) {
      let len = buff.readUInt32BE(off);
      off += 4;

      let arg = buff.slice(off, off += len);
      args[i] = arg;
    }

    return args;
  }

  /**
   * Write Impl
   *
   * @param  chunk
   * @param  _
   * @param  cb
   */
  _write(chunk, _, cb) {

    for (let i=0;i<chunk.length;i++) {

      switch (this.state) {
        case 'message':
          let meta = chunk[i];
          this.version = meta >> 4;
          this.argv = meta & 0xf;
          this.state = 'arglen';
          this._buffs = [Buffer.from([meta])];
          this._nargs = 0;
          this._leni = 0;
          break;

        case 'arglen':
          this.lenbuff_[this._leni++] = chunk[i];

          // done
          if (4 == this._leni) {
            this._arglen = this.lenbuff_.readUInt32BE(0);
            let buff = Buffer.allocUnsafe(4);
            buff[0] = this.lenbuff_[0];
            buff[1] = this.lenbuff_[1];
            buff[2] = this.lenbuff_[2];
            buff[3] = this.lenbuff_[3];
            this._buffs.push(buff);
            this._argcur = 0;
            this.state = 'arg';
          }
          break;

        case 'arg':
          // bytes remaining in the argument
          let rem = this._arglen - this._argcur;

          // consume the chunk we need to complete
          // the argument, or the remainder of the
          // chunk if it's not mixed-boundary
          let pos = Math.min(rem + i, chunk.length);

          // slice arg chunk
          let part = chunk.slice(i, pos);
          this._buffs.push(part);

          // check if we have the complete arg
          this._argcur += pos - i;
          let done = this._argcur == this._arglen;
          i = pos - 1;

          if (done) this._nargs++;

          // no more args
          if (this._nargs == this.argv) {
            this.state = 'message';
            this.emit('data', Buffer.concat(this._buffs));
            break;
          }

          if (done) {
            this.state = 'arglen';
            this._leni = 0;
          } else {
            // bad message
            this.state = 'message';
          }
          break;
      }
    }

    cb();
  }

}

export default MessageParser;
