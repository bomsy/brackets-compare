/*eslint no-console: 0*/

define((require, exports, module) => {
  'use strict';
  
  let ModalBar = brackets.getModule("widgets/ModalBar").ModalBar;
  
  const types = {
    "error": "exclamation-sign"
  };
  
  const Notifier = class {
    constructor(message = 'Something went wrong!', timeout = 4500) {
      this.message = message;
      this.type = "error";
      this.modalbar = null;
      this.timeoutId = null;
      this.timeout = timeout;
    }
    
    error(message = this.message, timeout = this.timeout) {
      this.type = "error";
      this.message = message;
      this.timeout = timeout;
      this.open();
    }
    
    open() {
      if (this.modalbar !== null) {
        this.close();
      }
      this.modalbar = new ModalBar("<span class='error-notify'><i class=\"glyphicon glyphicon-" + types[this.type] + "\"></i> " + this.message + "</span>", true);
      this.timeoutId = window.setTimeout(() => { 
        this.close(); 
      }, this.timeout);
    }
    
    close() {
      this.modalbar.close();
      window.clearTimeout(this.timeoutId);
      this.modalbar = null;
      this.timeoutId = null;
    }
  };
  
  module.exports = Notifier;
});