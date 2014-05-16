/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    
    var templateString = "<div class='compare-editor'>\
                            <textarea id='{{ id }}-area' class='compare-content'>{{ text }}</textarea>\
                            <div id='' class='compare-status'> {{ title }} </div> \
                         </div>";
    function Editor(options) {
        this.id = options.id;
        this.title = options.title;
        this.text = options.text;
        this.lineNumbers = options.lineNumbers || true;
        this.lineWrapping = options.lineWrapping || true;
        this.mode = options.mode || "javascript";
        this.cm = null; // Codemirror instance
        
        this.initialize();
    };
    
    Editor.prototype.initialize = function() {
        this.load = this.load.bind(this);
        this.render = this.render.bind(this);
    };
    
    Editor.prototype.load = function() {
       this.cm = CodeMirror.fromTextArea(document.querySelector("#" + this.id + "-area"), {
            mode: this.mode,
            lineNumbers: this.lineNumbers,
            lineWrapping: this.lineWrapping
        });
    };
    
    Editor.prototype.refresh = function() {
        if (this.cm) {
            this.cm.refresh();
        }
    };
    
    Editor.prototype.render = function() {
        return Mustache.render(templateString, { id: this.id, title: this.title, text: this.text });
    };
    
    exports.CompareEditor = Editor;
});