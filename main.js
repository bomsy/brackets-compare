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
        NativeFileSystem          = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils           = brackets.getModule("file/FileUtils");
    
    var compareBridge       = require("diff-bridge"),
        comparseOptions     = {
            zeroLineIndex : true,
            zeroCharIndex : true
        };
    
    var panel  = null,
        mArea   = null,
        cArea   = null, 
        editor = null,
        $mainHeader = null,
        $compareHeader = null,        
        modes = {
            html: "text/html",
            css : "css",
            js  : "javascript"
        },
        markup = "<div id='compare-panel' class='panel bottom-panel'> \
                    <div id='m-header' class='headers'> file.js </div> \
                    <textarea id='m-area' ></textarea> \
                    <div id='c-header' class='headers'> file.js </div> \
                    <textarea id='c-area' > </textarea> \
                 </div>",
            
        prjMenu = null,
        wsMenu = null,        
        compare_command_id = "compare.openFileDialog",
        compare_command_text = "Compare with... ",
        compare_command_panel = "compare.comparefile";
    
    panel = PanelManager.createBottomPanel(compare_command_panel, $(markup), 500);
    
    // Load stylesheet
    ExtensionUtils.loadStyleSheet(module, "compare.css");
        
    // Build the panel
    $mainHeader = $("#m-header");
    $compareHeader = $("#c-header");
    
    mArea = document.querySelector("#m-area");
    cArea = document.querySelector("#c-area");
       
    // Events
    /*$(DocumentManager).on("currentDocumentChange", function(){
        if(panel){ panel.hide(); }
        if(editor){
            editor.main.toTextArea();
            editor.compare.toTextArea();
        }
    });*/
    
    var logErrors = function(err){
        console.log(err);
    };
    
    var read = function (path){
        return FileUtils.readAsText(new NativeFileSystem.FileEntry(path));
    };
    
    var openDialog = function (onError, onSuccess){
        NativeFileSystem.showOpenDialog( false, false, "Choose a file...", " ", null,
            function(data){ onSuccess(data[0]); },
            function(err){ onError(err); });
    };
    
    var extension = function(path){
        return FileUtils.getFileExtension(path);
    };
    
    var reload = function(area, area2, mode){
        /*if(editor){ 
            editor.m.toTextArea(); 
            editor.c.toTextArea();
        }*/
        console.log(mode);
        editor = create(area, area2, mode, "50%");
    };
    
    var create = function(area, area2, mode, size){
        var e = CodeMirror.fromTextArea(area, { 
            theme: 'docs',
            mode: mode, 
            lineNumbers: true, 
            lineWrapping: true 
        });
        var f = CodeMirror.fromTextArea(area2, { 
            theme: 'docs',
            mode: mode, 
            lineNumbers: true, 
            lineWrapping: true 
        });
        //e.setSize(size, size); 
        //f.setSize(size,size);
        return {
            main: e,
            compare: f
        };
    }
    var show = function(area, text){
        area.setValue(text);
    }
    var compare = function(content1, content2){
        //return compareBridge.compare(bracketsEditor.document.getText(),codeMirrorEditor.getValue());
        return compareBridge.compare(content1, content2);
    };
    
    var mark = function (view1, view2, changes){
        console.log(changes);
        changes.forEach(function(change){
            if(change){
                view1.markText({ line: change.old.startLine , ch: change.old.startPos - 1 },
                    { line: change.old.endLine , ch: change.old.endPos }, 
                    { className: change.state });
                
                view2.markText({ line: change.new.startLine , ch: change.new.startPos - 1 },
                    { line: change.new.endLine , ch: change.new.endPos }, 
                    { className: change.state });
            }
        });
    };
    
    //initiates the process
    var run = function(){            
        openDialog(logErrors, function(filepath){
            reload(mArea, cArea, modes[extension(filepath)]);
            read(filepath)
            .then(function(text){
                var changes;
                panel.show();
                    $(DocumentManager).on("currentDocumentChange", function(){
                        if(panel){ panel.hide(); }
                        if(editor){
                            editor.main.toTextArea();
                            editor.compare.toTextArea();
                        }
                    });
                $mainHeader.text(filepath);
                $compareHeader.text(filepath)
                show(editor.main, EditorManager.getActiveEditor().document.getText());
                show(editor.compare,  text);
                changes = compare(editor.main.getValue(), editor.compare.getValue());
                mark(editor.main, editor.compare, changes)
            }, logErrors);
        });
    };
    

    
    

    

    
   // Register a command 
    CommandManager.register(compare_command_text, compare_command_id, run);

    // Create menus bound to the command
    prjMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU, true);
    wsMenu  = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU, true);
    
    prjMenu.addMenuDivider();
    wsMenu.addMenuDivider();
    
    prjMenu.addMenuItem(compare_command_id);
    wsMenu.addMenuItem(compare_command_id);
    
    exports.run = run;
});








