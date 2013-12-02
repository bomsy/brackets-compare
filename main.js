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
    
    var comparePanel  = null,
        textArea      = null,
        compareEditor = null,
        compareHeader = null,
        contentModes = {
            html: "text/html",
            css : "css",
            js  : "javascript"
        },
        markup = "<div id='brackets-compare' class='brackets-compare bottom-panel'><span id='compare-header' class='title'> file.js </span><textarea id='compare-textarea' ></textarea></div>";
    
    AppInit.htmlReady(function () {
        // Load stylesheet
        ExtensionUtils.loadStyleSheet(module, "compare.css");
        
        comparePanel = PanelManager.createBottomPanel("compare.comparefile", $(markup), 1000);
        textArea = document.querySelector("#compare-textarea");
        compareHeader = $("#compare-header");
        $(DocumentManager).on("currentDocumentChange", function(){
            comparePanel.hide();
        });
    });

    function loadCodeMirror(contentArea, contentMode){
        return CodeMirror.fromTextArea(contentArea, { 
            mode: contentMode, 
            lineNumbers: true,
            lineWrapping: true
        });
    }
    
    function reloadCodeMirror(contentArea, contentMode){
        if(compareEditor){
            compareEditor.toTextArea();
        }
        compareEditor = loadCodeMirror(contentArea, contentMode);
        compareEditor.setSize(null, "97.55%");
    }
    
    function loadCompareFile(){
        NativeFileSystem.showOpenDialog( false, false, "Choose a file...", " ", null, 
            function(data){
                var filepath = data[0];
                reloadCodeMirror(textArea, contentModes[FileUtils.getFileExtension(filepath)]);
                FileUtils.readAsText(new NativeFileSystem.FileEntry(filepath))
                    .then(function(textContent){
                        if(comparePanel && compareEditor){
                            comparePanel.show();
                            compareHeader.text( " brackets-compare : " + filepath + " ");
                            compareEditor.setValue(textContent);
                            compareEditor.markText({line: 32, ch: 10 },{ line: 32, ch: 20 }, {
                                className: "present"
                            });
                        }
                    }, function(err){
                        console.log(err);
                    });
            }, function(err){
                console.log(err);
            });
    }
    
    // First, register a command - a UI-less object associating an id to a handler
    var COMPARE_COMMAND_ID = "compare.openFileDialog";   // package-style naming to avoid collisions
    CommandManager.register("Compare with... ", COMPARE_COMMAND_ID, loadCompareFile);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var projectCnxtMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
    var workingSetCnxtMenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
    
    projectCnxtMenu.addMenuDivider();
    projectCnxtMenu.addMenuItem(COMPARE_COMMAND_ID);
    
    workingSetCnxtMenu.addMenuDivider();
    workingSetCnxtMenu.addMenuItem(COMPARE_COMMAND_ID);
    
    exports.loadCompareFile = loadCompareFile;
});








