/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
   //stage fright 
    var templateString = "<div id='{{ id }}-editor'class='compare-editor'>\
                            <textarea id='{{ id }}-area' class='compare-content'>{{ text }}</textarea>\
                            <!--<div id='' class='compare-status'> {{ title }} </div>--> \
                         </div>";
    
    function View(options) {
        this.id = options.id;
        this.title = options.title || "";
        this.text = options.text || "";
        this.lineNumbers = options.lineNumbers || true;
        this.lineWrapping = options.lineWrapping || true;
        this.mode = options.mode || View.MODES["js"];
        this.cm = null;
        
        this.initialize = this.initialize.bind(this);
        this.load   = this.load.bind(this);
        this.setText = this.setText.bind(this);
        this.getText = this.getText.bind(this);
        this.render = this.render.bind(this);
        
        this.initialize();
    };
    
    View.MODES = {
        html : "text/html",
        css  : "css",
        js   : "javascript" 
    };
    
    View.prototype.initialize = function() {
        this.setText(this.text);
    };
    
    View.prototype.load = function() {
       this.cm = CodeMirror.fromTextArea(document.querySelector("#" + this.id + "-area"), {
            mode: this.mode,
            lineNumbers: this.lineNumbers
        });
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
        this.destroy();
    };
    
    View.prototype.render = function() {
        return Mustache.render(templateString, { id: this.id, title: this.title, text: this.text });
    };
    
    exports.CompareView = View;
});