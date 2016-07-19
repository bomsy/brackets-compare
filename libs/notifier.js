/*eslint no-console: 0*/

define(function(require, exports, module) {
  'use strict';
  
  var ModalBar = brackets.getModule("widgets/ModalBar").ModalBar;
  
  var types = {
    "error": "exclamation-sign"
  };
  
  function Notifier(message, timeout) {
    this.message = message || 'Something went wrong!';
    this.type = "error";
    this.modalbar = null;
    this.timeoutId = null;
    this.timeout = timeout || 4500;
  }
    
  Notifier.prototype.error = function(message, timeout) {
    this.type = "error";
    this.message = message || this.message;
    this.timeout = timeout || this.timeout;
    this.open();
  };
    
  Notifier.prototype.open = function() {
    var self = this;
    if (this.modalbar !== null) {
      this.close();
    }
    
    this.modalbar = new ModalBar("<span class='error-notify'><i class=\"glyphicon glyphicon-" + types[this.type] + "\"></i> " + this.message + "</span>", true);
    this.timeoutId = window.setTimeout(function() { 
      self.close(); 
    }, this.timeout);
  };
    
  Notifier.prototype.close = function() {
    this.modalbar.close();
    window.clearTimeout(this.timeoutId);
    this.modalbar = null;
    this.timeoutId = null;
  };
  
  module.exports = Notifier;
});