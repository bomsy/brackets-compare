/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, Mustache */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module){
    "use strict";
    var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
    var templateString = "<div id='{{ id }}-editor-{{ layout}}' class='compare-editor-{{ layout }}'>" +
                            "<textarea id='{{ id }}-area' class='compare-content'>{{ text }}</textarea>" +
                            "<!--<div id='' class='compare-status'> {{ title }} </div>-->" +
                         "</div>";

    var offset = -1;

    function makeMarker(color, content) {
      var marker = document.createElement("div");
      marker.style.color = color;
      marker.innerHTML = content;
      return marker;
    }

    function debounce(fn, delay) {
      var timer = null;
      return function () {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
          fn.apply(context, args);
        }, delay);
      };
    }
    
    function scale(value, frm, to) {
        return value * (to / frm);
    }
    
    function scaleObjectValues(o, frm, to) {
        for(var prop in o) {
            o[prop] = scale(o[prop], frm, to);
        }
        return o;
    }

    function View(options) {
        this.id = options.id;
        this.title = options.title || "";
        this.text = options.text || "";
        this.lineNumbers = options.lineNumbers || true;
        this.lineWrapping = options.lineWrapping || true;
        this.mode = options.mode || View.MODES.js;
        this.cm = null; // Codemirror instance

        this.markedLines = {};

        // Events
        this.onKeyPressed = options.onKeyPressed || function() {};
        this.onScroll = options.onScroll || function() {};
        this.onViewportChange = options.onViewportChange || function() {};

        this.onKeyPressed = this.onKeyPressed.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onViewportChange = this.onViewportChange.bind(this);
        this.initialize = this.initialize.bind(this);
        this.load   = this.load.bind(this);
        this.refresh = this.refresh.bind(this);
        this.setText = this.setText.bind(this);
        this.getText = this.getText.bind(this);
        this.render = this.render.bind(this);
        this.markGutter = this.markGutter.bind(this);
        this.removeAllLines = this.removeAllLines.bind(this);
        this.scrollIntoView = this.scrollIntoView.bind(this);
        this.initialize();
    }

    View.MODES = {
        html : "text/html",
        css  : "css",
        js   : "javascript"
    };

    View.markers = {
        added: {
            className: "added",
            color: "#00784A",
            value: "+"
        },
        addedLine: {
            className: "added-line",
            color: "#00784A",
            value: ""
        },
        addedChars: "added-chars",
        removed: {
            className: "removed",
            color: "#f00", //"#8E0028",
            value: "-"
        },
        removedLine: {
            className: "removed-line",
            color: "#8E0028",
            value: ""
        },
        removedChars: "removed-chars"
    };

    View.prototype.initialize = function() {
        this.setText(this.text);
    };

    View.prototype.load = function() {
       this.cm = CodeMirror.fromTextArea(document.querySelector("#" + this.id + "-area"), {
            mode: this.mode,
            lineNumbers: this.lineNumbers,
            lineWrapping: this.lineWrapping,
            gutters: ["CodeMirror-linenumbers", "compare-gutter"]
        });
        this.loadEvents();
    };

    View.prototype.loadEvents = function() {
        this.cm.on("change", debounce(this.onKeyPressed, 300));
        this.cm.on("scroll", this.onScroll);
        this.cm.on("viewportChange", this.onViewportChange);
    };

    View.prototype.destroyEvents = function() {
        this.cm.off("change", debounce(this.onKeyPressed, 300));
        this.cm.off("scroll", this.onScroll);
        this.cm.off("viewportChange", this.onViewportChange);
    };

    View.prototype.markLine = function(line, className) {
        var mark = this.cm.addLineClass(line, "background", className);
        if (!this.markedLines[line]) {
            this.markedLines[line] = mark;
        }
    };
    /**
     * Scrolls  the view based of the data objects passed in
     * Based on Codemirrors "scrollIntoView" options
     */
    View.prototype.scrollIntoView = function(o) {
        this.cm.scrollIntoView(o);
    };
        
    View.prototype.getScrollInfo = function() {
        return this.cm.getScrollInfo();
    };
    
    View.prototype.removeAllLines = function() {
        for (var line in this.markedLines) {
          if (this.markedLines.hasOwnProperty(line)) {
            this.removeLine(this.markedLines[line]);
          }
        }
    };

    View.prototype.removeLine = function(mark) {
        this.cm.removeLineClass(mark, "background", mark.bgClass);
        delete this.markedLines[mark.lineNo()];
    };

    View.prototype.markGutter = function(line, color, value) {
        var info = this.cm.lineInfo(line);
        this.cm.setGutterMarker(line, "compare-gutter", info.gutterMarkers ? null : makeMarker(color, value));
    };

    View.prototype.clearGutter = function() {
        this.cm.clearGutter("compare-gutter");
    };

    View.prototype.markLines = function(from, to, marker) {
        var i = from;
        while(i <= to) {
            this.markGutter(i + offset, marker.color, marker.value);
            this.markLine(i + offset, marker.className);
            i++;
        }
    };

    View.prototype.markText = function(from, to, className) {
        this.cm.markText({
            line: from.line + offset,
            ch: from.ch
        }, {
            line: to.line + offset,
            ch: to.ch
        }, {
            className: className
        });
    };
    
    View.prototype.unmarkText = function() {
    
    };

    View.prototype.refresh = function() {
        if (this.cm) {
            this.cm.refresh();
        }
    };

    View.prototype.setText = function(text) {
        if (this.cm) {
            this.cm.setValue(this.text = text);
        }
    };

    View.prototype.getText = function() {
        return this.cm ? this.cm.getValue() : "";
    };

    View.prototype.destroy = function() {
        this.destroyEvents();
        this.id = null;
        this.cm = null;
        this.text = "";
        this.lineNumbers = true;
        this.lineWrapping = true;
        this.mode = View.MODES.js;
    };

    View.prototype.render = function(layout) {
        return Mustache.render(templateString, { id: this.id, title: this.title, text: this.text, layout: layout });
    };

    exports.CompareView = View;
});
