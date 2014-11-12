define(function(require, exports, module) {
  'use strict';
  var FileUtils = brackets.getModule("file/FileUtils");
  
  var Utils = {
    colorBrightness: function(color) {
      // w3c algorithim for testing percieve brightness
      return (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    },
    parseColor: function(rgb) {
      var re = /rgb\((\d+), (\d+), (\d+))/;
      rgb = re.exec(rgb)
      return { 
        r: parseInt(rgb[1], 10), 
        g: parseInt(rgb[2], 10), 
        b: parseInt(rgb[3], 10) 
      }
    },
    debounce: function (fn, delay) {
      var timer = null;
      return function () {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
          fn.apply(context, args);
        }, delay);
      };
    },
    scale: function (value, frm, to) {
      return value * (to / frm);
    }, 
    scaleObjectValues: function (o, frm, to) {
      for ( var prop in o) {
        o[prop] = scale(o[prop], frm, to);
      }
      return o;
    },
    saveFileToDisk: function (file, text, force) {
      // We don't want normalized line endings, so it's important to pass true to getText()
      // returns a promise
      return FileUtils.writeText(file, text, force);
    },
    calculateElHeight: function (el) {
      // Calculates size of the element to fill it containing container
      var $avlHeight = $(".content").height();  
      el.siblings().each(function(index, el) {
        var $el = $(el);
        if ($el.css("display") !== "none" && $el.css("position") !== "absolute") {
          $avlHeight -= $el.outerHeight();
        }       
      });
      return Math.max($avlHeight, 0);
    },
    fixPath: function (path) {
      return path.replace(/^([A-Z]+:)?\//, function (match) {
        return match.toLocaleLowerCase();
      }); 
    }
  };
  
  exports.Utils = Utils;
})