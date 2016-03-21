
define(function (require, exports, module) {
  'use strict';

  let AppInit = brackets.getModule('utils/AppInit');
  let WorkspaceManager = brackets.getModule('view/WorkspaceManager');
  let EditorManager = brackets.getModule('editor/EditorManager');
  let MainViewManager = brackets.getModule('view/MainViewManager');
  let Sidebar         = brackets.getModule("project/SidebarView");
  let DocumentManager = brackets.getModule('document/DocumentManager');
  let ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  let ThemeManager = brackets.getModule('view/ThemeManager');
  
  let CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
  
  let Utils = require('./utils/Utils');
  
  let compareMode = false;
  let hdiff = 0;
  let editorCurrentHeight = 0;
  
  function addToolbarButton(id, handler) {
    let html = '<a href="#" title="Show diffs" id="' + id + '"> <i class="glyphicon glyphicon-duplicate"></i></a>';
    $('#main-toolbar .buttons').append(html);
    $('#' + id).on('click', handler);
  }

  function changeButtonState(el, state) {
    if (state) {
      $('#compare-files').attr('title', 'Hide diffs');
      $('#compare-files i').addClass('compare-active');
    } else {
      $('#compare-files').attr('title', 'Show diffs');
      $('#compare-files i').removeClass('compare-active');
    }
  }
  
  function switchCompareMode(switchListener = null) {
    compareMode = !compareMode;
    if (typeof switchListener === 'function') {
      switchListener(compareMode); 
    }
  }
  
  function onWorkspaceLayoutUpdate(o, x, y) {
    let cdiff = $('#compare-pane').parent().height() - (hdiff);
    $('#compare-pane').css('height', cdiff + 'px');
  }
  /*function _removeToolbarButton(buttonId, handler) {
    $('#' + buttonId).off('click', handler);
    $('#' + buttonId).remove();
  }*/


  AppInit.appReady(() => {
    let COMPARE_PANEL_HTML = '<div id="compare-pane">' +
                              '<div class="pane-header"></div>' +
                              '<div class="pane-content"></div>' +
                             '</div>';
    let comparePanel = null;
    let compareView = null;

    let currentTheme = ThemeManager.getCurrentTheme();
    
    addToolbarButton('compare-files', (e) => {
      // make sure there are aleast two panes to compare
      let documents = DocumentManager.getAllOpenDocuments();
      let target = document.querySelector('#compare-pane .pane-content');
      let editor = $('#editor-holder');
      editorCurrentHeight = $('#editor-holder').height();
      
      if  (documents.length === 2) {
        switchCompareMode( mode => {
          changeButtonState(e.target || e.currentTarget, mode);

          if (mode) {
            comparePanel.show(); 
            compareView = CodeMirror.MergeView(target, {
              value: documents[0].getText(),
              orig: documents[1].getText(),
              hightlightDifferences: false,
              collapseIdentical: false,
              
              lineNumbers: true,
              theme: currentTheme.name,
              mode: Utils.getCodeMirrorMode()
            });

            WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, 
                                onWorkspaceLayoutUpdate); 
            editor.addClass('hide');
            Sidebar.hide();
            
            let compareEditor = $('#compare-pane');
            // Calculate the height diff
            
            compareEditor.css('height', editorCurrentHeight + 'px');
            hdiff = compareEditor.parent().height() -editorCurrentHeight;
          } else {
            comparePanel.hide();
            target.innerHTML = '';
            compareView = null;
            editor.removeClass('hide');
            WorkspaceManager.off(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, 
                                onWorkspaceLayoutUpdate);         
            Sidebar.show();
          }
        });
      }
        
    });
    
    
    // Create a new panel to hold the diff views
    comparePanel = WorkspaceManager.createBottomPanel('compare.panel', $(COMPARE_PANEL_HTML), 1000);

  });

});
