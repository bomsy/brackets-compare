// Structure of the change object
/* {
        value: '',
        start: {
            line: [1-n],
            pos:  [0-n]
        },
        end: {
            line: [1-n],
            pos:  [0-n]
        },
        change: 'removed'|'added'|'replaced'
    }
*/
(function(root, mdl){
    // CommonJS
    if(typeof exports === "object" && typeof module === "object"){
        return mdl(exports); 
    }
    // AMD
    if(typeof define === "function" && define.amd){
        return define(["exports"], mdl);
    }
    // Require
    // Browser
    mdl(root.comparse || (root.comparse = {}));
})(this, function(exports){
    var options = {},
        defaultOptions = {
            ignoreSpaces : false,
            words: false,
            detail: true,
        },
        states: {
            ra: "removed_added",
            r: "removed",
            a: "added"
        },
        currLine = 1,
        currPos = -1,
        changes = [], //array of difference objects
        _c1 = null,
        _c2 = null;
    
    var newLine = "\n";
    
    function moveNext(){
        currLine
    }
    function isNewLine(ch){
        return ch === "\n";
    }
    function isSpace(ch){
        return ch === " "; 
    }
    
    function peek(c){
        return c.charAt(currPos + 1);
    }
    function getChar(pos, line){
    
    }
    
    function getWord(c){
        var word = {
            content: "",
            start: null,
            end: null
        };
        var nxtChar = getNext(c);
        while(!isSpace(nxtChar)){
            word.content += nxtChar;
            if(!word.start){
                word.start = { line: currLine, ch: currPos }
            }
            nxtChar = getNext(c);
        }
        word.end { line: currLine, ch: currPos };
        return word;
    }
    
    function getNext(c){
        var nxtChar;
        if(peek(c) === ""){
            return false;
        }
        nxtChar = c.charAt(++currPos);
        if(next === "\n"){
            line++;
        }
        return nxtChar;
    }
    function forEach(){
        
    }
    function compareLines(line1, line2){
    
    }
    
    function lines(){
        // get shorter umber of lines
        var len = _c1.length > _c2.length ? _c2.length : _c1.length;
        var i = 0;
        for(; i < len; i++){
            currLine = i;
            compareLines(_c1[i], _c2[i]);
        }
    }
    
    function getNextLine(){
        return
    }
    
    function parseLines(content){
        var lines = [];
        var lineStart = 0, lineEnd;
        while(true){
            lineEnd = content.indexOf(newLine, lineStart);
            if(lineEnd == -1){
                lines.push(content.slice(lineStart, content.length);
                break;
            }
            lines.push(content.slice(lineStart, lineEnd));              
            lineStart = lineEnd + 1;
        }
        return lines;
    }
        
    function setOptions(opts){
        opts = opts || defaultOptions;
        for(opt in opts){
            options[opt] = opts[opt]
        }
    }
    
    function setContent(ct1, ct2){
        _c1 = parseLines(ct1);
        _c2 = parseLines(ct2);
    }
    // takes texts to be compared and returns a difference object if there
    // are differences and the details flag is true else it returns true if
    // no differences are found and false if differences are found. 
    exports.compare = function(c1, c2, opts){
        setOptions(opts);
        setContent(c1, c2);
    }
})