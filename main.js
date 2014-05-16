/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {  
    "use strict";
    var AppInit = brackets.getModule("utils/AppInit"),
        ExtensionUtils  =   brackets.getModule("utils/ExtensionUtils"),
        CommandManager = brackets.getModule("command/CommandManager"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        Menus = brackets.getModule("command/Menus"),
        COMPARE_CMD_ID = "start.compare";
    
    var ComparePanel = require("js/ComparePanel").ComparePanel,
        CompareEditor = require("js/CompareEditor").CompareEditor;
    
    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
        
        var helpMenu = Menus.getMenu(Menus.AppMenuBar.HELP_MENU);
        
        var mainPanel = new ComparePanel({});
        
        var topEditor = new CompareEditor({
            id: "mx",
            title: "michelin.js",
            text: "asdfa asdasdasda  asdfas"
        });
        
        var bottomEditor = new CompareEditor({
            id: "cx",
            title: "asdf.js",
            text: "atdatatsda asasd asdas"
        });
        
        mainPanel.addView(topEditor);
        mainPanel.addView(bottomEditor);
        mainPanel.load();
        
        CommandManager.register("Start compare tool", COMPARE_CMD_ID, function() {
            mainPanel.show();
        });
        
        $(DocumentManager).on("currentDocumentChange", function() {
            mainPanel.hide(); 
        });
        
        helpMenu.addMenuItem(COMPARE_CMD_ID);
    });
});








