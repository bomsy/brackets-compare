/*eslint no-console: 0*/
define(function (require, exports, module) {
  'use strict';
  module.exports = {
    injectScript: (id, path) => {
      var __script = document.createElement('script');
      var __tags = document.getElementsByTagName('script');
      var __tag = __tags[__tags.length - 1];
      __script.setAttribute('type', 'text/javascript');
      __script.setAttribute('charset', 'utf-8');
      __script.setAttribute('src', path);
      __script.setAttribute('id', id);
      __script.setAttribute('async', 'async');
      __tag.parentNode.insertBefore(__script, __tag);
    },

    getCodeMirrorMode: (ext = 'js') => {
      var modes = {
        'js': 'javascript',
        'css': 'text/css',
        'html': 'text/html',
        'html_mixed': 'htmlmixed'
      };
      return modes[ext];
    },

    getPathExtension: function (path) {
      return path;
    }
  };
});