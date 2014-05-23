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
        COMPARE_CMD_ID   =   "start.compare",
        COMPARE_CMD_TEXT =   "Compare with...";
    
    var ComparePanel = require("js/ComparePanel").ComparePanel,
        CompareView = require("js/CompareView").CompareView;

    
    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
        var oldView = null , 
            newView = null,
            panel = null;
        
        var workerPath = ExtensionUtils.getModulePath(module, "js/worker/compare-worker.js")
        var worker = new Worker(workerPath);
        
        var projectMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
        var workingSetMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
        
        
        
        //wrapper around FileSystem.showOpenDialog which returns a promise instead.
        function fsShowOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes) {
            var result = new $.Deferred();
            FileSystem.showOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes,
                function(err, data) {
                    if(!err) {
                        result.resolve(data[0]);
                    } else {
                        result.reject(err)
                    }
                });
            return result.promise();
        }
        
        function markViews(diffs) {
            var replacedLines = {};
            for (var i = 0; i < diffs.old.length; i++) {
                oldView.markLines( diffs.old[i].startLine, diffs.old[i].endLine, CompareView.markers.removed);
            }
            console.log(replacedLines);
            for (var j = 0; j < diffs.new.length; j++) {
                newView.markLines( diffs.new[j].startLine, diffs.new[j].endLine, CompareView.markers.added);
            }
        }
        
        function onWorkerMessage(e) {
            markViews(e.data);
        }
         
        
        
        
        // Command register  
        CommandManager.register(COMPARE_CMD_TEXT, COMPARE_CMD_ID, function() {
            if(panel !== null) {
                panel.destroy();
            }
            panel = new ComparePanel({});
            
            // Setup listener for worker
            worker.addEventListener("message", onWorkerMessage, false);
            
            var _currentDoc = DocumentManager.getCurrentDocument();
            var extFile = null;
            
            oldView = new CompareView({
                id: "old-viewer",
                title: _currentDoc.file.name,
                text: _currentDoc.getText(),
                mode: CompareView.MODES[FileUtils.getFileExtension(_currentDoc.file.fullPath)]
            });
            panel.addView(oldView);
            
            fsShowOpenDialog( false, false, "Choose a file...", "", "")
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
                    mode: CompareView.MODES[FileUtils.getFileExtension(extFile.fullPath)]
                });
                
                panel.addView(newView);
                panel.load();
                panel.show();
                
                
                worker.postMessage({
                    text1: oldView.getText(),
                    text2: newView.getText()
                });
            });
        });
        
        // Events
        $(DocumentManager).on("currentDocumentChange", function() {
            if(panel !== null) {
                panel.destroy();    
            }
            // remove listener for worker
            worker.removeEventListener("message", onWorkerMessage, false);
        });
        
        // Menus
        projectMenu.addMenuDivider();
        projectMenu.addMenuItem(COMPARE_CMD_ID);
        
        workingSetMenu.addMenuDivider();
        workingSetMenu.addMenuItem(COMPARE_CMD_ID);
    });
});








