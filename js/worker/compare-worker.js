/* compare-task.js
 Worker to handle comparing of the text and return of diffs.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global self, importScripts, require */

importScripts("../plugin/google-diff-match-patch/diff_match_patch_uncompressed.js");

(function() {
    "use strict";
    
    function diff_lineMode(text1, text2) {
        var dmp = new diff_match_patch();
        var a = dmp.diff_linesToChars_(text1, text2);
        var lineText1 = a["chars1"];
        var lineText2 = a["chars2"];
        var lineArray = a["lineArray"];

        var diffs = dmp.diff_main(lineText1, lineText2, false);

        dmp.diff_charsToLines_(diffs, lineArray);
        dmp.diff_cleanupSemantic(diffs);
        return diffs;
    }
    
    function diff_transform(diffs) {
        var transformDiffs = [];
        var prevLastline = 0;
        var meta;
        for(var i = 0; i < diffs.length; i++) {
            meta = getMetadata(diffs[i][1], prevLastline);
            prevLastline = meta.endLine;
            meta.status = diffs[i][0];
            meta.text = diffs[i][1];
            transformDiffs.push(meta);
        }
        return transformDiffs;
    }
    
    function getMetadata(diffText, prevContentLastLine) {
        var lineEndIndex = 0;
        var lineStartIndex = 0
        var lastLineEndIndex = 0;
        var lines = 0;
         while(true) {
            lineEndIndex = diffText.indexOf("\n", lineStartIndex);
            // End of the lines
            if (lineEndIndex == -1) {
                break;
            }
            lastLineEndIndex = lineEndIndex - lineStartIndex; //no of characters on the last line
            lineStartIndex = lineEndIndex + 1;
            lines++;
        } 
        return {
            startLine: prevContentLastLine + 1,
            startChar: 0,
            endLine: prevContentLastLine + lines,
            endChar: lastLineEndIndex
        }
    }
    
    self.addEventListener("message", function(e) {
        var data = e.data;
        var diffs = diff_lineMode(data.text1, data.text2);
        var transformedDiff = diff_transform(diffs);
        self.postMessage(transformedDiff);
    }, false);
    
}());