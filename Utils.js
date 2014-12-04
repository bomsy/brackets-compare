define(function(require, exports, module) {
  'use strict';
  var FileUtils = brackets.getModule("file/FileUtils");
  var FileSystem = brackets.getModule("filesystem/FileSystem");
  var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
  var ThemeManager = brackets.getModule("view/ThemeManager");
  
  function fixPath(path) {
    return path.replace(/^([A-Z]+:)?\//, function (match) {
      return match.toLocaleLowerCase();
    }); 
  }
  
  var utils = {
    
    colorBrightness: function(color) {
      // w3c algorithim for testing percieve brightness
      return (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    },
    
    parseColor: function(rgb) {
      var re = /rgb\((\d+), (\d+), (\d+)\)/;
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
    },    
    // Wrapper around FileSystem.showOpenDialog
    // which returns a promise instead.
    showOpenDialog: function(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes) {
      var result = new $.Deferred();
      FileSystem.showOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes,
        function(err, data) {
          if (!err) {
            result.resolve(data[0]);
          } else {
            result.reject(err);
          }
      });
      return result.promise();
    },
    // Fires the trigger when fn does not fire
    // within the threshold period
    // (Used to notify when scrolling on the views have stopped,
    // preventing Circular referencing when sticking views)
    trigger: function(fn, threshold, action) {
      var timer = null;
      return function() {
        clearTimeout(timer);
        fn.apply(this, arguments);
        timer = setTimeout(action, threshold);
      };
    },
    
    createMarker: function(color, content, bgColor) {
      var marker = document.createElement("div");
      marker.style.color = color;
      marker.style.backgroundColor = bgColor;
      marker.innerHTML = '&nbsp;' + content;
      return marker;
    },
    // Without the performance tests
    readFileAsText: function(file) {
      var result = new $.Deferred();
      // Read file
      file.read(function (err, data, stat) {
        if (!err) {
          result.resolve(data, stat.mtime);
        } else {
          result.reject(err);
        }
      });
      return result.promise();
    },
    
    lessifyTheme: function(content, theme) {
      var stylesPath = FileUtils.getNativeBracketsDirectoryPath() + "/styles/";
      var deferred = new $.Deferred();
      var parser = new less.Parser({
        rootpath: fixPath(stylesPath),
        filename: fixPath(theme.file._path)
      });
      parser.parse("#compare-panel {" + content + "\n}", 
        function (err, tree) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(tree.toCSS());
          }
        });
        return deferred.promise();
     },
    
    loadCurrentTheme: function() {
      var commentRegex = /\/\*([\s\S]*?)\*\//mg;
      var theme = ThemeManager.getCurrentTheme();
      var pending = theme && utils.readFileAsText(theme.file)
        .then(function (lessContent) {
          return utils.lessifyTheme(lessContent.replace(commentRegex, ""), theme);
        })
        .then(function (style) {
          // remove previous stylesheet
          $("head > style").last().remove();
          return ExtensionUtils.addEmbeddedStyleSheet(style);
        })
        return $.when(pending);
    }
    
  };
  
  exports.utils = utils;
})