/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var PanelManager    =   brackets.getModule("view/PanelManager"),
        ExtensionUtils  =   brackets.getModule("utils/ExtensionUtils");
    
    var COMPARE_PANEL = "compare.panel";
    
    function Panel(options) {
        this.views = [];
        this.pane = null;
        
        this.initialise();
    };
    
    Panel.prototype.initialise = function() {
        this.addView = this.addView.bind(this);
        this.loadViews = this.loadViews.bind(this);
        this.renderViews = this.renderViews.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
    };
    
    Panel.prototype.loadViews = function() {
        for (var i = 0, len = this.views.length; i < len; i++) {
            this.views[i].load(); 
        }
    };
    Panel.prototype.refreshViews = function() {
        for (var i = 0, len = this.views.length; i < len; i++) {
            this.views[i].refresh(); 
        }
    };
    
    Panel.prototype.load = function() {
        this.renderViews();
        this.loadViews();
    };
    
    Panel.prototype.addView = function(editorView) {
        this.views.push(editorView);
    };
    
    Panel.prototype.renderViews = function() {
        var content = "<div id='compare-panel' class='compare-panel' >";
        for (var i = 0, len = this.views.length; i < len; i++) {
            content += this.views[i].render(); 
        }
        content += "</div>"    
        this.pane = PanelManager.createBottomPanel(COMPARE_PANEL, $(content), 1000);
        document.querySelector("#compare-panel").style.height = "90%"; //force the panel height
    };
    
    Panel.prototype.show = function() {
        if (this.pane) {
            this.pane.show();
            this.refreshViews();
        }
    };
    
    Panel.prototype.hide = function() {
        if (this.pane) {
            this.pane.hide();
        }
    };
    
    exports.ComparePanel = Panel;
});
