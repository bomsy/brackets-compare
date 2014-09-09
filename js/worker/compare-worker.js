/* compare-task.js
 Worker to handle comparing of the text and return of diffs.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global self, importScripts, require */

importScripts("../plugin/google-diff-match-patch/diff_match_patch_uncompressed.js");

(function() {
    "use strict";
    
    function diffLines(oldText, newText) {
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
    
    function diffWords(oldText, newText) {
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
    
    function lineAnalysis(diffs) {
        var oDiffs = [];
        var nDiffs = [];
        var oline = 0;
        var nline = 0;
        var o;
        var n;
        for(var i = 0; i < diffs.length; i++) {
            if (diffs[i][0] == -1) {
                o = lineInfo(diffs[i][1], oline);
                o.status = diffs[i][0];
                oDiffs.push(o);
                // Look ahead see if it is a replace
                /*if (diffs[i+1][0] == 0 || diffs[i+1][0] == -1) {
                    nDiffs.push({
                        startLine: nline + 1,
                        endLine: nline + 1,
                        status: o.status
                    });
                }*/ 
                oline = o.endLine;
            } else if (diffs[i][0] == 1) {
                n = lineInfo(diffs[i][1], nline);
                n.status = diffs[i][0];
                nDiffs.push(n);
                // Look behind to see if it was a replace
                /*if (diffs[i-1][0] !== -1) {
                    oDiffs.push({ 
                        startLine: oline + 1,
                        endLine: oline + 1,
                        status: n.status
                    });
                }*/ 
                nline = n.endLine;
            } else {
                // Not adding this to diff lists
                o = lineInfo(diffs[i][1], oline);
                n = lineInfo(diffs[i][1], nline);
                oline = o.endLine;
                nline = n.endLine;
            }
        }
        return {
            "old": oDiffs,
            "new": nDiffs
        }
    }
    
    function wordAnalysis(diffs) {
        var oDiffs = [];
        var nDiffs = [];
        var oline = 1, nline = 1;
        var ochar = 0, nchar = 0;
        var o;
        var n;
        // Loop through all diffs    
        for(var i = 0; i < diffs.length; i++) {
            if (diffs[i][0] == -1) {
                o = charInfo(diffs[i][1], oline, ochar);
                o.status = diffs[i][0];               
                oDiffs.push(o);
                oline = o.endLine;
                ochar = o.endChar;
                
            } else if (diffs[i][0] == 1) {
                n = charInfo(diffs[i][1], nline, nchar);
                n.status = diffs[i][0];
                nDiffs.push(n);
                nline = n.endLine;
                nchar = n.endChar;
            } else {
                // Not adding this to diff lists
                o = charInfo(diffs[i][1], oline, ochar);
                n = charInfo(diffs[i][1], nline, nchar);
                oline = o.endLine;
                ochar = o.endChar;
                nline = n.endLine;
                nchar = n.endChar;
            }
        }
        return {
            "old": oDiffs,
            "new": nDiffs
        }
    }
    

    function charInfo(text, ln, ch) {
        var endIndex = 0, 
            startIndex = 0
        var stl, stc = 0, endl, endc;
        
        if (ch !== 0) {
            stc = ch;       
        }
        stl = ln; 
        endc = stc;
        endl = stl;
        while (true) {
            endIndex = text.indexOf("\n", startIndex);
            if (endIndex == -1) {
                endc += text.substring(startIndex).length;
                break;
            }
            if (endIndex >= text.length - 1) {
                endc = 0;
                endl++;
                break;
            }
            
            startIndex = endIndex + 1;
            endl++;
            endc = 0;
        }
        return {
            startLine: stl,
            endLine: endl,
            startChar: stc,
            endChar: endc
        }
    }
    
    function lineInfo(text, ln) {
        var endIndex = 0;
        var startIndex = 0
        var lines = 0;
        while (true) {
            endIndex = text.indexOf("\n", startIndex);
            if (endIndex === -1) {
                break;
            }
            startIndex = endIndex + 1;
            lines++;
        }
        return {
            n: lines,
            startLine: ln, // hack
            endLine: ln + lines
        }
    }

    self.addEventListener("message", function(e) {
        var data = e.data;
        var diffs;
        var d;
        diffs = diffLines(data.o, data.n);
        if (data.mode == 0) {
            d = lineAnalysis(diffs);
        } else {
            d = wordAnalysis(diffs);
        }
        d.raw =  diffs;
        d.mode = data.mode;
        self.postMessage(d);
    }, false);
}());
