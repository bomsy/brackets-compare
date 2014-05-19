/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var AppInit          =   brackets.getModule("utils/AppInit"),
        ExtensionUtils   =   brackets.getModule("utils/ExtensionUtils"),
        CommandManager   =   brackets.getModule("command/CommandManager"),
        DocumentManager  =   brackets.getModule("document/DocumentManager"),
        Menus            =   brackets.getModule("command/Menus"),
        FileSystem       =   brackets.getModule("filesystem/FileSystem"),
        FileUtils        =   brackets.getModule("file/FileUtils"),
        COMPARE_CMD_ID   =   "start.compare",
        COMPARE_CMD_TEXT =   "Compare with...";
    
    var ComparePanel = require("js/ComparePanel").ComparePanel,
        CompareView = require("js/CompareView").CompareView;
    
    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
        
        var helpMenu = Menus.getMenu(Menus.AppMenuBar.HELP_MENU);
        var projectMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
        var workingSetMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
        
        var panel = new ComparePanel({});
        
        var e1 = new CompareView({
            id: "mx",
            title: "michelin.js",
            text: "asdfa asdasdasda  asdfas"
        });
        
        var e2 = new CompareView({
            id: "cx",
            title: "asdf.js",
            text: "atdatatsda asasd asdas"
        });
        
        panel.addView(e1);
        panel.addView(e2);
        panel.load();
        
        // Command register
        CommandManager.register(COMPARE_CMD_TEXT, COMPARE_CMD_ID, function() {
            panel.show();
            FileSystem.showOpenDialog( 
                false,
                false,
                "Choose a file...",
                "",
                null,
                function(data) { console.log(data); },
                function(err) { });
        });
        
        // Events
        $(DocumentManager).on("currentDocumentChange", function() {
            panel.hide();    
        });
        
        // Menus
        projectMenu.addMenuDivider();
        projectMenu.addMenuItem(COMPARE_CMD_ID);
        
        workingSetMenu.addMenuDivider();
        workingSetMenu.addMenuItem(COMPARE_CMD_ID);
        
        helpMenu.addMenuItem(COMPARE_CMD_ID);
    });
});








