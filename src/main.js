define(function (require, exports, module) {
  "use strict";

  var AppInit = brackets.getModule("utils/AppInit");
  var WorkspaceManager = brackets.getModule("view/WorkspaceManager");
  var EditorManager = brackets.getModule("editor/EditorManager");
  var MainViewManager = brackets.getModule("view/MainViewManager");
  var Sidebar = brackets.getModule("project/SidebarView");
  var DocumentManager = brackets.getModule("document/DocumentManager");
  var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
  var ThemeManager = brackets.getModule("view/ThemeManager");

  var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");

  var Utils = require("dist/utils/Utils");

  var compareMode = false;
  var hdiff = 0;
  var editorCurrentHeight = 0;

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

  AppInit.appReady(function () {
    var COMPARE_PANEL_HTML = "<div id=\"compare-pane\">" + "<div class=\"pane-header\">" + "<div id=\"pane-left\" class=\"pane-header-content pane-left\"></div>" + "<div id=\"pane-right\" class=\"pane-header-content pane-right\" ></div>" + "</div>" + "<div class=\"pane-content\"></div>" + "</div>";
    var comparePanel = null;
    var compareView = null;

    var currentTheme = ThemeManager.getCurrentTheme();
    
    

    addToolbarButton("compare-files", function (e) {
      // make sure there are aleast two panes to compare
      var documents = DocumentManager.getAllOpenDocuments();
      var target = document.querySelector("#compare-pane .pane-content");
      var editor = $("#editor-holder");
      editorCurrentHeight = $("#editor-holder").height();
      console.log(documents);
      if (documents.length === 2) {
        switchCompareMode(function (mode) {
          changeButtonState(e.target || e.currentTarget, mode);

          if (mode) {
            comparePanel.show();
            compareView = CodeMirror.MergeView(target, {
              value: documents[0].getText(),
              orig: documents[1].getText(),
              hightlightDifferences: false,
              collapseIdentical: false,
              options: {
                allowEditingOriginals: true },
              lineNumbers: true,
              theme: currentTheme.name,
              mode: Utils.getCodeMirrorMode()
            });

            WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, onWorkspaceLayoutUpdate);
            editor.addClass("hide");
            Sidebar.hide();

            $("#pane-left").html(documents[0].file._path);
            $("#pane-right").html("<span class=\"perm\">read-only</span> " + documents[1].file._path);

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
      }
    });

    // Create a new panel to hold the diff views
    comparePanel = WorkspaceManager.createBottomPanel("compare.panel", $(COMPARE_PANEL_HTML), 1000);
  });
});