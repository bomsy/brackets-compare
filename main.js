/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that adds a "File > Hello World" menu item. Inserts "Hello, world!" at cursor pos. */
define(function (require, exports, module) {
    "use strict";
    var PanelManager        = brackets.getModule("view/PanelManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        Menus               = brackets.getModule("command/Menus"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        AppInit             = brackets.getModule("utils/AppInit"),
        NativeFileSystem    = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils           = brackets.getModule("file/FileUtils");
    
    var comparse            = require("src/comparse/comparse"),
        comparseOptions     = {
            zeroLineIndex : true,
            zeroCharIndex : true
        };
    
    var panel  = null,
        area   = null,
        editor = null,
        header = null,
        
        modes = {
            html: "text/html",
            css : "css",
            js  : "javascript"
        },
        MARKUP = "<div id='brackets-compare' class='brackets-compare bottom-panel'><span id='compare-header' class='title'> file.js </span><textarea id='compare-textarea' ></textarea></div>",
        
        prjContextMenu = null,
        wsContextMenu = null,
        
        COMPARE_COMMAND_ID = "compare.openFileDialog",
        COMPARE_COMMAND_TEXT = "Compare with... ",
        COMPARE_COMMAND_PANEL = "compare.comparefile";
    
    AppInit.htmlReady(function () {
        // Load stylesheet
        ExtensionUtils.loadStyleSheet(module, "compare.css");
        
        // Build the panel
        panel = PanelManager.createBottomPanel(COMPARE_COMMAND_PANEL, $(MARKUP), 1000);
        
        area = document.querySelector("#compare-textarea");
        header = $("#compare-header");
        
        $(DocumentManager).on("currentDocumentChange", function(){
            panel.hide();
        });
    });
    
    function logError(err){
        console.log(err);
    }
    
    function readFileText(filepath){
        //returns a promise
        return FileUtils.readAsText(new NativeFileSystem.FileEntry(filepath));
    }
       
    function markChangesInEditors(bracketsEditor, codeMirrorEditor){
        console.log(bracketsEditor.document.getText() == codeMirrorEditor.getValue());
       comparse.parse(bracketsEditor.document.getText(), codeMirrorEditor.getValue(), comparseOptions)
            .forEach(function(change){
                codeMirrorEditor.markText(
                    { line: change.line , ch: change.after.startpos },
                    { line: change.line , ch: change.after.endpos + 1 }, 
                    { className: change.change });
                console.log(change);
            });
    }
    
    function getFileExtension(filepath){
        return FileUtils.getFileExtension(filepath);
    }
    function reloadEditor(area, mode){
        if(editor){ editor.toTextArea(); }
        editor = loadEditor(area, mode, "97.55%");
    }
    
    function loadEditor(area, mode, size){
        var e = CodeMirror.fromTextArea(area, { mode: mode, lineNumbers: true, lineWrapping: true });
        e.setSize(null, size); 
        return e;
    }
    
    function openDialog(onError, onSuccess){
        NativeFileSystem.showOpenDialog( 
            false, false, "Choose a file...", " ", null,
            function(data){ 
                onSuccess(data[0]); 
            },
            function(err){ 
                onError(err); 
            });
    }
    
    function saveEditor(){
    
    }
    
    function load(){            
        openDialog(logError, function(filepath){
            reloadEditor(area, modes[getFileExtension(filepath)]);
            readFileText(filepath)
                .then(function(text){
                    panel.show();
                    header.text(filepath);
                    editor.setValue(text);
                    markChangesInEditors(EditorManager.getActiveEditor(), editor)
                }, logError);
        });
    }
    
    // First, register a command - a UI-less object associating an id to a handler
    // package-style naming to avoid collisions
    CommandManager.register(COMPARE_COMMAND_TEXT, COMPARE_COMMAND_ID, load);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    prjContextMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
    wsContextMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
    
    prjContextMenu.addMenuDivider();
    prjContextMenu.addMenuItem(COMPARE_COMMAND_ID);
    
    wsContextMenu.addMenuDivider();
    wsContextMenu.addMenuItem(COMPARE_COMMAND_ID);
    
    exports.load = load;
});








