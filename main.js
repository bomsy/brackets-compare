/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */
require.config({
    paths: {
        "text" : "lib/text",
        "i18n" : "lib/i18n"
    },
    locale: brackets.getLocale()
});

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {
    "use strict";
    var AppInit          =   brackets.getModule("utils/AppInit"),
        ExtensionUtils   =   brackets.getModule("utils/ExtensionUtils"),
        CommandManager   =   brackets.getModule("command/CommandManager"),
        DocumentManager  =   brackets.getModule("document/DocumentManager"),
        Document         =   brackets.getModule("document/Document"),
        EditorManager    =   brackets.getModule("editor/EditorManager"),
        Menus            =   brackets.getModule("command/Menus"),
        FileSystem       =   brackets.getModule("filesystem/FileSystem"),
        FileUtils        =   brackets.getModule("file/FileUtils"),
        NodeDomain       =   brackets.getModule("utils/NodeDomain"),
        Strings          =   require("strings"),
        
        _                = brackets.getModule("thirdparty/lodash"),

        CMD_COMPARE_FILE = "command.comparefile",
        CMD_COMPARE_HISTORY = "command.comparehistory",
        CMD_LAYOUT_VERTICAL = "command.vlayout",
        CMD_LAYOUT_HORIZONTAL = "command.hlayout",
        CMD_HIDEVIEW = "command.hideview",
        CMD_TOGGLE_STICKY = "command.togglesticky";

    var ComparePanel = require("ComparePanel").ComparePanel,
        CompareView = require("CompareView").CompareView;

    // False shows in horizontal view
    var isVertical = true,

    // Global for handling sticky scrolling of the diff views
        gblStickyViews         = false;

    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "styles/brackets-compare.css");

        var oldView = null ,
            newView = null,
            panel = null;

        var workerPath = ExtensionUtils.getModulePath(module, "compare-worker.js");
        // Seperate workers for handling line and character diffs
        // Are there perf improvements ???
        var worker = new Worker(workerPath);
        
        // Load menus
        var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        var projectMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
        var workingSetMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_CONTEXT_MENU, true);

        // Wrapper around FileSystem.showOpenDialog
        // which returns a promise instead.
        function _showOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes) {
            var result = new $.Deferred();
            FileSystem.showOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes,
                function(err, data) {
                    if (!err) {
                        result.resolve(data[0]);
                    } else {
                        result.reject(err);
                    }
                });
            return result.promise();
        }

        // Fires the trigger when fn does not fire
        // within the threshold period
        // (Used to notify when scrolling on the views have stopped,
        // preventing Circular referencing when sticking views)
        function _setTrigger(fn, threshold, trigger) {
          var timer = null;
          return function() {
            clearTimeout(timer);
            fn.apply(this, arguments);
            timer = setTimeout(trigger, threshold);
          };
        }

        function _markLines(data) {
          oldView.markLines(data.removed);
          newView.markLines(data.added);
        }


        function _onWorkerMessage(e) {
          _markLines(e.data);
        }


        function _onCurrentDocumentChange() {
            panel.destroy();
            worker.removeEventListener("message", _onWorkerMessage, false);
        }

        function _onViewKeyPressed(editor, e) {
            _runWorkers();
        }

        function _runWorkers() {
          worker.postMessage({
            mode: 0,
            o: oldView.getText(),
            n: newView.getText()
          });
        }

        function _onStickViews() {

        }

        function _onMenuCloseViews() {
            CommandManager.get(CMD_HIDEVIEW).setEnabled(false);
            panel.destroy();
        }

        // Creates the panels, views and runs the workers
        function _onShowCompareViews() {
          panel = new ComparePanel({
            layout: isVertical ? ComparePanel.layouts.vertical : ComparePanel.layouts.horizontal,
            onDestroyed: function() {
              worker.removeEventListener("message", _onWorkerMessage, false);
            }
          });

            CommandManager.get(CMD_HIDEVIEW).setEnabled(true);

            // Setup listener for worker
            worker.addEventListener("message", _onWorkerMessage, false);

            var _currentDoc = DocumentManager.getCurrentDocument();
            var extFile = null;

            oldView = new CompareView({
              id: "old-viewer",
              title: _currentDoc.file.name,
              text: _currentDoc.getText(),
              file: _currentDoc.file,
              mode: CompareView.MODES[FileUtils.getFileExtension(_currentDoc.file.fullPath)],
              onKeyPressed: _onViewKeyPressed,
              lineMarker: CompareView.markers.removed,
              onFocus: function() {
                //set as focused view
                panel.currentView = oldView;
              },
              onBlur: function() {
                panel.currentView = null;
              },
              onFileSave: function() {
                console.log(this.id + " file saved.");
              }
            });

            oldView.onScroll = _setTrigger(function() {
                var o = this.getScrollInfo();
                newView.emitScrollEvents = false;
                newView.scrollIntoView({
                    left: 0,
                    right: 0,
                    top: o.top,
                    bottom: newView.getScrollInfo().height
                });
            }, 200, function(){
                newView.emitScrollEvents = true;
            })

            panel.addView(oldView);

            _showOpenDialog( false, false, Strings.CHOOSE_FILE, "", "")
            .then(function(path) {
                var r = new $.Deferred();
                extFile = FileSystem.getFileForPath(path);
                if (extFile) {
                    r.resolve(extFile);
                } else {
                    r.reject(null);
                }
                return r.promise();
            })
            .then(FileUtils.readAsText)
            .then(function(text) {
                newView = new CompareView({
                  id: "new-viewer",
                  title: extFile.name,
                  text: text,
                  file: FileSystem.getFileForPath(extFile.fullPath),
                  mode: CompareView.MODES[FileUtils.getFileExtension(extFile.fullPath)],
                  onKeyPressed: _onViewKeyPressed,
                  lineMarker: CompareView.markers.added,
                  onFocus: function() {
                    panel.currentView = newView;
                  },
                  onBlur: function() {
                    panel.currentView = null;
                  },
                  onFileSave: function() {
                    console.log(this.id + " file saved.");
                  }
                });

                newView.onScroll = _setTrigger(function() {
                    var o = this.getScrollInfo();
                    oldView.emitScrollEvents = false;
                    oldView.scrollIntoView({
                        left: 0,
                        right: 0,
                        top: o.top,
                        bottom: oldView.getScrollInfo().height
                    });
                }, 200, function() {
                    oldView.emitScrollEvents = true;
                })

                panel.addView(newView);
                panel.load();
                panel.show();

                _runWorkers();
            });
        }
      
        function _onHorizontalLayoutChange() {
          isVertical = false;
          changeLayout();
        }
      
      function _onVerticalLayoutChange() {
        isVertical = true;
        changeLayout();
      }
      
      function changeLayout() {
        CommandManager.get(CMD_LAYOUT_VERTICAL).setChecked(isVertical);
        CommandManager.get(CMD_LAYOUT_HORIZONTAL).setChecked(!isVertical);
      }


        // Command register
        CommandManager.register(Strings.COMPARE_FILE, CMD_COMPARE_FILE, _onShowCompareViews);
        CommandManager.register(Strings.COMPARE_HISTORY, CMD_COMPARE_HISTORY, _onShowCompareViews);
        CommandManager.register(Strings.COMPARE_VERTICAL, CMD_LAYOUT_VERTICAL, _onVerticalLayoutChange);
        CommandManager.register(Strings.COMPARE_HORIZONTAL, CMD_LAYOUT_HORIZONTAL, _onHorizontalLayoutChange);
        CommandManager.register(Strings.TOGGLE_STICKY, CMD_TOGGLE_STICKY, _onStickViews);
        CommandManager.register(Strings.CLOSE_VIEWS, CMD_HIDEVIEW, _onMenuCloseViews);

        // Events
        //$(DocumentManager).on("currentDocumentChange", _onCurrentDocumentChange);

        //Add to the view menus
        viewMenu.addMenuDivider();
      
        viewMenu.addMenuItem(CMD_LAYOUT_VERTICAL);
        viewMenu.addMenuItem(CMD_LAYOUT_HORIZONTAL);
        viewMenu.addMenuItem(CMD_TOGGLE_STICKY);
        viewMenu.addMenuItem(CMD_HIDEVIEW);

        changeLayout();
      
        CommandManager.get(CMD_HIDEVIEW).setEnabled(false);

        projectMenu.addMenuDivider();
        projectMenu.addMenuItem(CMD_COMPARE_FILE);
        projectMenu.addMenuItem(CMD_COMPARE_HISTORY);

        workingSetMenu.addMenuDivider();
        workingSetMenu.addMenuItem(CMD_COMPARE_HISTORY);
    });
});
