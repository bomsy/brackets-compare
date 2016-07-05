define(function (require, exports, module) {
  "use strict";

  let AppInit = brackets.getModule("utils/AppInit");
  let WorkspaceManager = brackets.getModule("view/WorkspaceManager");
  let EditorManager = brackets.getModule("editor/EditorManager");
  let MainViewManager = brackets.getModule("view/MainViewManager");
  let Sidebar = brackets.getModule("project/SidebarView");
  let DocumentManager = brackets.getModule("document/DocumentManager");
  let ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
  let ThemeManager = brackets.getModule("view/ThemeManager");

  let CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");

  let Logger = require("dist/logger");
  let Notifier = require('dist/notifier');

  let compareMode = false;
  let hdiff = 0;
  let editorCurrentHeight = 0;
  let notifier = new Notifier();
  
  const modes = {
    'js': 'javascript',
    'css': 'text/css',
    'less': 'text/css',
    'sass': 'text/css',
    'coffee': 'javascript',
    'jsx': 'javascript',
    'json': 'javascript',
    //'html': 'text/html',
    'html': 'htmlmixed'
  };

  function addToolbarButton(id, handler) {
    var html = "<a href=\"#\" title=\"Show diffs\" id=\"" + id + "\"> <i class=\"glyphicon glyphicon-duplicate\"></i></a>";
    $("#main-toolbar .buttons").append(html);
    $("#" + id).on("click", handler);
  }

  function changeButtonState(el, state) {
    if (state) {
      $("#compare-files").attr("title", "Hide diffs");
      $("#compare-files i").addClass("compare-active");
    } else {
      $("#compare-files").attr("title", "Show diffs");
      $("#compare-files i").removeClass("compare-active");
    }
  }

  function switchCompareMode() {
    var switchListener = arguments[0] === undefined ? null : arguments[0];

    compareMode = !compareMode;
    if (typeof switchListener === "function") {
      switchListener(compareMode);
    }
  }

  function onWorkspaceLayoutUpdate(o, x, y) {
    var cdiff = $("#compare-pane").parent().height() - hdiff;
    $("#compare-pane").css("height", cdiff + "px");
  }
  
  function getExtension(filename) {
    var regExp = /\.(\w+)$/;
    return String(filename).match(regExp)[1];
  }
  
  
  AppInit.appReady(function () {
    var COMPARE_PANEL_HTML = "<div id=\"compare-pane\">" + "<div class=\"pane-header\">" + "<div id=\"pane-left\" class=\"pane-header-content pane-left\"></div>" + "<div id=\"pane-right\" class=\"pane-header-content pane-right\" ></div>" + "</div>" + "<div class=\"pane-content\"></div>" + "</div>";
    var comparePanel = null;
    var compareView = null;

    var currentTheme = ThemeManager.getCurrentTheme();
    
    

    addToolbarButton("compare-files", function (e) {
      // make sure there are aleast two panes to compare
      let panes = MainViewManager.getPaneIdList();
      let target = document.querySelector("#compare-pane .pane-content");
      let editor = $("#editor-holder");
      editorCurrentHeight = $("#editor-holder").height();

      // Both panes should be selected
      if (panes.length < 2) {
        notifier.error('Cannot compare only one view / file selected. To select two files to compare, use the split views.');
        Logger.error('Cannot compare only one view / file selected. To select two files to compare, use the split views.');
        return;
      }
      
      let mFile = MainViewManager.getCurrentlyViewedFile(panes[0]);
      let oFile = MainViewManager.getCurrentlyViewedFile(panes[1]);
      
      if (mFile === null || oFile === null) {
        notifier.error('No file selected for one or all of the views. Please select a file / files.');
        Logger.error('No file selected for one or all of the views. Please select a file / files.');
        return; 
      }
      
      if (mFile._contents === null || oFile._contents === null) {
        notifier.error('To compare files, please open the folder containing these files in Brackets using the pane on the left.');
        Logger.error('To compare files, please open the folder containing these files in Brackets using the pane on the left.');
        return; 
      }
      
      if (getExtension(mFile._name) !== getExtension(oFile._name)) {
        notifier.error('Cannot compare files of different types. Please select files of the same type.');
        Logger.error('Cannot compare files of different types. Please select files of the same type.');
        return;
      }
      
      let fileExt = getExtension(mFile._name);

      switchCompareMode(function (cmode) {
        changeButtonState(e.target || e.currentTarget, cmode);

        if (cmode) {
          comparePanel.show();
          compareView = CodeMirror.MergeView(target, {
            value: mFile._contents,
            orig: oFile._contents,
            hightlightDifferences: false,
            collapseIdentical: false,
            options: {
              allowEditingOriginals: true 
            },
            lineNumbers: true,
            theme: currentTheme.name,
            mode: modes[fileExt]
          });

          WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, onWorkspaceLayoutUpdate);
          editor.addClass("hide");
          Sidebar.hide();

          $("#pane-left").html(mFile._parentPath + '<span class=\"file-name\">' + mFile._name + '</span>');
          $("#pane-right").html("<span class=\"perm\">[read-only]</span> " + oFile._parentPath + '<span class=\"file-name\">' + oFile._name + '</span>');

          var compareEditor = $("#compare-pane");
          // Calculate the height diff

          compareEditor.css("height", editorCurrentHeight + "px");
          hdiff = compareEditor.parent().height() - editorCurrentHeight;
        } else {
          comparePanel.hide();
          target.innerHTML = "";
          compareView = null;
          editor.removeClass("hide");
          WorkspaceManager.off(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, onWorkspaceLayoutUpdate);
          Sidebar.show();
        }
      });
    });

    // Create a new panel to hold the diff views
    comparePanel = WorkspaceManager.createBottomPanel("compare.panel", $(COMPARE_PANEL_HTML), 1000);
  });
});
