/*eslint no-console: 0*/

define(function(require, exports, module) {
  'use strict';

  var packageInfo = JSON.parse(require('text!../package.json'));

  function Logger() {
      this.prefix = '[' + packageInfo.name + '] ';
  };

  Logger.prototype.log = function() {
    var args = Array.prototype.slice.call(arguments)
    console.log(this.prefix + args.join(' '));
  };

  Logger.prototype.error = function() {
    var args = Array.prototype.slice.call(arguments)
    console.error(this.prefix + args.join(' '));
  };

  Logger.prototype.warn  = function() {
    var args = Array.prototype.slice.call(arguments)
    console.warn(this.prefix + args.join(' '));
  };

  module.exports = new Logger();

});