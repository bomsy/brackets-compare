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
        var oldDiffs = [];
        var newDiffs = [];
        var oldPrevLastLine = 0;
        var newPrevLastLine = 0;
        var oldData;
        var newData;
        for(var i = 0; i < diffs.length; i++) {
            if (diffs[i][0] == -1) {
                oldData = getMetadata(diffs[i][1], oldPrevLastLine);
                oldPrevLastLine = oldData.endLine;
                oldData.status = diffs[i][0];
                oldData.text = diffs[i][1];
                oldDiffs.push(oldData);
                // Specify a line in the old document showing where
                // the data was remove from.
                newDiffs.push({
                    status: oldData.status,
                    startLine: oldData.endLine,
                    endLine: oldData.endLine
                })
            } else if (diffs[i][0] == 1) {
                newData = getMetadata(diffs[i][1], newPrevLastLine);
                newPrevLastLine = newData.endLine;
                newData.status = diffs[i][0];
                newData.text = diffs[i][1];
                newDiffs.push(newData);
                // To specify a line in the old document to show where
                // the data will be added
                oldDiffs.push({
                    status: newData.status,
                    startLine: newData.endLine,
                    endLine: oldData.endLine
                });
            } else {
                // Not adding this to diff lists
                oldData = getMetadata(diffs[i][1], oldPrevLastLine);
                newData = getMetadata(diffs[i][1], newPrevLastLine);
                oldPrevLastLine = oldData.endLine;
                newPrevLastLine = newData.endLine;
                oldData.status = diffs[i][0];
                oldData.text = diffs[i][1];
                newData.status = diffs[i][0];
                newData.text = diffs[i][1];
                //oldDiffs.push(oldData);
                //newDiffs.push(newData);
            }
        }
        return {
            "old": oldDiffs,
            "new": newDiffs
        }
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
        diffs = diff_transform(diffs);
        self.postMessage(diffs);
    }, false);
    
}());