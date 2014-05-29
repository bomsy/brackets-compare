/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var AppInit          =   brackets.getModule("utils/AppInit"),
        ExtensionUtils   =   brackets.getModule("utils/ExtensionUtils"),
        CommandManager   =   brackets.getModule("command/CommandManager"),
        DocumentManager  =   brackets.getModule("document/DocumentManager"),
        EditorManager    =   brackets.getModule("editor/EditorManager"),
        Menus            =   brackets.getModule("command/Menus"),
        FileSystem       =   brackets.getModule("filesystem/FileSystem"),
        FileUtils        =   brackets.getModule("file/FileUtils"),
        NodeDomain       =   brackets.getModule("utils/NodeDomain"),
        
        CMD_COMPARE         =   "command.compare",
        CMD_LAYOUT          =   "command.layout",
        CMD_STICKYVIEWS      =   "command.strickyViews";
    
    var ComparePanel = require("js/ComparePanel").ComparePanel,
        CompareView = require("js/CompareView").CompareView;

    var gblShowInVerticalView  = true, // False shows in horizontal view
        gblStickyViews         = false; 
    
    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
        var oldView = null , 
            newView = null,
            panel = null;
        
        var workerPath = ExtensionUtils.getModulePath(module, "js/worker/compare-worker.js")
        var worker = new Worker(workerPath);
        
        var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        var projectMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
        var workingSetMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
        
        
        
        // wrapper around FileSystem.showOpenDialog which returns a promise instead.
        function _fsShowOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes) {
            var result = new $.Deferred();
            FileSystem.showOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes,
                function(err, data) {
                    if (!err) {
                        result.resolve(data[0]);
                    } else {
                        result.reject(err)
                    }
                });
            return result.promise();
        }
        
        function _markViews(diffs) {
            console.log(diffs);
            oldView.clearGutter();
            newView.clearGutter();
            oldView.removeAllLines();
            newView.removeAllLines();
            panel.showInfo((diffs.old.length + diffs.new.length) + " changes [ " + diffs.old.length + " removed, " + diffs.new.length + " added ] ");
            for (var i = 0; i < diffs.old.length; i++) {
                oldView.markLines(diffs.old[i].startLine, diffs.old[i].endLine, CompareView.markers.removed);
            }
            for (var j = 0; j < diffs.new.length; j++) {
                newView.markLines( diffs.new[j].startLine, diffs.new[j].endLine, CompareView.markers.added);
            }
        }
        
        function _onWorkerMessage(e) {
            _markViews(e.data);
        }
        
        function _onLayoutChange() {
            gblShowInVerticalView = !gblShowInVerticalView;
            panel.setLayout(gblShowInVerticalView ? ComparePanel.layouts.vertical : ComparePanel.layouts.horizontal);
            CommandManager.get(CMD_LAYOUT).setChecked(gblShowInVerticalView);
        }
         
        function _onCurrentDocumentChange() {
            if(panel !== null) {
                panel.destroy();    
            }
            worker.removeEventListener("message", _onWorkerMessage, false);
        }
        
        function _onViewKeyPressed(editor, e) {
             worker.postMessage({
                oldText : oldView.getText(),
                newText : newView.getText()
            });
        }
        
        function _onStickViews() {
        
        }
        
        function _onCompareViews() {
            if(panel !== null) {
                panel.destroy();
            }
            panel = new ComparePanel({
                layout: gblShowInVerticalView ? ComparePanel.layouts.vertical : ComparePanel.layouts.horizontal
            });
            
            // Setup listener for worker
            worker.addEventListener("message", _onWorkerMessage, false);
            
            var _currentDoc = DocumentManager.getCurrentDocument();
            var extFile = null;
            
            oldView = new CompareView({
                id: "old-viewer",
                title: _currentDoc.file.name,
                text: _currentDoc.getText(),
                mode: CompareView.MODES[FileUtils.getFileExtension(_currentDoc.file.fullPath)],
                onKeyPressed: _onViewKeyPressed
            });
            
            panel.addView(oldView);
            
            _fsShowOpenDialog( false, false, "Choose a file...", "", "")
            .then(function(path) {
                var r = new $.Deferred();
                extFile = FileSystem.getFileForPath(path);
                if (extFile) {
                    r.resolve(extFile);
                } else {
                    r.reject(err);
                }
                return r.promise();
            })
            .then(FileUtils.readAsText)
            .then(function(text) {
                newView = new CompareView({
                    id: "new-viewer",
                    title: extFile.name,
                    text: text,
                    mode: CompareView.MODES[FileUtils.getFileExtension(extFile.fullPath)],
                    onKeyPressed: _onViewKeyPressed
                });
                
                panel.addView(newView);
                panel.load();
                panel.show();
                    
                worker.postMessage({
                    oldText : oldView.getText(),
                    newText : newView.getText()
                });
            });
        }
        
        
        // Command register  
        CommandManager.register("Compare with...", CMD_COMPARE, _onCompareViews);
        
        
        CommandManager.register("Show Diffs Vertically", CMD_LAYOUT, _onLayoutChange);
        CommandManager.register("Sticky Diffs Views", CMD_STICKYVIEWS, _onStickViews);
        
        // Events
        $(DocumentManager).on("currentDocumentChange", _onCurrentDocumentChange);
        
        // Menus
        viewMenu.addMenuDivider();
        viewMenu.addMenuItem(CMD_LAYOUT);   
        viewMenu.addMenuItem(CMD_STICKYVIEWS);
        
        CommandManager.get(CMD_LAYOUT).setChecked(gblShowInVerticalView);
        
        projectMenu.addMenuDivider();
        projectMenu.addMenuItem(CMD_COMPARE);
        
        workingSetMenu.addMenuDivider();
        workingSetMenu.addMenuItem(CMD_COMPARE);
    });
});








