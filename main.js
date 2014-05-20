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
        COMPARE_CMD_ID   =   "start.compare",
        COMPARE_CMD_TEXT =   "Compare with...";
    
    var ComparePanel = require("js/ComparePanel").ComparePanel,
        CompareView = require("js/CompareView").CompareView;
    
    AppInit.appReady(function() {
        
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
        
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
         
        
        var panel = null;
        
        // Command register  
        CommandManager.register(COMPARE_CMD_TEXT, COMPARE_CMD_ID, function() {
            if(panel !== null) {
                panel.destroy();
            }
            panel = new ComparePanel({});
            
            var _currentDoc = DocumentManager.getCurrentDocument();
            var extFile = null;
            
            var mx = new CompareView({
                id: "mx",
                title: _currentDoc.file.name,
                text: _currentDoc.getText(),
                mode: CompareView.MODES[FileUtils.getFileExtension(_currentDoc.file.fullPath)]
            });
            panel.addView(mx);
            
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
                var cx = new CompareView({
                    id: "cx",
                    title: extFile.name,
                    text: text,
                    mode: CompareView.MODES[FileUtils.getFileExtension(extFile.fullPath)]
                });
                
                panel.addView(cx);
                panel.load();
                panel.show();
            });
        });
        
        // Events
        $(DocumentManager).on("currentDocumentChange", function() {
            if(panel !== null) {
                panel.destroy();    
            }
        });
        
        // Menus
        projectMenu.addMenuDivider();
        projectMenu.addMenuItem(COMPARE_CMD_ID);
        
        workingSetMenu.addMenuDivider();
        workingSetMenu.addMenuItem(COMPARE_CMD_ID);
    });
});








