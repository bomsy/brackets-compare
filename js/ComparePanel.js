/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var PanelManager    =   brackets.getModule("view/PanelManager"),
        ExtensionUtils  =   brackets.getModule("utils/ExtensionUtils"),
        EditorManager   =   brackets.getModule("editor/EditorManager"),
        ResizerPanel    =   brackets.getModule("utils/Resizer"),
        Sidebar         =   brackets.getModule("project/SidebarView"),
        statusBar       =   brackets.getModule("widgets/StatusBar"),
        ThemeView       =   brackets.getModule("view/ThemeView"),
        ThemeManager    =   brackets.getModule("view/ThemeManager"),
        FileUtils       =   brackets.getModule("file/FileUtils"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        prefs = PreferencesManager.getExtensionPrefs("themes"),
        Strings         =   require("../strings");
    
    var COMPARE_PANEL   =   "compare.panel";
    var statusInfoPanel = document.querySelector("#status-info");
    var cacheStatusInfo = statusInfoPanel.innerText;
    
    var commentRegex = /\/\*([\s\S]*?)\*\//mg;
    var stylesPath = FileUtils.getNativeBracketsDirectoryPath() + "/styles/";
        
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
    
    function _addToolbarButton(id, tooltip, icon, handler) {
        var html = "<a href='#' id='" + id + "' title='" + 
            tooltip +"'> <span class='glyphicon glyphicon-" + icon + "'></span></a>";
        $("#main-toolbar .buttons").append(html);
        $("#" + id).on("click", handler);
    }
    
    function _removeToolbarButton(id, handler) {
        $("#" + id).off("click", handler);
        $("#" + id).remove();
    }

    function _setHeight($el) {
        $el.height(_calcElHeight($el));
    }
    
    function _showCurrentEditor() {
        $("#editor-holder").show();
    }
    
    function _hideCurrentEditor() {
       $("#editor-holder").hide(); 
    } 
    
    function fixPath(path) {
        return path.replace(/^([A-Z]+:)?\//, function (match) {
            return match.toLocaleLowerCase();
        }); 
    }
    
    function lessifyTheme(content, theme) {
        var deferred = new $.Deferred();
        var parser = new less.Parser({
            rootpath: fixPath(stylesPath),
            filename: fixPath(theme.file._path)
        });
        parser.parse("#compare-panel {" + content + "\n}", function (err, tree) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(tree.toCSS());
            }
        });
        return deferred.promise();
     }
    
    function loadCurrentTheme() {
        var theme = ThemeManager.getCurrentTheme();
        console.log(theme.file._path);
        var pending = theme && FileUtils.readAsText(theme.file)
        .then(function (lessContent) {
            return lessifyTheme(lessContent.replace(commentRegex, ""), theme);
        })
        .then(function (style) {
            // remove previous stylesheet
            $("head > style").last().remove();    
            return ExtensionUtils.addEmbeddedStyleSheet(style);
        });
        return $.when(pending);
    }
    
    function loadTheme(callback) {
        $.when(loadCurrentTheme())
            .done(callback);
    }
    
    function Panel(options) {
        // The current focused view
        this.currentView = null;
        this.currentThemeLoaded = false;
        
        this.views = [];
        this.pane = null;
        this.$el = null;
        this.parent = null;
        this.layout = options.layout || Panel.layouts["horizontal"];
        
        //event handlers
        this.onLoaded = options.onLoaded || null;
        this.onDestroyed = options.onDestroyed || null;
        
        this.addView = this.addView.bind(this);
        this.loadViews = this.loadViews.bind(this);
        this.renderViews = this.renderViews.bind(this);
        this.refreshViews = this.refreshViews.bind(this);
        this.load = this.load.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.remove = this.remove.bind(this);
        this.destroy = this.destroy.bind(this);
        this.onResize = this.onResize.bind(this);
        this.bindEvents = this.bindEvents.bind(this);
        this.setViewsTheme = this.setViewsTheme.bind(this);
        
        this.toolbarCloseClick = this.toolbarCloseClick.bind(this);
        this.toolbarSaveClick = this.toolbarSaveClick.bind(this);
        
        this.initialize();
    };
    
    Panel.layouts = {
        vertical: "vertical",
        horizontal: "horizontal"
    }; 
    
    Panel.prototype.initialize = function() {

    };
    
    Panel.prototype.onResize = function()  {
        _setHeight(this.$el);
    };
    
    Panel.prototype.showInfo = function(content) {
        statusInfoPanel.innerHTML = content;
    };
    
    Panel.prototype.showSidebar = function() {
        Sidebar.show();
    };
    
    Panel.prototype.hideSidebar = function() {
        Sidebar.hide();
    };
    
    Panel.prototype.showBusy = function() {
        statusBar.showBusyIndicator(true);
    };
    
    Panel.prototype.hideBusy = function() {
        statusBar.hideBusyIndicator();
    };
    
    Panel.prototype.toolbarCloseClick = function() {
        this.destroy();
    };
    
    Panel.prototype.toolbarSaveClick = function() {
        var force = true;
        if (this.currentView) {
            this.currentView.saveFile();
        } else {
            // save all the view files
            for (var i = 0, len = this.views.length; i < len; i++) {
                this.views[i].saveFile(); 
            }
        }
    };
    
    Panel.prototype.loadToolbarButtons = function() {
        _addToolbarButton("compare-save", Strings.SAVE_FILES, "floppy-disk", this.toolbarSaveClick);
        _addToolbarButton("compare-hide", Strings.CLOSE_VIEWS, "off", this.toolbarCloseClick);
        //_addToolbarButton("compare-sticky", "Turn off sticky views", "flash", function(){});
    };
    
    Panel.prototype.unloadToolbarButtons = function(){
        _removeToolbarButton("compare-save", this.toolbarSaveClick);
        _removeToolbarButton("compare-hide", this.toolbarCloseClick);
        //_removeToolbarButton("compare-sticky", function(){});
    };
    
    Panel.prototype.setLayout = function(layout) {
        this.layout = layout;
    };
    
    Panel.prototype.bindEvents = function() {
        window.addEventListener("resize", this.onResize);
    };
    
    Panel.prototype.loadViews = function() {
        for (var i = 0, len = this.views.length; i < len; i++) {
            this.views[i].load(); 
        }
    };
    
    Panel.prototype.setViewsTheme = function() {
        for (var i = 0, len = this.views.length; i < len; i++) {
            this.views[i].setTheme(); 
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
        loadTheme(this.setViewsTheme)
        this.loadToolbarButtons();
        prefs.on("change", "theme", function() {
            loadTheme(this.setViewsTheme);
        });
        if (this.onLoaded) {
            this.onLoaded(this);
        }
    };
    
    Panel.prototype.addView = function(editorView) {
        this.views.push(editorView);
    };
    
    Panel.prototype.renderViews = function() {
        var content = "<div id='compare-panel' class='compare-panel' >";
        for (var i = 0, len = this.views.length; i < len; i++) {
            content += this.views[i].render(this.layout); 
        }
        content += "</div>"    
        this.pane = PanelManager.createBottomPanel(COMPARE_PANEL, $(content), 1000);
        this.$el = $("#compare-panel");
        this.parent = this.$el.parent();
        this.bindEvents();
    };
    
    Panel.prototype.remove = function() {
        if( this.$el) {
            this.$el.remove();
        }
    };
    
    Panel.prototype.show = function() {
        if (this.pane) {
            this.hideSidebar();
            _hideCurrentEditor(); 
            _setHeight(this.$el);
            this.pane.show();
            this.refreshViews();
        }
    };
    
    Panel.prototype.destroy = function() {
        this.hide();
        this.unloadToolbarButtons();
        window.removeEventListener("resize", this.onResize);
        for (var i = 0, len = this.views.length; i < len; i++) {
            this.views[i].destroy(); 
        }
        console.log(cacheStatusInfo);
        statusInfoPanel.innerText = cacheStatusInfo;
        if (this.onDestroyed) {
            this.onDestroyed();
        }
        this.remove();
        this.views = [];
        this.$el = null;
        this.parent = null;
        this.pane = null;
    };
    
    Panel.prototype.hide = function() {
        if (this.pane) {
            this.showSidebar();
            _showCurrentEditor();
            this.pane.hide();
        }
    };
    
    exports.ComparePanel = Panel;
});
