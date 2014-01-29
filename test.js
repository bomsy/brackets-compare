define(function(require, exports, module){
    "use strict";
    var diff = require("src/diff/diff");
    var codes = {
        lineBreak: 10
    }
    var states = {
        added: 'added',
        removed: 'removed',
        replaced: 'replaced'
    }
    var oldLineIndex = 0;
    var newLineIndex = 0;
    var oldCharIndex = 0;
    var newCharIndex = 0;
    var brigdedChanges = [];
    var _compare = function(oldText, newText,  options){
        var changes = JsDiff.diffWords(oldText, newText);
        //condense changes (ie. bind together consecutive add and remove)
        for(var j = 0; j < changes.length; j++){
            if(changes[j].removed && (changes[j-1] && changes[j-1].added)){
                changes[j-1].removed = true;
                changes[j-1].old = {
                    value: changes[j-1].value
                }
                changes[j-1].new = { 
                    value: changes[j].
                }
                changes[j] = 'blank';
            }
            if(changes[j].added === undefined && changes[j].removed === undefined){
                changes[j].added = false;
                changes[j].removed = false;
                changes[j].old = {
                    value: changes[j].value
                }
                changes[j].new = { 
                    value: changes[j].value
                }
            }
            if(changes[j].added === true && changes[j].removed === undefined){
                changes[j].removed = false;
                changes[j].old = {
                    value: ''
                }
                changes[j].new = {
                    value: changes[j].value
                }

            }
            if(changes[j].added === undefined && changes[j].removed === true){
                changes[j].added = false;
                changes[j].old = {
                    value: changes[j].value
                }
                changes[j].new = {
                    value: ''
                }
            }
        }
        changes.forEach(function(o){
            var i = 0;
            if(o.added === true && o.removed === false){
                while(i < o.new.value.length){
                    if(o.new.value.charCodeAt(i) === codes.lineBreak){
                        newLineIndex++;
                        newCharIndex = 0;
                    } else {
                        newCharIndex++;
                    }
                    if(i == 0){
                        o.new.startPos = newCharIndex;
                        o.new.startLine = newLineIndex;
                    }
                    if(i == o.new.value.length - 1){
                        o.new.endPos = newCharIndex;
                        o.new.endLine = newLineIndex;
                    }
                    o.old.startPos = o.old.endPos = oldCharIndex;
                    o.old.startLine = o.old.endLine = oldLineIndex;
                    i++;
                }
                o.state = states.added;
            }
            if(o.added === false && o.removed === true){
                while(i < o.old.value.length){
                    if(o.old.value.charCodeAt(i) === codes.lineBreak){
                        oldLineIndex++;
                        oldCharIndex = 0;
                    } else {
                        oldCharIndex++;
                    }
                    if(i == 0){
                        o.old.startPos = oldCharIndex;
                        o.old.startLine = oldLineIndex;
                    }
                    if(i == o.old.value.length - 1){
                        o.old.endPos = oldCharIndex;
                        o.old.endLine = oldLineIndex;
                    }
                    o.new.startPos = o.new.endPos = oldCharIndex;
                    o.new.startLine = o.new.endLine = newLineIndex;
                    i++;
                }
                o.state = states.removed;
            }
            if(o.added === false && o.removed === false){
                while(i < o.value.length){
                    if(o.value.charCodeAt(i) === codes.lineBreak){
                        oldLineIndex++;
                        newLineIndex++;
                        oldCharIndex = 0;
                        newCharIndex = 0;
                    } else {
                        oldCharIndex++;
                        newCharIndex++;
                    }
                    if(i == 0){
                        o.old.startPos = oldCharIndex;
                        o.old.startLine = oldLineIndex;
                        o.new.startPos = newCharIndex;
                        o.new.startLine = newLineIndex;
                    }
                    if(i == o.value.length - 1){
                        o.old.endPos = oldCharIndex;
                        o.old.endLine = oldLineIndex;
                        o.new.endPos = newCharIndex;
                        o.new.endLine = newLineIndex;
                    }
                    i++;
                }
                o.state = undefined;
            }
            if(o.added === true && o.removed === true){
                while(i < o.old.value.length){
                    if(o.old.value.charCodeAt(i) === codes.lineBreak){
                        oldLineIndex++;
                        oldCharIndex = 0;
                    } else {
                        oldCharIndex++;
                    }
                    if(i == 0){
                        o.old.startPos = oldCharIndex;
                        o.old.startLine = oldLineIndex;
                    }
                    if(i == o.old.value.length - 1){
                        o.old.endPos = oldCharIndex;
                        o.old.endLine = oldLineIndex;
                    }
                    i++;
                }
                i = 0;
                while(i < o.new.value.length){
                    if(o.new.value.charCodeAt(i) === codes.lineBreak){
                        newLineIndex++;
                        newCharIndex = 0;
                    } else {
                        newCharIndex++;
                    }
                    if(i == 0){
                        o.new.startPos = newCharIndex;
                        o.new.startLine = newLineIndex;
                    }
                    if(i == o.new.value.length - 1){
                        o.new.endPos = newCharIndex;
                        o.new.endLine = newLineIndex;
                    }
                    i++;
                }
                o.state = states.replaced;
            }
        });
        console.log(changes);
        return changes.map(function(change){
            if(change !== 'blank'){
                return change;
            }
        });
    }
    
    
    exports.compare = _compare;
});