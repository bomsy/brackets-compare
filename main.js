/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {
    "use strict";
    var PanelManager    = brackets.getModule("view/PanelManager"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        Menus           = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager");

    
    // Function to run when the menu item is clicked
    function initialize() {
        var editor = DocumentManager.getCurrentDocument();
        var panel = PanelManager.createBottomPanel("compare.comparefile", $("<div id='compare-panel' class='bottom-panel'><textarea id='compare-code'></textarea></div>"), 100);
        if (editor) {
            CodeMirror.fromTextArea(document.querySelector("#compare-code"), {
                mode: "javascript",
                lineNumbers: true
            });
            $("#compare-code").text("function test(){ return true; }");
            panel.show();
        }
    }
    
    
    // First, register a command - a UI-less object associating an id to a handler
    var COMPARE_COMMAND_ID = "compare.start";   // package-style naming to avoid collisions
    CommandManager.register("Compare with selected file ", COMPARE_COMMAND_ID, initialize);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var projectCnxtMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
    var workingSetCnxtMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
    
    projectCnxtMenu.addMenuDivider();
    projectCnxtMenu.addMenuItem(COMPARE_COMMAND_ID);
    
    workingSetCnxtMenu.addMenuDivider();
    workingSetCnxtMenu.addMenuItem(COMPARE_COMMAND_ID);

    exports.initialize = initialize;
});