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

        CMD_COMPARE         =   "command.compare",
        CMD_LAYOUT          =   "command.layout",
        CMD_HIDEVIEW        =   "command.hideview",
        CMD_STICKYVIEWS     =   "command.strickyViews";

    var ComparePanel = require("js/ComparePanel").ComparePanel,
        CompareView = require("js/CompareView").CompareView;

    // False shows in horizontal view
    var gblShowInVerticalView  = true, 
        
    // Global for handling sticky scrolling of the diff views
        gblStickyViews         = false;

    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
        
        var oldView = null ,
            newView = null,
            panel = null;

        var workerPath = ExtensionUtils.getModulePath(module, "js/worker/compare-worker.js");
        // Seperate workers for handling line and character diffs
        // Are there perf improvements ???
        var lineWorker = new Worker(workerPath);
        var charWorker = new Worker(workerPath);
        
        // Load menus
        var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);        
        var projectMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
        var workingSetMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);

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

        function _markLines(o, n) {
            oldView.clearGutter();
            newView.clearGutter();
            oldView.removeAllLines();
            newView.removeAllLines();
            var lineMarker = null;
            for (var i = 0; i < o.length; i++) {
                if (o[i].status === -1) {
                    lineMarker = CompareView.markers.removed;
                } else {
                    lineMarker = CompareView.markers.addedLine;    
                }
                oldView.markLines(o[i].startLine, o[i].endLine, lineMarker);
            }
            
            for (var j = 0; j < n.length; j++) {
                if (n[j].status === 1) {
                    lineMarker = CompareView.markers.added;
                } else {
                    lineMarker = CompareView.markers.removedLine;
                }
                newView.markLines( n[j].startLine, n[j].endLine, lineMarker);
            }
        }
            
        function _markChars(o, n, r) {
            oldView.unmarkAllText(CompareView.markers.removedChars);
            for (var i = 0; i < o.length; i++) {
                if (o[i].status == -1) {
                    oldView.markText({
                        line: o[i].startLine,
                        ch: o[i].startChar
                    }, {
                        line: o[i].endLine,
                        ch: o[i].endChar
                    }, CompareView.markers.removedChars);
                }
            }
            
            newView.unmarkAllText(CompareView.markers.addedChars);
            for (var j = 0; j < n.length; j++) {
                if (n[j].status == 1) {
                    newView.markText({
                        line: n[j].startLine,
                        ch: n[j].startChar
                    }, {
                        line: n[j].endLine,
                        ch: n[j].endChar
                    }, CompareView.markers.addedChars);
                } 
            }
        }

        function _onWorkerMessage(e) {
            var data = e.data;
            if (data.mode == 0) {
                _markLines(data.old, data.new);
            } else {
                _markChars(data.old, data.new, data.raw);
            }
        }

        function _onLayoutChange() {
            gblShowInVerticalView = !gblShowInVerticalView;
            CommandManager.get(CMD_LAYOUT).setChecked(gblShowInVerticalView);
        }

        function _onCurrentDocumentChange() {
            panel.destroy();
            lineWorker.removeEventListener("message", _onWorkerMessage, false);
            charWorker.removeEventListener("message", _onWorkerMessage, false);
        }

        function _onViewKeyPressed(editor, e) {
            _runWorkers();
        }
        
        function _runWorkers() {
            lineWorker.postMessage({ 
                mode: 0, 
                o: oldView.getText(), 
                n: newView.getText() 
            });
            charWorker.postMessage({ 
                mode: 1, 
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
                layout: gblShowInVerticalView ? ComparePanel.layouts.vertical : ComparePanel.layouts.horizontal,
                onDestroyed: function() {
                    console.log("destroyed")
                    lineWorker.removeEventListener("message", _onWorkerMessage, false);
                    charWorker.removeEventListener("message", _onWorkerMessage, false);
                }
            });
            
            CommandManager.get(CMD_HIDEVIEW).setEnabled(true);

            // Setup listener for worker
            lineWorker.addEventListener("message", _onWorkerMessage, false);
            charWorker.addEventListener("message", _onWorkerMessage, false);
            
            var _currentDoc = DocumentManager.getCurrentDocument();
            var extFile = null;

            oldView = new CompareView({
                id: "old-viewer",
                title: _currentDoc.file.name,
                text: _currentDoc.getText(),
                file: _currentDoc.file,
                mode: CompareView.MODES[FileUtils.getFileExtension(_currentDoc.file.fullPath)],
                onKeyPressed: _onViewKeyPressed,
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

        // Command register
        CommandManager.register(Strings.COMPARE_WITH, CMD_COMPARE, _onShowCompareViews);
        
        CommandManager.register("Show Compare Vertically", CMD_LAYOUT, _onLayoutChange);
        CommandManager.register("Turn off Sticky Views", CMD_STICKYVIEWS, _onStickViews);
        CommandManager.register(Strings.CLOSE_VIEWS, CMD_HIDEVIEW, _onMenuCloseViews);

        // Events
        //$(DocumentManager).on("currentDocumentChange", _onCurrentDocumentChange);

        //Add to the view menus
        viewMenu.addMenuDivider();
        viewMenu.addMenuItem(CMD_LAYOUT);
        viewMenu.addMenuItem(CMD_STICKYVIEWS);
        viewMenu.addMenuItem(CMD_HIDEVIEW);

        CommandManager.get(CMD_LAYOUT).setChecked(gblShowInVerticalView);
        CommandManager.get(CMD_HIDEVIEW).setEnabled(false);

        projectMenu.addMenuDivider();
        projectMenu.addMenuItem(CMD_COMPARE);

        workingSetMenu.addMenuDivider();
        workingSetMenu.addMenuItem(CMD_COMPARE);
    });
});
