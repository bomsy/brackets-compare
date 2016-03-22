/*eslint no-var:0*/

define(function (require, exports, module) {
  'use strict';

  // styling
  var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  
  ExtensionUtils.loadStyleSheet(module, 'styles/main.less');
  ExtensionUtils.loadStyleSheet(module, 'styles/merge.css');
  
  // launch compiled js code
  if (!window.regeneratorRuntime) { 
    require('babel-polyfill'); 
  }
  
  require('dist/main');
  require([ExtensionUtils.getModulePath(module, 'dist/diff_match_patch/main.js')]);
  require([ExtensionUtils.getModulePath(module, 'dist/codemirror/merge.js')]);
  

  /*
  // TODO: provide base for writing unit tests
  if (window.isBracketsTestWindow) { }
  */

  //embed the icon author credit for glyphicon
});