/*eslint no-console: 0*/

define((require, exports, module) => {
  'use strict';

  const packageInfo = JSON.parse(require('text!../../package.json'));

  const Logger = class {
    constructor() {
      this.prefix = `[${packageInfo.name}] `;
    }

    log(...args) {
      console.log(this.prefix + args.join(' '));
    }

    error(...args) {
      console.error(this.prefix + args.join(' '));
    }

  };

  module.exports = new Logger();

});