/* compare-task.js
 Worker to handle comparing of the text and return of diffs.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global self, importScripts, require */

importScripts("../plugin/google-diff-match-patch/diff_match_patch_uncompressed.js");

(function() {
    "use strict";
    
    function diff_lineMode(oldText, newText) {
        var dmp = new diff_match_patch();
        var a = dmp.diff_linesToChars_(oldText, newText);
        var lineText1 = a["chars1"];
        var lineText2 = a["chars2"];
        var lineArray = a["lineArray"];

        var diffs = dmp.diff_main(lineText1, lineText2, false);

        dmp.diff_charsToLines_(diffs, lineArray);
        dmp.diff_cleanupSemantic(diffs);
        return diffs;
    }
    
    function diff_wordMode(oldText, newText) {
        var dmp = new diff_match_patch();
        var a = dmp.diff_linesToWords_(oldText, newText);
        var lineText1 = a["chars1"];
        var lineText2 = a["chars2"];
        var lineArray = a["lineArray"];

        var diffs = dmp.diff_main(lineText1, lineText2, false);

        dmp.diff_charsToLines_(diffs, lineArray);
        dmp.diff_cleanupSemantic(diffs);
        return diffs;
    }
    
    function diffTransform(diffs) {
        var oDiffs = [];
        var nDiffs = [];
        var oldPrevLastLine = 0;
        var newPrevLastLine = 0;
        var o;
        var n;
        for(var i = 0; i < diffs.length; i++) {
            if (diffs[i][0] == -1) {
                o = extractMeta(diffs[i][1], oldPrevLastLine);
                o.status = diffs[i][0];
                oDiffs.push(o);
                // Look ahead see if it is a replace
                if (diffs[i+1][0] == 0 || diffs[i+1][0] == -1) {
                    nDiffs.push({
                        startLine: newPrevLastLine + 1,
                        endLine: newPrevLastLine + 1,
                        status: o.status
                    });
                } 
                oldPrevLastLine = o.endLine;
            } else if (diffs[i][0] == 1) {
                n = extractMeta(diffs[i][1], newPrevLastLine);
                n.status = diffs[i][0];
                nDiffs.push(n);
                // Look behind to see if it was a replace
                if (diffs[i-1][0] !== -1) {
                    oDiffs.push({ 
                        startLine: oldPrevLastLine + 1,
                        endLine: oldPrevLastLine + 1,
                        status: n.status
                    });
                } 
                newPrevLastLine = n.endLine;
            } else {
                // Not adding this to diff lists
                o = extractMeta(diffs[i][1], oldPrevLastLine);
                n = extractMeta(diffs[i][1], newPrevLastLine);
                oldPrevLastLine = o.endLine;
                newPrevLastLine = n.endLine;
            }
        }
        return {
            "old": oDiffs,
            "new": nDiffs
        }
    }
    
        function diffTransformWords(diffs) {
        var oDiffs = [];
        var nDiffs = [];
        var oldPrevLastLine = 1;
        var newPrevLastLine = 1;
        var oldPrevLastChar = 0;
        var newPrevLastChar = 0;
        var o;
        var n;
        for(var i = 0; i < diffs.length; i++) {
            if (diffs[i][0] == -1) {
                o = extractCharMeta(diffs[i][1], oldPrevLastLine, oldPrevLastChar);
                o.status = diffs[i][0];
                o.text = diffs[i][1];
                oDiffs.push(o);
                oldPrevLastLine = o.endLine;
                oldPrevLastChar = o.endChar;
                
            } else if (diffs[i][0] == 1) {
                n = extractCharMeta(diffs[i][1], newPrevLastLine, newPrevLastChar);
                n.status = diffs[i][0];
                n.text = diffs[i][1];
                
                nDiffs.push(n);
                newPrevLastLine = n.endLine;
                newPrevLastChar = n.endChar;
            } else {
                // Not adding this to diff lists
                o = extractCharMeta(diffs[i][1], oldPrevLastLine, oldPrevLastChar);
                n = extractCharMeta(diffs[i][1], newPrevLastLine, newPrevLastChar);
                o.status = diffs[i][0];
                o.text = diffs[i][1];
                n.status = diffs[i][0];
                n.text = diffs[i][1];
                oDiffs.push(o);
                nDiffs.push(n);
                oldPrevLastLine = o.endLine;
                oldPrevLastChar = o.endChar;
                newPrevLastLine = n.endLine;
                newPrevLastChar = n.endChar;
            }
        }
        return {
            "old": oDiffs,
            "new": nDiffs
        }
    }
    

    function extractCharMeta(text, prevContentLastLine, prevContentLastChar) {
        var lineEndIndex = 0;
        var lineStartIndex = 0
        var lines = 0;
        var ch = 0;
        var stl = prevContentLastLine;
        var stc = prevContentLastChar;
        var flag = false;
        
        while(true) {
            lineEndIndex = text.indexOf("\n", lineStartIndex);
            if (lineEndIndex == -1) {
                stc += text.substring(lineStartIndex).length;
                break;
            }
            if (lineEndIndex >= text.length - 1) {
                stc = 0;
                stl++;
                lines++
                break;
            }
            
            lineStartIndex = lineEndIndex + 1;
            stl++;
            stc = 0;
            lines++;
        }
        return {
            startLine: prevContentLastLine,
            endLine: stl,
            startChar: prevContentLastChar,
            endChar: stc
        }
    }
    
    function extractMeta(text, prevContentLastLine) {
        var lineEndIndex = 0;
        var lineStartIndex = 0
        var lastLineEndIndex = 0;
        var lines = 0;
        while(true) {
            lineEndIndex = text.indexOf("\n", lineStartIndex);
            if (lineEndIndex == -1) {
                break;
            }
            lastLineEndIndex = lineEndIndex - lineStartIndex;
            lineStartIndex = lineEndIndex + 1;
            lines++;
        }
        return {
            startLine: prevContentLastLine + 1,
            endLine: prevContentLastLine + lines
        }
    }

    self.addEventListener("message", function(e) {
        var data = e.data;
        var diffs;
        var d;
        if(data.mode == 0) {
            diffs = diff_lineMode(data.o, data.n);
            d = diffTransform(diffs);
        } else {
            diffs = diff_wordMode(data.o, data.n);
            d = diffTransformWords(diffs);
        }
        d.raw = diffs
        d.mode = data.mode;
        self.postMessage(d);
    }, false);
}());
