/* compare-task.js
 Worker to handle comparing of the text and return of diffs.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global self, importScripts, require */

importScripts("thirdparty/google-diff-match-patch/diff_match_patch_uncompressed.js");

(function() {
  "use strict";

  function diffLines(oldText, newText) {
    var dmp = new diff_match_patch();

    var a = dmp.diff_linesToChars_(oldText, newText);

    var lineText1 = a["chars1"];
    var lineText2 = a["chars2"];
    var lineArray = a["lineArray"];

    var diffs = dmp.diff_main(lineText1, lineText2, false);

    dmp.diff_cleanupSemantic(diffs);
    dmp.diff_charsToLines_(diffs, lineArray);

    return diffs;
  }

  function diffWords(oldText, newText) {
    var dmp = new diff_match_patch();

    var a = dmp.diff_linesToWords_(oldText, newText);

    var lineText1 = a["chars1"];
    var lineText2 = a["chars2"];
    var lineArray = a["lineArray"];

    var diffs = dmp.diff_main(lineText1, lineText2, false);

    dmp.diff_cleanupSemantic(diffs);
    dmp.diff_charsToLines_(diffs, lineArray);

    return diffs;
  }

  function diffChars(oldText, newText) {
    var dmp = new diff_match_patch();
    return dmp.diff_main(oldText, newText);
  }

  function parseLineDiffs(diffs) {
    var _r = [];
    var _a = []; 
    var oline = 0;
    var nline = 0;
    var o;
    var n;
    for(var i = 0; i < diffs.length; i++) {
      if (diffs[i][0] == -1) {
        o = lineInfo(diffs[i][1], oline);
        _r = _r.concat(o.lines);
        oline = o.currentLine;
      } else if (diffs[i][0] == 1) {
        n = lineInfo(diffs[i][1], nline);
        _a = _a.concat(n.lines);
        nline = n.currentLine;
      } else {
        o = lineInfo(diffs[i][1], oline);
        n = lineInfo(diffs[i][1], nline);
        oline = o.currentLine;
        nline = n.currentLine;
      }
    }
    return {
      removed: _r,
      added: _a
    }
  }
  
  function parseCharDiffs(diffs) {
    var oc = 0;
    var nc = 0;
    var _r = [];
    var _a = [];
    var o;
    var n;
    for(var i = 0; i < diffs.length; i++) {
      if (diffs[i][0] == -1) {
        o = charInfo(diffs[i][1], oc);
        _r.push(o);
        oc = o.to;
      } else if (diffs[i][0] == 1) {
        n = charInfo(diffs[i][1], nc);
        _a.push(n);
        nc = n.to;
      } else {
        o = charInfo(diffs[i][1], oc);
        n = charInfo(diffs[i][1], nc);
        oc = o.to;
        nc = n.to;
      }
    }
    
    return {
      removed: _r,
      added: _a
    }
  }
  
  function lineInfo(text, ln) {
    var end = 0;
    var st = 0;
    var lines = [];
    while (true) {
      end = text.split("").indexOf("\n", st);
      if (end === -1) {
        lines.push(ln); 
        break;
      } else if (end === 0) {
        if (str.charAt(1) === '\n') {
          lines.push(ln);
        } else {
          ln++; 
        }
      } else if (end === text.length - 1) {
        lines.push(ln); 
        ln++;
        break;
      } else { 
        lines.push(ln); 
        ln++; 
      }
      st = end + 1;
    }
    return { 
      lines: lines, 
      currentLine: ln 
    };
  }
  
  function charInfo(text, ch) {  
    return {
      from: ch + 1,
      to: ch + text.length,
    }  
  }
  
  self.addEventListener("message", function(e) {
    var data = e.data;
    var diffs;
    var differ;
    var parser;
    var diffData;

    differ = data.mode === 0 ? diffLines : diffChars;
    parser = data.mode === 0 ? parseLineDiffs : parseCharDiffs;

    diffs = differ(data.o, data.n);
    diffData = parser(diffs);

    diffData.raw =  diffs;
    diffData.mode = data.mode;
    diffData.line = data.line || null;

    self.postMessage(diffData);
  }, false);

}());
