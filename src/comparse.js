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
            present: "present",
            absent: "absent",
            diff: "different"
        },
        currLine = 1,
        currPos = -1,
        diff = [], //array of difference objects
        _c1,
        _c2;
    
    function getToken(){
        
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
    function getChar(){
    
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
    function _compare(ch1, ch2){
        var s1, s2;
        if(ch1 !== ch2){
            if(ch1 === " ")
        }
    }
    
    function setOptions(opts){
        opts = opts || defaultOptions;
        for(opt in opts){
            options[opt] = opts[opt]
        }
    }
    // takes texts to be compared and returns a difference object if there
    // are differences and the details flag is true else it returns true if
    // no differences are found and false if differences are found. 
    exports.compare = function(c1, c2, opts){
        setOptions(opts);
        return diff;
    }
})