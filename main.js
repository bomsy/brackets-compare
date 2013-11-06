/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {
    "use strict";

    var CommandManager  = brackets.getModule("command/CommandManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        Menus           = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager");

    
    // Function to run when the menu item is clicked
    function enableIntellisense() {
        var editor = DocumentManager.getCurrentDocument();
        if (editor) {
            console.log(editor.getText());
            /*for (var p in d){
                if(d.hasOwnProperty(p)){
                    alert(p);
                }
            }*/
        }
    }
    
    
    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID = "intellisense.show";   // package-style naming to avoid collisions
    CommandManager.register("Intellisence", MY_COMMAND_ID, enableIntellisense);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU, true);
    menu.addMenuDivider();
    menu.addMenuItem(MY_COMMAND_ID);

    exports.enableIntellisense = enableIntellisense;
});