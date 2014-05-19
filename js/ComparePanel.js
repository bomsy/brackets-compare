/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var PanelManager    =   brackets.getModule("view/PanelManager"),
        ExtensionUtils  =   brackets.getModule("utils/ExtensionUtils"),
        EditorManager   =   brackets.getModule("editor/EditorManager"),
        ResizerPanel    =   brackets.getModule("utils/Resizer"),
        statusBar       =   brackets.getModule("widgets/StatusBar");
    
    var COMPARE_PANEL   =   "compare.panel";
    
    // Calculates size of the element to fill it containing container
    function _calcElHeight(el) {
        var $avlHeight = $(".content").height();
        
        el.siblings().each(function(index, el) {
            var $el = $(el);
           if($el.css("display") !== "none" && $el.css("position") !== "absolute") {
                $avlHeight -= $el.outerHeight();
           }       
        });
        return Math.max($avlHeight, 0);
    }

    function _setHeight($el) {
        $el.height(_calcElHeight($el));
    }
    
    function _showEditor() {
        $("#editor-holder").show();
    }
    
    function _hideEditor() {
       $("#editor-holder").hide(); 
    }
    
    
    function Panel(options) {
        this.views = [];
        this.pane = null;
        this.$el = null;
        this.parent = null;
        this.initialize();
    };
    
    Panel.prototype.initialize = function() {
        this.addView = this.addView.bind(this);
        this.loadViews = this.loadViews.bind(this);
        this.renderViews = this.renderViews.bind(this);
        this.refreshViews = this.refreshViews.bind(this);
        this.load = this.load.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.bindEvents = this.bindEvents.bind(this);
    };
    
    Panel.prototype.bindEvents = function() {
        var self = this;
        window.addEventListener("resize", function() {
            _setHeight(self.$el);    
        });
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
        this.$el = $("#compare-panel");
        this.parent = this.$el.parent();
        this.bindEvents();
    };
    
    Panel.prototype.show = function() {
        if (this.pane) {
            _hideEditor(); 
            _setHeight(this.$el);
            this.pane.show();
            this.refreshViews();
        }
    };
    Panel.prototype.hide = function() {
        if (this.pane) {
            _showEditor();
            this.pane.hide();
        }
    };
    
    exports.ComparePanel = Panel;
});
