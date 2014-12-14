/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
  "use strict";
  var PanelManager    =   brackets.getModule("view/PanelManager"),
    WorkspaceManager =  brackets.getModule("view/WorkspaceManager"),
    CommandManager   =   brackets.getModule("command/CommandManager"),
    ExtensionUtils  =   brackets.getModule("utils/ExtensionUtils"),
    EditorManager   =   brackets.getModule("editor/EditorManager"),
    ResizerPanel    =   brackets.getModule("utils/Resizer"),
    Sidebar         =   brackets.getModule("project/SidebarView"),
    StatusBar       =   brackets.getModule("widgets/StatusBar"),
    ThemeView       =   brackets.getModule("view/ThemeView"),
    ThemeManager    =   brackets.getModule("view/ThemeManager"),
    FileUtils       =   brackets.getModule("file/FileUtils"),
    PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
    prefs = PreferencesManager.getExtensionPrefs("themes");

  var Strings = require("strings"); 
  var Utils = require("Utils").utils;

  var COMPARE_PANEL   =   "compare.panel";
  var statusInfoPanel = document.querySelector("#status-info");
  var cacheStatusInfo = statusInfoPanel.innerText;

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
    $el.height(Utils.calculateElHeight($el));
  }

  function _showCurrentEditor() {
    $("#editor-holder").show();
  }

  function _hideCurrentEditor() {
   $("#editor-holder").hide(); 
  } 


function loadTheme(callback) {
  $.when(Utils.loadCurrentTheme())
    .done(callback)
}

  function Panel(options) {
    // The current focused view
    this.currentView = null;
    this.currentThemeLoaded = false;

    this.views = [];
    this.pane = null;
    this.$el = null;
    this.parent = null;
    this.statusbar = null;
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
    this.load = this.load.bind(this);

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

  Panel.prototype.showStatus = function(content) {
    if (this.statusbar) {
      this.statusbar.innerHTML = content;
    }
  };
  
  Panel.prototype.clearStatus = function() {
    this.statusbar.innerHTML = '';
  };

  Panel.prototype.showBracketsSidebar = function() {
    Sidebar.show();
  };

  Panel.prototype.hideBracketsSidebar = function() {
    Sidebar.hide();
  };

  Panel.prototype.hideBracketsStatusbar = function() {
    StatusBar.hide();
  };

  Panel.prototype.showBracketsStatusbar = function() {
    StatusBar.show();
  };

  Panel.prototype.hideBusy = function() {
    StatusBar.hideBusyIndicator();
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
    _addToolbarButton("compare-save", Strings.SAVE_FILES, "hdd", this.toolbarSaveClick);
    _addToolbarButton("compare-hide", Strings.CLOSE_VIEWS, "remove", this.toolbarCloseClick);
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
    var self = this;
    this.renderViews();
    this.loadViews();

    this.loadToolbarButtons();    
    loadTheme(this.setViewsTheme);
    // Listen for brackets theme change
    prefs.on("change", "theme", function() {
      loadTheme(self.setViewsTheme);
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
    content += "<div id='compare-status-bar' class='compare-status-bar'></div></div>"    
    this.pane = WorkspaceManager.createBottomPanel(COMPARE_PANEL, $(content), 1000);
    this.$el = $("#compare-panel");
    this.parent = this.$el.parent();
    this.statusbar = $('#compare-status-bar');
    this.bindEvents();
  };

  Panel.prototype.remove = function() {
    if( this.$el) {
      this.$el.remove();
    }
  };

  Panel.prototype.show = function() {
    if (this.pane) {
      this.hideBracketsSidebar();
      this.hideBracketsStatusbar();
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
    if (this.onDestroyed) {
      this.onDestroyed();
    }
    this.remove();
    this.views = [];
    this.$el = null;
    this.parent = null;
    this.statusbar = null;
    this.pane = null;
  };

  Panel.prototype.hide = function() {
    if (this.pane) {
      this.showBracketsSidebar();
      this.showBracketsStatusbar();
      _showCurrentEditor();
      this.pane.hide();
    }
  };

  exports.ComparePanel = Panel;
});
