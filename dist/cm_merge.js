// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// declare global: diff_match_patch, DIFF_INSERT, DIFF_DELETE, DIFF_EQUAL
define(function (require, exports, module) {
  "use strict";

  var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
  var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
  var FileUtils = brackets.getModule("file/FileUtils");

  var Pos = CodeMirror.Pos;
  var svgNS = "http://www.w3.org/2000/svg";

  function DiffView(mv, type) {
    this.mv = mv;
    this.type = type;
    this.classes = type == "left" ? { chunk: "CodeMirror-merge-l-chunk",
      start: "CodeMirror-merge-l-chunk-start",
      end: "CodeMirror-merge-l-chunk-end",
      insert: "CodeMirror-merge-l-inserted",
      del: "CodeMirror-merge-l-deleted",
      connect: "CodeMirror-merge-l-connect" } : { chunk: "CodeMirror-merge-r-chunk",
      start: "CodeMirror-merge-r-chunk-start",
      end: "CodeMirror-merge-r-chunk-end",
      insert: "CodeMirror-merge-r-inserted",
      del: "CodeMirror-merge-r-deleted",
      connect: "CodeMirror-merge-r-connect" };
  }

  DiffView.prototype = {
    constructor: DiffView,
    init: function init(pane, orig, options) {
      this.edit = this.mv.edit;
      (this.edit.state.diffViews || (this.edit.state.diffViews = [])).push(this);
      this.orig = CodeMirror(pane, copyObj({
        value: orig,
        readOnly: !this.mv.options.allowEditingOriginals
      }, copyObj(options)));
      this.orig.state.diffViews = [this];

      this.diff = getDiff(asString(orig), asString(options.value));
      this.chunks = getChunks(this.diff);
      this.diffOutOfDate = this.dealigned = false;

      this.showDifferences = options.showDifferences !== false;
      this.forceUpdate = registerUpdate(this);
      setScrollLock(this, true, false);
      registerScroll(this);
    },
    setShowDifferences: function setShowDifferences(val) {
      val = val !== false;
      if (val != this.showDifferences) {
        this.showDifferences = val;
        this.forceUpdate("full");
      }
    }
  };

  function ensureDiff(dv) {
    if (dv.diffOutOfDate) {
      dv.diff = getDiff(dv.orig.getValue(), dv.edit.getValue());
      dv.chunks = getChunks(dv.diff);
      dv.diffOutOfDate = false;
      CodeMirror.signal(dv.edit, "updateDiff", dv.diff);
    }
  }

  var updating = false;
  function registerUpdate(dv) {
    var edit = { from: 0, to: 0, marked: [] };
    var orig = { from: 0, to: 0, marked: [] };
    var debounceChange,
        updatingFast = false;
    function update(mode) {
      updating = true;
      updatingFast = false;
      if (mode == "full") {
        if (dv.svg) clear(dv.svg);
        if (dv.copyButtons) clear(dv.copyButtons);
        clearMarks(dv.edit, edit.marked, dv.classes);
        clearMarks(dv.orig, orig.marked, dv.classes);
        edit.from = edit.to = orig.from = orig.to = 0;
      }
      ensureDiff(dv);
      if (dv.showDifferences) {
        updateMarks(dv.edit, dv.diff, edit, DIFF_INSERT, dv.classes);
        updateMarks(dv.orig, dv.diff, orig, DIFF_DELETE, dv.classes);
      }
      makeConnections(dv);

      if (dv.mv.options.connect == "align") alignChunks(dv);
      updating = false;
    }
    function setDealign(fast) {
      if (updating) {
        return;
      }dv.dealigned = true;
      set(fast);
    }
    function set(fast) {
      if (updating || updatingFast) {
        return;
      }clearTimeout(debounceChange);
      if (fast === true) updatingFast = true;
      debounceChange = setTimeout(update, fast === true ? 20 : 250);
    }
    function change(_cm, change) {
      if (!dv.diffOutOfDate) {
        dv.diffOutOfDate = true;
        edit.from = edit.to = orig.from = orig.to = 0;
      }
      // Update faster when a line was added/removed
      setDealign(change.text.length - 1 != change.to.line - change.from.line);
    }

    dv.edit.on("change", change);
    dv.orig.on("change", change);
    dv.edit.on("markerAdded", setDealign);
    dv.edit.on("markerCleared", setDealign);
    dv.orig.on("markerAdded", setDealign);
    dv.orig.on("markerCleared", setDealign);
    dv.edit.on("viewportChange", function () {
      set(false);
    });
    dv.orig.on("viewportChange", function () {
      set(false);
    });
    update();
    return update;
  }

  function registerScroll(dv) {
    dv.edit.on("scroll", function () {
      syncScroll(dv, DIFF_INSERT) && makeConnections(dv);
    });
    dv.orig.on("scroll", function () {
      syncScroll(dv, DIFF_DELETE) && makeConnections(dv);
    });
  }

  function syncScroll(dv, type) {
    // Change handler will do a refresh after a timeout when diff is out of date
    if (dv.diffOutOfDate) {
      return false;
    }if (!dv.lockScroll) {
      return true;
    }var editor,
        other,
        now = +new Date();
    if (type == DIFF_INSERT) {
      editor = dv.edit;other = dv.orig;
    } else {
      editor = dv.orig;other = dv.edit;
    }
    // Don't take action if the position of this editor was recently set
    // (to prevent feedback loops)
    if (editor.state.scrollSetBy == dv && (editor.state.scrollSetAt || 0) + 50 > now) {
      return false;
    }var sInfo = editor.getScrollInfo();
    if (dv.mv.options.connect == "align") {
      targetPos = sInfo.top;
    } else {
      var halfScreen = 0.5 * sInfo.clientHeight,
          midY = sInfo.top + halfScreen;
      var mid = editor.lineAtHeight(midY, "local");
      var around = chunkBoundariesAround(dv.chunks, mid, type == DIFF_INSERT);
      var off = getOffsets(editor, type == DIFF_INSERT ? around.edit : around.orig);
      var offOther = getOffsets(other, type == DIFF_INSERT ? around.orig : around.edit);
      var ratio = (midY - off.top) / (off.bot - off.top);
      var targetPos = offOther.top - halfScreen + ratio * (offOther.bot - offOther.top);

      var botDist, mix;
      // Some careful tweaking to make sure no space is left out of view
      // when scrolling to top or bottom.
      if (targetPos > sInfo.top && (mix = sInfo.top / halfScreen) < 1) {
        targetPos = targetPos * mix + sInfo.top * (1 - mix);
      } else if ((botDist = sInfo.height - sInfo.clientHeight - sInfo.top) < halfScreen) {
        var otherInfo = other.getScrollInfo();
        var botDistOther = otherInfo.height - otherInfo.clientHeight - targetPos;
        if (botDistOther > botDist && (mix = botDist / halfScreen) < 1) targetPos = targetPos * mix + (otherInfo.height - otherInfo.clientHeight - botDist) * (1 - mix);
      }
    }

    other.scrollTo(sInfo.left, targetPos);
    other.state.scrollSetAt = now;
    other.state.scrollSetBy = dv;
    return true;
  }

  function getOffsets(editor, around) {
    var bot = around.after;
    if (bot == null) bot = editor.lastLine() + 1;
    return { top: editor.heightAtLine(around.before || 0, "local"),
      bot: editor.heightAtLine(bot, "local") };
  }

  function setScrollLock(dv, val, action) {
    dv.lockScroll = val;
    if (val && action != false) syncScroll(dv, DIFF_INSERT) && makeConnections(dv);
    dv.lockButton.innerHTML = val ? "⇛⇚" : "⇛&nbsp;&nbsp;⇚";
  }

  // Updating the marks for editor content

  function clearMarks(editor, arr, classes) {
    for (var i = 0; i < arr.length; ++i) {
      var mark = arr[i];
      if (mark instanceof CodeMirror.TextMarker) {
        mark.clear();
      } else if (mark.parent) {
        editor.removeLineClass(mark, "background", classes.chunk);
        editor.removeLineClass(mark, "background", classes.start);
        editor.removeLineClass(mark, "background", classes.end);
      }
    }
    arr.length = 0;
  }

  // FIXME maybe add a margin around viewport to prevent too many updates
  function updateMarks(editor, diff, state, type, classes) {
    var vp = editor.getViewport();
    editor.operation(function () {
      if (state.from == state.to || vp.from - state.to > 20 || state.from - vp.to > 20) {
        clearMarks(editor, state.marked, classes);
        markChanges(editor, diff, type, state.marked, vp.from, vp.to, classes);
        state.from = vp.from;state.to = vp.to;
      } else {
        if (vp.from < state.from) {
          markChanges(editor, diff, type, state.marked, vp.from, state.from, classes);
          state.from = vp.from;
        }
        if (vp.to > state.to) {
          markChanges(editor, diff, type, state.marked, state.to, vp.to, classes);
          state.to = vp.to;
        }
      }
    });
  }

  function markChanges(editor, diff, type, marks, from, to, classes) {
    var pos = Pos(0, 0);
    var top = Pos(from, 0),
        bot = editor.clipPos(Pos(to - 1));
    var cls = type == DIFF_DELETE ? classes.del : classes.insert;
    function markChunk(start, end) {
      var bfrom = Math.max(from, start),
          bto = Math.min(to, end);
      for (var i = bfrom; i < bto; ++i) {
        var line = editor.addLineClass(i, "background", classes.chunk);
        if (i == start) editor.addLineClass(line, "background", classes.start);
        if (i == end - 1) editor.addLineClass(line, "background", classes.end);
        marks.push(line);
      }
      // When the chunk is empty, make sure a horizontal line shows up
      if (start == end && bfrom == end && bto == end) {
        if (bfrom) marks.push(editor.addLineClass(bfrom - 1, "background", classes.end));else marks.push(editor.addLineClass(bfrom, "background", classes.start));
      }
    }

    var chunkStart = 0;
    for (var i = 0; i < diff.length; ++i) {
      var part = diff[i],
          tp = part[0],
          str = part[1];
      if (tp == DIFF_EQUAL) {
        var cleanFrom = pos.line + (startOfLineClean(diff, i) ? 0 : 1);
        moveOver(pos, str);
        var cleanTo = pos.line + (endOfLineClean(diff, i) ? 1 : 0);
        if (cleanTo > cleanFrom) {
          if (i) markChunk(chunkStart, cleanFrom);
          chunkStart = cleanTo;
        }
      } else {
        if (tp == type) {
          var end = moveOver(pos, str, true);
          var a = posMax(top, pos),
              b = posMin(bot, end);
          if (!posEq(a, b)) marks.push(editor.markText(a, b, { className: cls }));
          pos = end;
        }
      }
    }
    if (chunkStart <= pos.line) markChunk(chunkStart, pos.line + 1);
  }

  // Updating the gap between editor and original

  function makeConnections(dv) {
    if (!dv.showDifferences) {
      return;
    }if (dv.svg) {
      clear(dv.svg);
      var w = dv.gap.offsetWidth;
      attrs(dv.svg, "width", w, "height", dv.gap.offsetHeight);
    }
    if (dv.copyButtons) clear(dv.copyButtons);

    var vpEdit = dv.edit.getViewport(),
        vpOrig = dv.orig.getViewport();
    var sTopEdit = dv.edit.getScrollInfo().top,
        sTopOrig = dv.orig.getScrollInfo().top;
    for (var i = 0; i < dv.chunks.length; i++) {
      var ch = dv.chunks[i];
      if (ch.editFrom <= vpEdit.to && ch.editTo >= vpEdit.from && ch.origFrom <= vpOrig.to && ch.origTo >= vpOrig.from) drawConnectorsForChunk(dv, ch, sTopOrig, sTopEdit, w);
    }
  }

  function getMatchingOrigLine(editLine, chunks) {
    var editStart = 0,
        origStart = 0;
    for (var i = 0; i < chunks.length; i++) {
      var chunk = chunks[i];
      if (chunk.editTo > editLine && chunk.editFrom <= editLine) {
        return null;
      }if (chunk.editFrom > editLine) break;
      editStart = chunk.editTo;
      origStart = chunk.origTo;
    }
    return origStart + (editLine - editStart);
  }

  function findAlignedLines(dv, other) {
    var linesToAlign = [];
    for (var i = 0; i < dv.chunks.length; i++) {
      var chunk = dv.chunks[i];
      linesToAlign.push([chunk.origTo, chunk.editTo, other ? getMatchingOrigLine(chunk.editTo, other.chunks) : null]);
    }
    if (other) {
      for (var i = 0; i < other.chunks.length; i++) {
        var chunk = other.chunks[i];
        for (var j = 0; j < linesToAlign.length; j++) {
          var align = linesToAlign[j];
          if (align[1] == chunk.editTo) {
            j = -1;
            break;
          } else if (align[1] > chunk.editTo) {
            break;
          }
        }
        if (j > -1) linesToAlign.splice(j - 1, 0, [getMatchingOrigLine(chunk.editTo, dv.chunks), chunk.editTo, chunk.origTo]);
      }
    }
    return linesToAlign;
  }

  function alignChunks(dv, force) {
    if (!dv.dealigned && !force) {
      return;
    }if (!dv.orig.curOp) {
      return dv.orig.operation(function () {
        alignChunks(dv, force);
      });
    }dv.dealigned = false;
    var other = dv.mv.left == dv ? dv.mv.right : dv.mv.left;
    if (other) {
      ensureDiff(other);
      other.dealigned = false;
    }
    var linesToAlign = findAlignedLines(dv, other);

    // Clear old aligners
    var aligners = dv.mv.aligners;
    for (var i = 0; i < aligners.length; i++) aligners[i].clear();
    aligners.length = 0;

    var cm = [dv.orig, dv.edit],
        scroll = [];
    if (other) cm.push(other.orig);
    for (var i = 0; i < cm.length; i++) scroll.push(cm[i].getScrollInfo().top);

    for (var ln = 0; ln < linesToAlign.length; ln++) alignLines(cm, linesToAlign[ln], aligners);

    for (var i = 0; i < cm.length; i++) cm[i].scrollTo(null, scroll[i]);
  }

  function alignLines(cm, lines, aligners) {
    var maxOffset = 0,
        offset = [];
    for (var i = 0; i < cm.length; i++) if (lines[i] != null) {
      var off = cm[i].heightAtLine(lines[i], "local");
      offset[i] = off;
      maxOffset = Math.max(maxOffset, off);
    }
    for (var i = 0; i < cm.length; i++) if (lines[i] != null) {
      var diff = maxOffset - offset[i];
      if (diff > 1) aligners.push(padAbove(cm[i], lines[i], diff));
    }
  }

  function padAbove(cm, line, size) {
    var above = true;
    if (line > cm.lastLine()) {
      line--;
      above = false;
    }
    var elt = document.createElement("div");
    elt.className = "CodeMirror-merge-spacer";
    elt.style.height = size + "px";elt.style.minWidth = "1px";
    return cm.addLineWidget(line, elt, { height: size, above: above });
  }

  function drawConnectorsForChunk(dv, chunk, sTopOrig, sTopEdit, w) {
    var flip = dv.type == "left";
    var top = dv.orig.heightAtLine(chunk.origFrom, "local") - sTopOrig;
    if (dv.svg) {
      var topLpx = top;
      var topRpx = dv.edit.heightAtLine(chunk.editFrom, "local") - sTopEdit;
      if (flip) {
        var tmp = topLpx;topLpx = topRpx;topRpx = tmp;
      }
      var botLpx = dv.orig.heightAtLine(chunk.origTo, "local") - sTopOrig;
      var botRpx = dv.edit.heightAtLine(chunk.editTo, "local") - sTopEdit;
      if (flip) {
        var tmp = botLpx;botLpx = botRpx;botRpx = tmp;
      }
      var curveTop = " C " + w / 2 + " " + topRpx + " " + w / 2 + " " + topLpx + " " + (w + 2) + " " + topLpx;
      var curveBot = " C " + w / 2 + " " + botLpx + " " + w / 2 + " " + botRpx + " -1 " + botRpx;
      attrs(dv.svg.appendChild(document.createElementNS(svgNS, "path")), "d", "M -1 " + topRpx + curveTop + " L " + (w + 2) + " " + botLpx + curveBot + " z", "class", dv.classes.connect);
    }
    if (dv.copyButtons) {
      var copy = dv.copyButtons.appendChild(elt("div", dv.type == "left" ? "⇝" : "⇜", "CodeMirror-merge-copy"));
      var editOriginals = dv.mv.options.allowEditingOriginals;
      copy.title = editOriginals ? "Push to left" : "Revert chunk";
      copy.chunk = chunk;
      copy.style.top = top + "px";

      if (editOriginals) {
        var topReverse = dv.orig.heightAtLine(chunk.editFrom, "local") - sTopEdit;
        var copyReverse = dv.copyButtons.appendChild(elt("div", dv.type == "right" ? "⇝" : "⇜", "CodeMirror-merge-copy-reverse"));
        copyReverse.title = "Push to right";
        copyReverse.chunk = { editFrom: chunk.origFrom, editTo: chunk.origTo,
          origFrom: chunk.editFrom, origTo: chunk.editTo };
        copyReverse.style.top = topReverse + "px";
        dv.type == "right" ? copyReverse.style.left = "2px" : copyReverse.style.right = "2px";
      }
    }
  }

  function copyChunk(dv, to, from, chunk) {
    if (dv.diffOutOfDate) {
      return;
    }var editStart = chunk.editTo > to.lastLine() ? Pos(chunk.editFrom - 1) : Pos(chunk.editFrom, 0);
    var origStart = chunk.origTo > from.lastLine() ? Pos(chunk.origFrom - 1) : Pos(chunk.origFrom, 0);
    to.replaceRange(from.getRange(origStart, Pos(chunk.origTo, 0)), editStart, Pos(chunk.editTo, 0));
  }

  // Merge view, containing 0, 1, or 2 diff views.

  var MergeView = CodeMirror.MergeView = function (node, options) {
    if (!(this instanceof MergeView)) return new MergeView(node, options);

    this.options = options;
    var origLeft = options.origLeft,
        origRight = options.origRight == null ? options.orig : options.origRight;

    var hasLeft = origLeft != null,
        hasRight = origRight != null;
    var panes = 1 + (hasLeft ? 1 : 0) + (hasRight ? 1 : 0);
    var wrap = [],
        left = this.left = null,
        right = this.right = null;
    var self = this;

    if (hasLeft) {
      left = this.left = new DiffView(this, "left");
      var leftPane = elt("div", null, "CodeMirror-merge-pane");
      wrap.push(leftPane);
      wrap.push(buildGap(left));
    }

    var editPane = elt("div", null, "CodeMirror-merge-pane");
    wrap.push(editPane);

    if (hasRight) {
      right = this.right = new DiffView(this, "right");
      wrap.push(buildGap(right));
      var rightPane = elt("div", null, "CodeMirror-merge-pane");
      wrap.push(rightPane);
    }

    (hasRight ? rightPane : editPane).className += " CodeMirror-merge-pane-rightmost";

    wrap.push(elt("div", null, null, "height: 0; clear: both;"));

    var wrapElt = this.wrap = node.appendChild(elt("div", wrap, "CodeMirror-merge CodeMirror-merge-" + panes + "pane"));
    this.edit = CodeMirror(editPane, copyObj(options));

    if (left) left.init(leftPane, origLeft, options);
    if (right) right.init(rightPane, origRight, options);

    if (options.collapseIdentical) this.editor().operation(function () {
      collapseIdenticalStretches(self, options.collapseIdentical);
    });
    if (options.connect == "align") {
      this.aligners = [];
      alignChunks(this.left || this.right, true);
    }

    var onResize = function onResize() {
      if (left) makeConnections(left);
      if (right) makeConnections(right);
    };
    CodeMirror.on(window, "resize", onResize);
    var resizeInterval = setInterval(function () {
      for (var p = wrapElt.parentNode; p && p != document.body; p = p.parentNode) {}
      if (!p) {
        clearInterval(resizeInterval);CodeMirror.off(window, "resize", onResize);
      }
    }, 5000);
  };

  function buildGap(dv) {
    var lock = dv.lockButton = elt("div", null, "CodeMirror-merge-scrolllock");
    lock.title = "Toggle locked scrolling";
    var lockWrap = elt("div", [lock], "CodeMirror-merge-scrolllock-wrap");
    CodeMirror.on(lock, "click", function () {
      setScrollLock(dv, !dv.lockScroll);
    });
    var gapElts = [lockWrap];
    if (dv.mv.options.revertButtons !== false) {
      dv.copyButtons = elt("div", null, "CodeMirror-merge-copybuttons-" + dv.type);
      CodeMirror.on(dv.copyButtons, "click", function (e) {
        var node = e.target || e.srcElement;
        if (!node.chunk) return;
        if (node.className == "CodeMirror-merge-copy-reverse") {
          copyChunk(dv, dv.orig, dv.edit, node.chunk);
          return;
        }
        copyChunk(dv, dv.edit, dv.orig, node.chunk);
      });
      gapElts.unshift(dv.copyButtons);
    }
    if (dv.mv.options.connect != "align") {
      var svg = document.createElementNS && document.createElementNS(svgNS, "svg");
      if (svg && !svg.createSVGRect) svg = null;
      dv.svg = svg;
      if (svg) gapElts.push(svg);
    }

    return dv.gap = elt("div", gapElts, "CodeMirror-merge-gap");
  }

  MergeView.prototype = {
    constuctor: MergeView,
    editor: function editor() {
      return this.edit;
    },
    rightOriginal: function rightOriginal() {
      return this.right && this.right.orig;
    },
    leftOriginal: function leftOriginal() {
      return this.left && this.left.orig;
    },
    setShowDifferences: function setShowDifferences(val) {
      if (this.right) this.right.setShowDifferences(val);
      if (this.left) this.left.setShowDifferences(val);
    },
    rightChunks: function rightChunks() {
      if (this.right) {
        ensureDiff(this.right);return this.right.chunks;
      }
    },
    leftChunks: function leftChunks() {
      if (this.left) {
        ensureDiff(this.left);return this.left.chunks;
      }
    }
  };

  function asString(obj) {
    if (typeof obj == "string") {
      return obj;
    } else {
      return obj.getValue();
    }
  }

  // Operations on diffs

  var dmp = new diff_match_patch();
  function getDiff(a, b) {
    var diff = dmp.diff_main(a, b);
    dmp.diff_cleanupSemantic(diff);
    // The library sometimes leaves in empty parts, which confuse the algorithm
    for (var i = 0; i < diff.length; ++i) {
      var part = diff[i];
      if (!part[1]) {
        diff.splice(i--, 1);
      } else if (i && diff[i - 1][0] == part[0]) {
        diff.splice(i--, 1);
        diff[i][1] += part[1];
      }
    }
    return diff;
  }

  function getChunks(diff) {
    var chunks = [];
    var startEdit = 0,
        startOrig = 0;
    var edit = Pos(0, 0),
        orig = Pos(0, 0);
    for (var i = 0; i < diff.length; ++i) {
      var part = diff[i],
          tp = part[0];
      if (tp == DIFF_EQUAL) {
        var startOff = startOfLineClean(diff, i) ? 0 : 1;
        var cleanFromEdit = edit.line + startOff,
            cleanFromOrig = orig.line + startOff;
        moveOver(edit, part[1], null, orig);
        var endOff = endOfLineClean(diff, i) ? 1 : 0;
        var cleanToEdit = edit.line + endOff,
            cleanToOrig = orig.line + endOff;
        if (cleanToEdit > cleanFromEdit) {
          if (i) chunks.push({ origFrom: startOrig, origTo: cleanFromOrig,
            editFrom: startEdit, editTo: cleanFromEdit });
          startEdit = cleanToEdit;startOrig = cleanToOrig;
        }
      } else {
        moveOver(tp == DIFF_INSERT ? edit : orig, part[1]);
      }
    }
    if (startEdit <= edit.line || startOrig <= orig.line) chunks.push({ origFrom: startOrig, origTo: orig.line + 1,
      editFrom: startEdit, editTo: edit.line + 1 });
    return chunks;
  }

  function endOfLineClean(diff, i) {
    if (i == diff.length - 1) {
      return true;
    }var next = diff[i + 1][1];
    if (next.length == 1 || next.charCodeAt(0) != 10) {
      return false;
    }if (i == diff.length - 2) {
      return true;
    }next = diff[i + 2][1];
    return next.length > 1 && next.charCodeAt(0) == 10;
  }

  function startOfLineClean(diff, i) {
    if (i == 0) {
      return true;
    }var last = diff[i - 1][1];
    if (last.charCodeAt(last.length - 1) != 10) {
      return false;
    }if (i == 1) {
      return true;
    }last = diff[i - 2][1];
    return last.charCodeAt(last.length - 1) == 10;
  }

  function chunkBoundariesAround(chunks, n, nInEdit) {
    var beforeE, afterE, beforeO, afterO;
    for (var i = 0; i < chunks.length; i++) {
      var chunk = chunks[i];
      var fromLocal = nInEdit ? chunk.editFrom : chunk.origFrom;
      var toLocal = nInEdit ? chunk.editTo : chunk.origTo;
      if (afterE == null) {
        if (fromLocal > n) {
          afterE = chunk.editFrom;afterO = chunk.origFrom;
        } else if (toLocal > n) {
          afterE = chunk.editTo;afterO = chunk.origTo;
        }
      }
      if (toLocal <= n) {
        beforeE = chunk.editTo;beforeO = chunk.origTo;
      } else if (fromLocal <= n) {
        beforeE = chunk.editFrom;beforeO = chunk.origFrom;
      }
    }
    return { edit: { before: beforeE, after: afterE }, orig: { before: beforeO, after: afterO } };
  }

  function collapseSingle(cm, from, to) {
    cm.addLineClass(from, "wrap", "CodeMirror-merge-collapsed-line");
    var widget = document.createElement("span");
    widget.className = "CodeMirror-merge-collapsed-widget";
    widget.title = "Identical text collapsed. Click to expand.";
    var mark = cm.markText(Pos(from, 0), Pos(to - 1), {
      inclusiveLeft: true,
      inclusiveRight: true,
      replacedWith: widget,
      clearOnEnter: true
    });
    function clear() {
      mark.clear();
      cm.removeLineClass(from, "wrap", "CodeMirror-merge-collapsed-line");
    }
    CodeMirror.on(widget, "click", clear);
    return { mark: mark, clear: clear };
  }

  function collapseStretch(size, editors) {
    var marks = [];
    function clear() {
      for (var i = 0; i < marks.length; i++) marks[i].clear();
    }
    for (var i = 0; i < editors.length; i++) {
      var editor = editors[i];
      var mark = collapseSingle(editor.cm, editor.line, editor.line + size);
      marks.push(mark);
      mark.mark.on("clear", clear);
    }
    return marks[0].mark;
  }

  function unclearNearChunks(dv, margin, off, clear) {
    for (var i = 0; i < dv.chunks.length; i++) {
      var chunk = dv.chunks[i];
      for (var l = chunk.editFrom - margin; l < chunk.editTo + margin; l++) {
        var pos = l + off;
        if (pos >= 0 && pos < clear.length) clear[pos] = false;
      }
    }
  }

  function collapseIdenticalStretches(mv, margin) {
    if (typeof margin != "number") margin = 2;
    var clear = [],
        edit = mv.editor(),
        off = edit.firstLine();
    for (var l = off, e = edit.lastLine(); l <= e; l++) clear.push(true);
    if (mv.left) unclearNearChunks(mv.left, margin, off, clear);
    if (mv.right) unclearNearChunks(mv.right, margin, off, clear);

    for (var i = 0; i < clear.length; i++) {
      if (clear[i]) {
        var line = i + off;
        for (var size = 1; i < clear.length - 1 && clear[i + 1]; i++, size++) {}
        if (size > margin) {
          var editors = [{ line: line, cm: edit }];
          if (mv.left) editors.push({ line: getMatchingOrigLine(line, mv.left.chunks), cm: mv.left.orig });
          if (mv.right) editors.push({ line: getMatchingOrigLine(line, mv.right.chunks), cm: mv.right.orig });
          var mark = collapseStretch(size, editors);
          if (mv.options.onCollapse) mv.options.onCollapse(mv, line, size, mark);
        }
      }
    }
  }

  // General utilities

  function elt(tag, content, className, style) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (style) e.style.cssText = style;
    if (typeof content == "string") e.appendChild(document.createTextNode(content));else if (content) for (var i = 0; i < content.length; ++i) e.appendChild(content[i]);
    return e;
  }

  function clear(node) {
    for (var count = node.childNodes.length; count > 0; --count) node.removeChild(node.firstChild);
  }

  function attrs(elt) {
    for (var i = 1; i < arguments.length; i += 2) elt.setAttribute(arguments[i], arguments[i + 1]);
  }

  function copyObj(obj, target) {
    if (!target) target = {};
    for (var prop in obj) if (obj.hasOwnProperty(prop)) target[prop] = obj[prop];
    return target;
  }

  function moveOver(pos, str, copy, other) {
    var out = copy ? Pos(pos.line, pos.ch) : pos,
        at = 0;
    for (;;) {
      var nl = str.indexOf("\n", at);
      if (nl == -1) break;
      ++out.line;
      if (other) ++other.line;
      at = nl + 1;
    }
    out.ch = (at ? 0 : out.ch) + (str.length - at);
    if (other) other.ch = (at ? 0 : other.ch) + (str.length - at);
    return out;
  }

  function posMin(a, b) {
    return (a.line - b.line || a.ch - b.ch) < 0 ? a : b;
  }
  function posMax(a, b) {
    return (a.line - b.line || a.ch - b.ch) > 0 ? a : b;
  }
  function posEq(a, b) {
    return a.line == b.line && a.ch == b.ch;
  }

  function findPrevDiff(chunks, start, isOrig) {
    for (var i = chunks.length - 1; i >= 0; i--) {
      var chunk = chunks[i];
      var to = (isOrig ? chunk.origTo : chunk.editTo) - 1;
      if (to < start) {
        return to;
      }
    }
  }

  function findNextDiff(chunks, start, isOrig) {
    for (var i = 0; i < chunks.length; i++) {
      var chunk = chunks[i];
      var from = isOrig ? chunk.origFrom : chunk.editFrom;
      if (from > start) {
        return from;
      }
    }
  }

  function goNearbyDiff(cm, dir) {
    var found = null,
        views = cm.state.diffViews,
        line = cm.getCursor().line;
    if (views) for (var i = 0; i < views.length; i++) {
      var dv = views[i],
          isOrig = cm == dv.orig;
      ensureDiff(dv);
      var pos = dir < 0 ? findPrevDiff(dv.chunks, line, isOrig) : findNextDiff(dv.chunks, line, isOrig);
      if (pos != null && (found == null || (dir < 0 ? pos > found : pos < found))) found = pos;
    }
    if (found != null) cm.setCursor(found, 0);else {
      return CodeMirror.Pass;
    }
  }

  CodeMirror.commands.goNextDiff = function (cm) {
    return goNearbyDiff(cm, 1);
  };
  CodeMirror.commands.goPrevDiff = function (cm) {
    return goNearbyDiff(cm, -1);
  };
});
//# sourceMappingURL=data:application/json;base64,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TUFBTSxHQUFHLEVBQUUsQ0FBQSxBQUFDLENBQUM7QUFDOUQsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxXQUFTLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUEsR0FBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUFFO0FBQzlFLFdBQVMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFBRSxXQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQSxHQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQUU7QUFDOUUsV0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUFFLFdBQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztHQUFFOztBQUVqRSxXQUFTLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtBQUMzQyxTQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDM0MsVUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLFVBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQSxHQUFJLENBQUMsQ0FBQztBQUNwRCxVQUFJLEVBQUUsR0FBRyxLQUFLO0FBQUUsZUFBTyxFQUFFLENBQUM7T0FBQTtLQUMzQjtHQUNGOztBQUVELFdBQVMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO0FBQzNDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3RDLFVBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixVQUFJLElBQUksR0FBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxBQUFDLENBQUM7QUFDdEQsVUFBSSxJQUFJLEdBQUcsS0FBSztBQUFFLGVBQU8sSUFBSSxDQUFDO09BQUE7S0FDL0I7R0FDRjs7QUFFRCxXQUFTLFlBQVksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0FBQzdCLFFBQUksS0FBSyxHQUFHLElBQUk7UUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTO1FBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFDekUsUUFBSSxLQUFLLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUFFLE1BQU0sR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztBQUMxQyxnQkFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2YsVUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2xHLFVBQUksR0FBRyxJQUFJLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFBLENBQUMsQUFBQyxFQUN6RSxLQUFLLEdBQUcsR0FBRyxDQUFDO0tBQ2Y7QUFDRCxRQUFJLEtBQUssSUFBSSxJQUFJLEVBQ2YsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFdkIsYUFBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0tBQUE7R0FDMUI7O0FBRUQsWUFBVSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsVUFBUyxFQUFFLEVBQUU7QUFDNUMsV0FBTyxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQzVCLENBQUM7QUFDRixZQUFVLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxVQUFTLEVBQUUsRUFBRTtBQUM1QyxXQUFPLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUM3QixDQUFDO0NBQ0gsQ0FBQyxDQUFDIiwiZmlsZSI6ImNtX21lcmdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29kZU1pcnJvciwgY29weXJpZ2h0IChjKSBieSBNYXJpam4gSGF2ZXJiZWtlIGFuZCBvdGhlcnNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIGFuIE1JVCBsaWNlbnNlOiBodHRwOi8vY29kZW1pcnJvci5uZXQvTElDRU5TRVxuXG4vLyBkZWNsYXJlIGdsb2JhbDogZGlmZl9tYXRjaF9wYXRjaCwgRElGRl9JTlNFUlQsIERJRkZfREVMRVRFLCBESUZGX0VRVUFMXG5kZWZpbmUoKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkgPT4ge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgXG4gIHZhciBDb2RlTWlycm9yID0gYnJhY2tldHMuZ2V0TW9kdWxlKFwidGhpcmRwYXJ0eS9Db2RlTWlycm9yMi9saWIvY29kZW1pcnJvclwiKTtcbiAgbGV0IEV4dGVuc2lvblV0aWxzID0gYnJhY2tldHMuZ2V0TW9kdWxlKCd1dGlscy9FeHRlbnNpb25VdGlscycpO1xuICBsZXQgRmlsZVV0aWxzID0gYnJhY2tldHMuZ2V0TW9kdWxlKCdmaWxlL0ZpbGVVdGlscycpO1xuICBcbiAgdmFyIFBvcyA9IENvZGVNaXJyb3IuUG9zO1xuICB2YXIgc3ZnTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG5cbiAgZnVuY3Rpb24gRGlmZlZpZXcobXYsIHR5cGUpIHtcbiAgICB0aGlzLm12ID0gbXY7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmNsYXNzZXMgPSB0eXBlID09IFwibGVmdFwiXG4gICAgICA/IHtjaHVuazogXCJDb2RlTWlycm9yLW1lcmdlLWwtY2h1bmtcIixcbiAgICAgICAgIHN0YXJ0OiBcIkNvZGVNaXJyb3ItbWVyZ2UtbC1jaHVuay1zdGFydFwiLFxuICAgICAgICAgZW5kOiBcIkNvZGVNaXJyb3ItbWVyZ2UtbC1jaHVuay1lbmRcIixcbiAgICAgICAgIGluc2VydDogXCJDb2RlTWlycm9yLW1lcmdlLWwtaW5zZXJ0ZWRcIixcbiAgICAgICAgIGRlbDogXCJDb2RlTWlycm9yLW1lcmdlLWwtZGVsZXRlZFwiLFxuICAgICAgICAgY29ubmVjdDogXCJDb2RlTWlycm9yLW1lcmdlLWwtY29ubmVjdFwifVxuICAgICAgOiB7Y2h1bms6IFwiQ29kZU1pcnJvci1tZXJnZS1yLWNodW5rXCIsXG4gICAgICAgICBzdGFydDogXCJDb2RlTWlycm9yLW1lcmdlLXItY2h1bmstc3RhcnRcIixcbiAgICAgICAgIGVuZDogXCJDb2RlTWlycm9yLW1lcmdlLXItY2h1bmstZW5kXCIsXG4gICAgICAgICBpbnNlcnQ6IFwiQ29kZU1pcnJvci1tZXJnZS1yLWluc2VydGVkXCIsXG4gICAgICAgICBkZWw6IFwiQ29kZU1pcnJvci1tZXJnZS1yLWRlbGV0ZWRcIixcbiAgICAgICAgIGNvbm5lY3Q6IFwiQ29kZU1pcnJvci1tZXJnZS1yLWNvbm5lY3RcIn07XG4gIH1cblxuICBEaWZmVmlldy5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IERpZmZWaWV3LFxuICAgIGluaXQ6IGZ1bmN0aW9uKHBhbmUsIG9yaWcsIG9wdGlvbnMpIHtcbiAgICAgIHRoaXMuZWRpdCA9IHRoaXMubXYuZWRpdDtcbiAgICAgICh0aGlzLmVkaXQuc3RhdGUuZGlmZlZpZXdzIHx8ICh0aGlzLmVkaXQuc3RhdGUuZGlmZlZpZXdzID0gW10pKS5wdXNoKHRoaXMpO1xuICAgICAgdGhpcy5vcmlnID0gQ29kZU1pcnJvcihwYW5lLCBjb3B5T2JqKHtcbiAgICAgICAgdmFsdWU6IG9yaWcsXG4gICAgICAgIHJlYWRPbmx5OiAhdGhpcy5tdi5vcHRpb25zLmFsbG93RWRpdGluZ09yaWdpbmFsc1xuICAgICAgfSwgY29weU9iaihvcHRpb25zKSkpO1xuICAgICAgdGhpcy5vcmlnLnN0YXRlLmRpZmZWaWV3cyA9IFt0aGlzXTtcblxuICAgICAgdGhpcy5kaWZmID0gZ2V0RGlmZihhc1N0cmluZyhvcmlnKSwgYXNTdHJpbmcob3B0aW9ucy52YWx1ZSkpO1xuICAgICAgdGhpcy5jaHVua3MgPSBnZXRDaHVua3ModGhpcy5kaWZmKTtcbiAgICAgIHRoaXMuZGlmZk91dE9mRGF0ZSA9IHRoaXMuZGVhbGlnbmVkID0gZmFsc2U7XG5cbiAgICAgIHRoaXMuc2hvd0RpZmZlcmVuY2VzID0gb3B0aW9ucy5zaG93RGlmZmVyZW5jZXMgIT09IGZhbHNlO1xuICAgICAgdGhpcy5mb3JjZVVwZGF0ZSA9IHJlZ2lzdGVyVXBkYXRlKHRoaXMpO1xuICAgICAgc2V0U2Nyb2xsTG9jayh0aGlzLCB0cnVlLCBmYWxzZSk7XG4gICAgICByZWdpc3RlclNjcm9sbCh0aGlzKTtcbiAgICB9LFxuICAgIHNldFNob3dEaWZmZXJlbmNlczogZnVuY3Rpb24odmFsKSB7XG4gICAgICB2YWwgPSB2YWwgIT09IGZhbHNlO1xuICAgICAgaWYgKHZhbCAhPSB0aGlzLnNob3dEaWZmZXJlbmNlcykge1xuICAgICAgICB0aGlzLnNob3dEaWZmZXJlbmNlcyA9IHZhbDtcbiAgICAgICAgdGhpcy5mb3JjZVVwZGF0ZShcImZ1bGxcIik7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGZ1bmN0aW9uIGVuc3VyZURpZmYoZHYpIHtcbiAgICBpZiAoZHYuZGlmZk91dE9mRGF0ZSkge1xuICAgICAgZHYuZGlmZiA9IGdldERpZmYoZHYub3JpZy5nZXRWYWx1ZSgpLCBkdi5lZGl0LmdldFZhbHVlKCkpO1xuICAgICAgZHYuY2h1bmtzID0gZ2V0Q2h1bmtzKGR2LmRpZmYpO1xuICAgICAgZHYuZGlmZk91dE9mRGF0ZSA9IGZhbHNlO1xuICAgICAgQ29kZU1pcnJvci5zaWduYWwoZHYuZWRpdCwgXCJ1cGRhdGVEaWZmXCIsIGR2LmRpZmYpO1xuICAgIH1cbiAgfVxuXG4gIHZhciB1cGRhdGluZyA9IGZhbHNlO1xuICBmdW5jdGlvbiByZWdpc3RlclVwZGF0ZShkdikge1xuICAgIHZhciBlZGl0ID0ge2Zyb206IDAsIHRvOiAwLCBtYXJrZWQ6IFtdfTtcbiAgICB2YXIgb3JpZyA9IHtmcm9tOiAwLCB0bzogMCwgbWFya2VkOiBbXX07XG4gICAgdmFyIGRlYm91bmNlQ2hhbmdlLCB1cGRhdGluZ0Zhc3QgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiB1cGRhdGUobW9kZSkge1xuICAgICAgdXBkYXRpbmcgPSB0cnVlO1xuICAgICAgdXBkYXRpbmdGYXN0ID0gZmFsc2U7XG4gICAgICBpZiAobW9kZSA9PSBcImZ1bGxcIikge1xuICAgICAgICBpZiAoZHYuc3ZnKSBjbGVhcihkdi5zdmcpO1xuICAgICAgICBpZiAoZHYuY29weUJ1dHRvbnMpIGNsZWFyKGR2LmNvcHlCdXR0b25zKTtcbiAgICAgICAgY2xlYXJNYXJrcyhkdi5lZGl0LCBlZGl0Lm1hcmtlZCwgZHYuY2xhc3Nlcyk7XG4gICAgICAgIGNsZWFyTWFya3MoZHYub3JpZywgb3JpZy5tYXJrZWQsIGR2LmNsYXNzZXMpO1xuICAgICAgICBlZGl0LmZyb20gPSBlZGl0LnRvID0gb3JpZy5mcm9tID0gb3JpZy50byA9IDA7XG4gICAgICB9XG4gICAgICBlbnN1cmVEaWZmKGR2KTtcbiAgICAgIGlmIChkdi5zaG93RGlmZmVyZW5jZXMpIHtcbiAgICAgICAgdXBkYXRlTWFya3MoZHYuZWRpdCwgZHYuZGlmZiwgZWRpdCwgRElGRl9JTlNFUlQsIGR2LmNsYXNzZXMpO1xuICAgICAgICB1cGRhdGVNYXJrcyhkdi5vcmlnLCBkdi5kaWZmLCBvcmlnLCBESUZGX0RFTEVURSwgZHYuY2xhc3Nlcyk7XG4gICAgICB9XG4gICAgICBtYWtlQ29ubmVjdGlvbnMoZHYpO1xuXG4gICAgICBpZiAoZHYubXYub3B0aW9ucy5jb25uZWN0ID09IFwiYWxpZ25cIilcbiAgICAgICAgYWxpZ25DaHVua3MoZHYpO1xuICAgICAgdXBkYXRpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0RGVhbGlnbihmYXN0KSB7XG4gICAgICBpZiAodXBkYXRpbmcpIHJldHVybjtcbiAgICAgIGR2LmRlYWxpZ25lZCA9IHRydWU7XG4gICAgICBzZXQoZmFzdCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldChmYXN0KSB7XG4gICAgICBpZiAodXBkYXRpbmcgfHwgdXBkYXRpbmdGYXN0KSByZXR1cm47XG4gICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VDaGFuZ2UpO1xuICAgICAgaWYgKGZhc3QgPT09IHRydWUpIHVwZGF0aW5nRmFzdCA9IHRydWU7XG4gICAgICBkZWJvdW5jZUNoYW5nZSA9IHNldFRpbWVvdXQodXBkYXRlLCBmYXN0ID09PSB0cnVlID8gMjAgOiAyNTApO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjaGFuZ2UoX2NtLCBjaGFuZ2UpIHtcbiAgICAgIGlmICghZHYuZGlmZk91dE9mRGF0ZSkge1xuICAgICAgICBkdi5kaWZmT3V0T2ZEYXRlID0gdHJ1ZTtcbiAgICAgICAgZWRpdC5mcm9tID0gZWRpdC50byA9IG9yaWcuZnJvbSA9IG9yaWcudG8gPSAwO1xuICAgICAgfVxuICAgICAgLy8gVXBkYXRlIGZhc3RlciB3aGVuIGEgbGluZSB3YXMgYWRkZWQvcmVtb3ZlZFxuICAgICAgc2V0RGVhbGlnbihjaGFuZ2UudGV4dC5sZW5ndGggLSAxICE9IGNoYW5nZS50by5saW5lIC0gY2hhbmdlLmZyb20ubGluZSk7XG4gICAgfVxuICAgIFxuICAgIGR2LmVkaXQub24oXCJjaGFuZ2VcIiwgY2hhbmdlKTtcbiAgICBkdi5vcmlnLm9uKFwiY2hhbmdlXCIsIGNoYW5nZSk7XG4gICAgZHYuZWRpdC5vbihcIm1hcmtlckFkZGVkXCIsIHNldERlYWxpZ24pO1xuICAgIGR2LmVkaXQub24oXCJtYXJrZXJDbGVhcmVkXCIsIHNldERlYWxpZ24pO1xuICAgIGR2Lm9yaWcub24oXCJtYXJrZXJBZGRlZFwiLCBzZXREZWFsaWduKTtcbiAgICBkdi5vcmlnLm9uKFwibWFya2VyQ2xlYXJlZFwiLCBzZXREZWFsaWduKTtcbiAgICBkdi5lZGl0Lm9uKFwidmlld3BvcnRDaGFuZ2VcIiwgZnVuY3Rpb24oKSB7IHNldChmYWxzZSk7IH0pO1xuICAgIGR2Lm9yaWcub24oXCJ2aWV3cG9ydENoYW5nZVwiLCBmdW5jdGlvbigpIHsgc2V0KGZhbHNlKTsgfSk7XG4gICAgdXBkYXRlKCk7XG4gICAgcmV0dXJuIHVwZGF0ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyU2Nyb2xsKGR2KSB7XG4gICAgZHYuZWRpdC5vbihcInNjcm9sbFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHN5bmNTY3JvbGwoZHYsIERJRkZfSU5TRVJUKSAmJiBtYWtlQ29ubmVjdGlvbnMoZHYpO1xuICAgIH0pO1xuICAgIGR2Lm9yaWcub24oXCJzY3JvbGxcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBzeW5jU2Nyb2xsKGR2LCBESUZGX0RFTEVURSkgJiYgbWFrZUNvbm5lY3Rpb25zKGR2KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN5bmNTY3JvbGwoZHYsIHR5cGUpIHtcbiAgICAvLyBDaGFuZ2UgaGFuZGxlciB3aWxsIGRvIGEgcmVmcmVzaCBhZnRlciBhIHRpbWVvdXQgd2hlbiBkaWZmIGlzIG91dCBvZiBkYXRlXG4gICAgaWYgKGR2LmRpZmZPdXRPZkRhdGUpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWR2LmxvY2tTY3JvbGwpIHJldHVybiB0cnVlO1xuICAgIHZhciBlZGl0b3IsIG90aGVyLCBub3cgPSArbmV3IERhdGU7XG4gICAgaWYgKHR5cGUgPT0gRElGRl9JTlNFUlQpIHsgZWRpdG9yID0gZHYuZWRpdDsgb3RoZXIgPSBkdi5vcmlnOyB9XG4gICAgZWxzZSB7IGVkaXRvciA9IGR2Lm9yaWc7IG90aGVyID0gZHYuZWRpdDsgfVxuICAgIC8vIERvbid0IHRha2UgYWN0aW9uIGlmIHRoZSBwb3NpdGlvbiBvZiB0aGlzIGVkaXRvciB3YXMgcmVjZW50bHkgc2V0XG4gICAgLy8gKHRvIHByZXZlbnQgZmVlZGJhY2sgbG9vcHMpXG4gICAgaWYgKGVkaXRvci5zdGF0ZS5zY3JvbGxTZXRCeSA9PSBkdiAmJiAoZWRpdG9yLnN0YXRlLnNjcm9sbFNldEF0IHx8IDApICsgNTAgPiBub3cpIHJldHVybiBmYWxzZTtcblxuICAgIHZhciBzSW5mbyA9IGVkaXRvci5nZXRTY3JvbGxJbmZvKCk7XG4gICAgaWYgKGR2Lm12Lm9wdGlvbnMuY29ubmVjdCA9PSBcImFsaWduXCIpIHtcbiAgICAgIHRhcmdldFBvcyA9IHNJbmZvLnRvcDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGhhbGZTY3JlZW4gPSAuNSAqIHNJbmZvLmNsaWVudEhlaWdodCwgbWlkWSA9IHNJbmZvLnRvcCArIGhhbGZTY3JlZW47XG4gICAgICB2YXIgbWlkID0gZWRpdG9yLmxpbmVBdEhlaWdodChtaWRZLCBcImxvY2FsXCIpO1xuICAgICAgdmFyIGFyb3VuZCA9IGNodW5rQm91bmRhcmllc0Fyb3VuZChkdi5jaHVua3MsIG1pZCwgdHlwZSA9PSBESUZGX0lOU0VSVCk7XG4gICAgICB2YXIgb2ZmID0gZ2V0T2Zmc2V0cyhlZGl0b3IsIHR5cGUgPT0gRElGRl9JTlNFUlQgPyBhcm91bmQuZWRpdCA6IGFyb3VuZC5vcmlnKTtcbiAgICAgIHZhciBvZmZPdGhlciA9IGdldE9mZnNldHMob3RoZXIsIHR5cGUgPT0gRElGRl9JTlNFUlQgPyBhcm91bmQub3JpZyA6IGFyb3VuZC5lZGl0KTtcbiAgICAgIHZhciByYXRpbyA9IChtaWRZIC0gb2ZmLnRvcCkgLyAob2ZmLmJvdCAtIG9mZi50b3ApO1xuICAgICAgdmFyIHRhcmdldFBvcyA9IChvZmZPdGhlci50b3AgLSBoYWxmU2NyZWVuKSArIHJhdGlvICogKG9mZk90aGVyLmJvdCAtIG9mZk90aGVyLnRvcCk7XG5cbiAgICAgIHZhciBib3REaXN0LCBtaXg7XG4gICAgICAvLyBTb21lIGNhcmVmdWwgdHdlYWtpbmcgdG8gbWFrZSBzdXJlIG5vIHNwYWNlIGlzIGxlZnQgb3V0IG9mIHZpZXdcbiAgICAgIC8vIHdoZW4gc2Nyb2xsaW5nIHRvIHRvcCBvciBib3R0b20uXG4gICAgICBpZiAodGFyZ2V0UG9zID4gc0luZm8udG9wICYmIChtaXggPSBzSW5mby50b3AgLyBoYWxmU2NyZWVuKSA8IDEpIHtcbiAgICAgICAgdGFyZ2V0UG9zID0gdGFyZ2V0UG9zICogbWl4ICsgc0luZm8udG9wICogKDEgLSBtaXgpO1xuICAgICAgfSBlbHNlIGlmICgoYm90RGlzdCA9IHNJbmZvLmhlaWdodCAtIHNJbmZvLmNsaWVudEhlaWdodCAtIHNJbmZvLnRvcCkgPCBoYWxmU2NyZWVuKSB7XG4gICAgICAgIHZhciBvdGhlckluZm8gPSBvdGhlci5nZXRTY3JvbGxJbmZvKCk7XG4gICAgICAgIHZhciBib3REaXN0T3RoZXIgPSBvdGhlckluZm8uaGVpZ2h0IC0gb3RoZXJJbmZvLmNsaWVudEhlaWdodCAtIHRhcmdldFBvcztcbiAgICAgICAgaWYgKGJvdERpc3RPdGhlciA+IGJvdERpc3QgJiYgKG1peCA9IGJvdERpc3QgLyBoYWxmU2NyZWVuKSA8IDEpXG4gICAgICAgICAgdGFyZ2V0UG9zID0gdGFyZ2V0UG9zICogbWl4ICsgKG90aGVySW5mby5oZWlnaHQgLSBvdGhlckluZm8uY2xpZW50SGVpZ2h0IC0gYm90RGlzdCkgKiAoMSAtIG1peCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgb3RoZXIuc2Nyb2xsVG8oc0luZm8ubGVmdCwgdGFyZ2V0UG9zKTtcbiAgICBvdGhlci5zdGF0ZS5zY3JvbGxTZXRBdCA9IG5vdztcbiAgICBvdGhlci5zdGF0ZS5zY3JvbGxTZXRCeSA9IGR2O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0cyhlZGl0b3IsIGFyb3VuZCkge1xuICAgIHZhciBib3QgPSBhcm91bmQuYWZ0ZXI7XG4gICAgaWYgKGJvdCA9PSBudWxsKSBib3QgPSBlZGl0b3IubGFzdExpbmUoKSArIDE7XG4gICAgcmV0dXJuIHt0b3A6IGVkaXRvci5oZWlnaHRBdExpbmUoYXJvdW5kLmJlZm9yZSB8fCAwLCBcImxvY2FsXCIpLFxuICAgICAgICAgICAgYm90OiBlZGl0b3IuaGVpZ2h0QXRMaW5lKGJvdCwgXCJsb2NhbFwiKX07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRTY3JvbGxMb2NrKGR2LCB2YWwsIGFjdGlvbikge1xuICAgIGR2LmxvY2tTY3JvbGwgPSB2YWw7XG4gICAgaWYgKHZhbCAmJiBhY3Rpb24gIT0gZmFsc2UpIHN5bmNTY3JvbGwoZHYsIERJRkZfSU5TRVJUKSAmJiBtYWtlQ29ubmVjdGlvbnMoZHYpO1xuICAgIGR2LmxvY2tCdXR0b24uaW5uZXJIVE1MID0gdmFsID8gXCJcXHUyMWRiXFx1MjFkYVwiIDogXCJcXHUyMWRiJm5ic3A7Jm5ic3A7XFx1MjFkYVwiO1xuICB9XG5cbiAgLy8gVXBkYXRpbmcgdGhlIG1hcmtzIGZvciBlZGl0b3IgY29udGVudFxuXG4gIGZ1bmN0aW9uIGNsZWFyTWFya3MoZWRpdG9yLCBhcnIsIGNsYXNzZXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIG1hcmsgPSBhcnJbaV07XG4gICAgICBpZiAobWFyayBpbnN0YW5jZW9mIENvZGVNaXJyb3IuVGV4dE1hcmtlcikge1xuICAgICAgICBtYXJrLmNsZWFyKCk7XG4gICAgICB9IGVsc2UgaWYgKG1hcmsucGFyZW50KSB7XG4gICAgICAgIGVkaXRvci5yZW1vdmVMaW5lQ2xhc3MobWFyaywgXCJiYWNrZ3JvdW5kXCIsIGNsYXNzZXMuY2h1bmspO1xuICAgICAgICBlZGl0b3IucmVtb3ZlTGluZUNsYXNzKG1hcmssIFwiYmFja2dyb3VuZFwiLCBjbGFzc2VzLnN0YXJ0KTtcbiAgICAgICAgZWRpdG9yLnJlbW92ZUxpbmVDbGFzcyhtYXJrLCBcImJhY2tncm91bmRcIiwgY2xhc3Nlcy5lbmQpO1xuICAgICAgfVxuICAgIH1cbiAgICBhcnIubGVuZ3RoID0gMDtcbiAgfVxuXG4gIC8vIEZJWE1FIG1heWJlIGFkZCBhIG1hcmdpbiBhcm91bmQgdmlld3BvcnQgdG8gcHJldmVudCB0b28gbWFueSB1cGRhdGVzXG4gIGZ1bmN0aW9uIHVwZGF0ZU1hcmtzKGVkaXRvciwgZGlmZiwgc3RhdGUsIHR5cGUsIGNsYXNzZXMpIHtcbiAgICB2YXIgdnAgPSBlZGl0b3IuZ2V0Vmlld3BvcnQoKTtcbiAgICBlZGl0b3Iub3BlcmF0aW9uKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHN0YXRlLmZyb20gPT0gc3RhdGUudG8gfHwgdnAuZnJvbSAtIHN0YXRlLnRvID4gMjAgfHwgc3RhdGUuZnJvbSAtIHZwLnRvID4gMjApIHtcbiAgICAgICAgY2xlYXJNYXJrcyhlZGl0b3IsIHN0YXRlLm1hcmtlZCwgY2xhc3Nlcyk7XG4gICAgICAgIG1hcmtDaGFuZ2VzKGVkaXRvciwgZGlmZiwgdHlwZSwgc3RhdGUubWFya2VkLCB2cC5mcm9tLCB2cC50bywgY2xhc3Nlcyk7XG4gICAgICAgIHN0YXRlLmZyb20gPSB2cC5mcm9tOyBzdGF0ZS50byA9IHZwLnRvO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHZwLmZyb20gPCBzdGF0ZS5mcm9tKSB7XG4gICAgICAgICAgbWFya0NoYW5nZXMoZWRpdG9yLCBkaWZmLCB0eXBlLCBzdGF0ZS5tYXJrZWQsIHZwLmZyb20sIHN0YXRlLmZyb20sIGNsYXNzZXMpO1xuICAgICAgICAgIHN0YXRlLmZyb20gPSB2cC5mcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2cC50byA+IHN0YXRlLnRvKSB7XG4gICAgICAgICAgbWFya0NoYW5nZXMoZWRpdG9yLCBkaWZmLCB0eXBlLCBzdGF0ZS5tYXJrZWQsIHN0YXRlLnRvLCB2cC50bywgY2xhc3Nlcyk7XG4gICAgICAgICAgc3RhdGUudG8gPSB2cC50bztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbWFya0NoYW5nZXMoZWRpdG9yLCBkaWZmLCB0eXBlLCBtYXJrcywgZnJvbSwgdG8sIGNsYXNzZXMpIHtcbiAgICB2YXIgcG9zID0gUG9zKDAsIDApO1xuICAgIHZhciB0b3AgPSBQb3MoZnJvbSwgMCksIGJvdCA9IGVkaXRvci5jbGlwUG9zKFBvcyh0byAtIDEpKTtcbiAgICB2YXIgY2xzID0gdHlwZSA9PSBESUZGX0RFTEVURSA/IGNsYXNzZXMuZGVsIDogY2xhc3Nlcy5pbnNlcnQ7XG4gICAgZnVuY3Rpb24gbWFya0NodW5rKHN0YXJ0LCBlbmQpIHtcbiAgICAgIHZhciBiZnJvbSA9IE1hdGgubWF4KGZyb20sIHN0YXJ0KSwgYnRvID0gTWF0aC5taW4odG8sIGVuZCk7XG4gICAgICBmb3IgKHZhciBpID0gYmZyb207IGkgPCBidG87ICsraSkge1xuICAgICAgICB2YXIgbGluZSA9IGVkaXRvci5hZGRMaW5lQ2xhc3MoaSwgXCJiYWNrZ3JvdW5kXCIsIGNsYXNzZXMuY2h1bmspO1xuICAgICAgICBpZiAoaSA9PSBzdGFydCkgZWRpdG9yLmFkZExpbmVDbGFzcyhsaW5lLCBcImJhY2tncm91bmRcIiwgY2xhc3Nlcy5zdGFydCk7XG4gICAgICAgIGlmIChpID09IGVuZCAtIDEpIGVkaXRvci5hZGRMaW5lQ2xhc3MobGluZSwgXCJiYWNrZ3JvdW5kXCIsIGNsYXNzZXMuZW5kKTtcbiAgICAgICAgbWFya3MucHVzaChsaW5lKTtcbiAgICAgIH1cbiAgICAgIC8vIFdoZW4gdGhlIGNodW5rIGlzIGVtcHR5LCBtYWtlIHN1cmUgYSBob3Jpem9udGFsIGxpbmUgc2hvd3MgdXBcbiAgICAgIGlmIChzdGFydCA9PSBlbmQgJiYgYmZyb20gPT0gZW5kICYmIGJ0byA9PSBlbmQpIHtcbiAgICAgICAgaWYgKGJmcm9tKVxuICAgICAgICAgIG1hcmtzLnB1c2goZWRpdG9yLmFkZExpbmVDbGFzcyhiZnJvbSAtIDEsIFwiYmFja2dyb3VuZFwiLCBjbGFzc2VzLmVuZCkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgbWFya3MucHVzaChlZGl0b3IuYWRkTGluZUNsYXNzKGJmcm9tLCBcImJhY2tncm91bmRcIiwgY2xhc3Nlcy5zdGFydCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjaHVua1N0YXJ0ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRpZmYubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBwYXJ0ID0gZGlmZltpXSwgdHAgPSBwYXJ0WzBdLCBzdHIgPSBwYXJ0WzFdO1xuICAgICAgaWYgKHRwID09IERJRkZfRVFVQUwpIHtcbiAgICAgICAgdmFyIGNsZWFuRnJvbSA9IHBvcy5saW5lICsgKHN0YXJ0T2ZMaW5lQ2xlYW4oZGlmZiwgaSkgPyAwIDogMSk7XG4gICAgICAgIG1vdmVPdmVyKHBvcywgc3RyKTtcbiAgICAgICAgdmFyIGNsZWFuVG8gPSBwb3MubGluZSArIChlbmRPZkxpbmVDbGVhbihkaWZmLCBpKSA/IDEgOiAwKTtcbiAgICAgICAgaWYgKGNsZWFuVG8gPiBjbGVhbkZyb20pIHtcbiAgICAgICAgICBpZiAoaSkgbWFya0NodW5rKGNodW5rU3RhcnQsIGNsZWFuRnJvbSk7XG4gICAgICAgICAgY2h1bmtTdGFydCA9IGNsZWFuVG87XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0cCA9PSB0eXBlKSB7XG4gICAgICAgICAgdmFyIGVuZCA9IG1vdmVPdmVyKHBvcywgc3RyLCB0cnVlKTtcbiAgICAgICAgICB2YXIgYSA9IHBvc01heCh0b3AsIHBvcyksIGIgPSBwb3NNaW4oYm90LCBlbmQpO1xuICAgICAgICAgIGlmICghcG9zRXEoYSwgYikpXG4gICAgICAgICAgICBtYXJrcy5wdXNoKGVkaXRvci5tYXJrVGV4dChhLCBiLCB7Y2xhc3NOYW1lOiBjbHN9KSk7XG4gICAgICAgICAgcG9zID0gZW5kO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaHVua1N0YXJ0IDw9IHBvcy5saW5lKSBtYXJrQ2h1bmsoY2h1bmtTdGFydCwgcG9zLmxpbmUgKyAxKTtcbiAgfVxuXG4gIC8vIFVwZGF0aW5nIHRoZSBnYXAgYmV0d2VlbiBlZGl0b3IgYW5kIG9yaWdpbmFsXG5cbiAgZnVuY3Rpb24gbWFrZUNvbm5lY3Rpb25zKGR2KSB7XG4gICAgaWYgKCFkdi5zaG93RGlmZmVyZW5jZXMpIHJldHVybjtcblxuICAgIGlmIChkdi5zdmcpIHtcbiAgICAgIGNsZWFyKGR2LnN2Zyk7XG4gICAgICB2YXIgdyA9IGR2LmdhcC5vZmZzZXRXaWR0aDtcbiAgICAgIGF0dHJzKGR2LnN2ZywgXCJ3aWR0aFwiLCB3LCBcImhlaWdodFwiLCBkdi5nYXAub2Zmc2V0SGVpZ2h0KTtcbiAgICB9XG4gICAgaWYgKGR2LmNvcHlCdXR0b25zKSBjbGVhcihkdi5jb3B5QnV0dG9ucyk7XG5cbiAgICB2YXIgdnBFZGl0ID0gZHYuZWRpdC5nZXRWaWV3cG9ydCgpLCB2cE9yaWcgPSBkdi5vcmlnLmdldFZpZXdwb3J0KCk7XG4gICAgdmFyIHNUb3BFZGl0ID0gZHYuZWRpdC5nZXRTY3JvbGxJbmZvKCkudG9wLCBzVG9wT3JpZyA9IGR2Lm9yaWcuZ2V0U2Nyb2xsSW5mbygpLnRvcDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGR2LmNodW5rcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNoID0gZHYuY2h1bmtzW2ldO1xuICAgICAgaWYgKGNoLmVkaXRGcm9tIDw9IHZwRWRpdC50byAmJiBjaC5lZGl0VG8gPj0gdnBFZGl0LmZyb20gJiZcbiAgICAgICAgICBjaC5vcmlnRnJvbSA8PSB2cE9yaWcudG8gJiYgY2gub3JpZ1RvID49IHZwT3JpZy5mcm9tKVxuICAgICAgICBkcmF3Q29ubmVjdG9yc0ZvckNodW5rKGR2LCBjaCwgc1RvcE9yaWcsIHNUb3BFZGl0LCB3KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNYXRjaGluZ09yaWdMaW5lKGVkaXRMaW5lLCBjaHVua3MpIHtcbiAgICB2YXIgZWRpdFN0YXJ0ID0gMCwgb3JpZ1N0YXJ0ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNodW5rcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNodW5rID0gY2h1bmtzW2ldO1xuICAgICAgaWYgKGNodW5rLmVkaXRUbyA+IGVkaXRMaW5lICYmIGNodW5rLmVkaXRGcm9tIDw9IGVkaXRMaW5lKSByZXR1cm4gbnVsbDtcbiAgICAgIGlmIChjaHVuay5lZGl0RnJvbSA+IGVkaXRMaW5lKSBicmVhaztcbiAgICAgIGVkaXRTdGFydCA9IGNodW5rLmVkaXRUbztcbiAgICAgIG9yaWdTdGFydCA9IGNodW5rLm9yaWdUbztcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdTdGFydCArIChlZGl0TGluZSAtIGVkaXRTdGFydCk7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kQWxpZ25lZExpbmVzKGR2LCBvdGhlcikge1xuICAgIHZhciBsaW5lc1RvQWxpZ24gPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGR2LmNodW5rcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNodW5rID0gZHYuY2h1bmtzW2ldO1xuICAgICAgbGluZXNUb0FsaWduLnB1c2goW2NodW5rLm9yaWdUbywgY2h1bmsuZWRpdFRvLCBvdGhlciA/IGdldE1hdGNoaW5nT3JpZ0xpbmUoY2h1bmsuZWRpdFRvLCBvdGhlci5jaHVua3MpIDogbnVsbF0pO1xuICAgIH1cbiAgICBpZiAob3RoZXIpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3RoZXIuY2h1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaHVuayA9IG90aGVyLmNodW5rc1tpXTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsaW5lc1RvQWxpZ24ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICB2YXIgYWxpZ24gPSBsaW5lc1RvQWxpZ25bal07XG4gICAgICAgICAgaWYgKGFsaWduWzFdID09IGNodW5rLmVkaXRUbykge1xuICAgICAgICAgICAgaiA9IC0xO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIGlmIChhbGlnblsxXSA+IGNodW5rLmVkaXRUbykge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChqID4gLTEpXG4gICAgICAgICAgbGluZXNUb0FsaWduLnNwbGljZShqIC0gMSwgMCwgW2dldE1hdGNoaW5nT3JpZ0xpbmUoY2h1bmsuZWRpdFRvLCBkdi5jaHVua3MpLCBjaHVuay5lZGl0VG8sIGNodW5rLm9yaWdUb10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluZXNUb0FsaWduO1xuICB9XG5cbiAgZnVuY3Rpb24gYWxpZ25DaHVua3MoZHYsIGZvcmNlKSB7XG4gICAgaWYgKCFkdi5kZWFsaWduZWQgJiYgIWZvcmNlKSByZXR1cm47XG4gICAgaWYgKCFkdi5vcmlnLmN1ck9wKSByZXR1cm4gZHYub3JpZy5vcGVyYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICBhbGlnbkNodW5rcyhkdiwgZm9yY2UpO1xuICAgIH0pO1xuXG4gICAgZHYuZGVhbGlnbmVkID0gZmFsc2U7XG4gICAgdmFyIG90aGVyID0gZHYubXYubGVmdCA9PSBkdiA/IGR2Lm12LnJpZ2h0IDogZHYubXYubGVmdDtcbiAgICBpZiAob3RoZXIpIHtcbiAgICAgIGVuc3VyZURpZmYob3RoZXIpO1xuICAgICAgb3RoZXIuZGVhbGlnbmVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBsaW5lc1RvQWxpZ24gPSBmaW5kQWxpZ25lZExpbmVzKGR2LCBvdGhlcik7XG5cbiAgICAvLyBDbGVhciBvbGQgYWxpZ25lcnNcbiAgICB2YXIgYWxpZ25lcnMgPSBkdi5tdi5hbGlnbmVycztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFsaWduZXJzLmxlbmd0aDsgaSsrKVxuICAgICAgYWxpZ25lcnNbaV0uY2xlYXIoKTtcbiAgICBhbGlnbmVycy5sZW5ndGggPSAwO1xuXG4gICAgdmFyIGNtID0gW2R2Lm9yaWcsIGR2LmVkaXRdLCBzY3JvbGwgPSBbXTtcbiAgICBpZiAob3RoZXIpIGNtLnB1c2gob3RoZXIub3JpZyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbS5sZW5ndGg7IGkrKylcbiAgICAgIHNjcm9sbC5wdXNoKGNtW2ldLmdldFNjcm9sbEluZm8oKS50b3ApO1xuXG4gICAgZm9yICh2YXIgbG4gPSAwOyBsbiA8IGxpbmVzVG9BbGlnbi5sZW5ndGg7IGxuKyspXG4gICAgICBhbGlnbkxpbmVzKGNtLCBsaW5lc1RvQWxpZ25bbG5dLCBhbGlnbmVycyk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNtLmxlbmd0aDsgaSsrKVxuICAgICAgY21baV0uc2Nyb2xsVG8obnVsbCwgc2Nyb2xsW2ldKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFsaWduTGluZXMoY20sIGxpbmVzLCBhbGlnbmVycykge1xuICAgIHZhciBtYXhPZmZzZXQgPSAwLCBvZmZzZXQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNtLmxlbmd0aDsgaSsrKSBpZiAobGluZXNbaV0gIT0gbnVsbCkge1xuICAgICAgdmFyIG9mZiA9IGNtW2ldLmhlaWdodEF0TGluZShsaW5lc1tpXSwgXCJsb2NhbFwiKTtcbiAgICAgIG9mZnNldFtpXSA9IG9mZjtcbiAgICAgIG1heE9mZnNldCA9IE1hdGgubWF4KG1heE9mZnNldCwgb2ZmKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbS5sZW5ndGg7IGkrKykgaWYgKGxpbmVzW2ldICE9IG51bGwpIHtcbiAgICAgIHZhciBkaWZmID0gbWF4T2Zmc2V0IC0gb2Zmc2V0W2ldO1xuICAgICAgaWYgKGRpZmYgPiAxKVxuICAgICAgICBhbGlnbmVycy5wdXNoKHBhZEFib3ZlKGNtW2ldLCBsaW5lc1tpXSwgZGlmZikpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhZEFib3ZlKGNtLCBsaW5lLCBzaXplKSB7XG4gICAgdmFyIGFib3ZlID0gdHJ1ZTtcbiAgICBpZiAobGluZSA+IGNtLmxhc3RMaW5lKCkpIHtcbiAgICAgIGxpbmUtLTtcbiAgICAgIGFib3ZlID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBlbHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGVsdC5jbGFzc05hbWUgPSBcIkNvZGVNaXJyb3ItbWVyZ2Utc3BhY2VyXCI7XG4gICAgZWx0LnN0eWxlLmhlaWdodCA9IHNpemUgKyBcInB4XCI7IGVsdC5zdHlsZS5taW5XaWR0aCA9IFwiMXB4XCI7XG4gICAgcmV0dXJuIGNtLmFkZExpbmVXaWRnZXQobGluZSwgZWx0LCB7aGVpZ2h0OiBzaXplLCBhYm92ZTogYWJvdmV9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRyYXdDb25uZWN0b3JzRm9yQ2h1bmsoZHYsIGNodW5rLCBzVG9wT3JpZywgc1RvcEVkaXQsIHcpIHtcbiAgICB2YXIgZmxpcCA9IGR2LnR5cGUgPT0gXCJsZWZ0XCI7XG4gICAgdmFyIHRvcCA9IGR2Lm9yaWcuaGVpZ2h0QXRMaW5lKGNodW5rLm9yaWdGcm9tLCBcImxvY2FsXCIpIC0gc1RvcE9yaWc7XG4gICAgaWYgKGR2LnN2Zykge1xuICAgICAgdmFyIHRvcExweCA9IHRvcDtcbiAgICAgIHZhciB0b3BScHggPSBkdi5lZGl0LmhlaWdodEF0TGluZShjaHVuay5lZGl0RnJvbSwgXCJsb2NhbFwiKSAtIHNUb3BFZGl0O1xuICAgICAgaWYgKGZsaXApIHsgdmFyIHRtcCA9IHRvcExweDsgdG9wTHB4ID0gdG9wUnB4OyB0b3BScHggPSB0bXA7IH1cbiAgICAgIHZhciBib3RMcHggPSBkdi5vcmlnLmhlaWdodEF0TGluZShjaHVuay5vcmlnVG8sIFwibG9jYWxcIikgLSBzVG9wT3JpZztcbiAgICAgIHZhciBib3RScHggPSBkdi5lZGl0LmhlaWdodEF0TGluZShjaHVuay5lZGl0VG8sIFwibG9jYWxcIikgLSBzVG9wRWRpdDtcbiAgICAgIGlmIChmbGlwKSB7IHZhciB0bXAgPSBib3RMcHg7IGJvdExweCA9IGJvdFJweDsgYm90UnB4ID0gdG1wOyB9XG4gICAgICB2YXIgY3VydmVUb3AgPSBcIiBDIFwiICsgdy8yICsgXCIgXCIgKyB0b3BScHggKyBcIiBcIiArIHcvMiArIFwiIFwiICsgdG9wTHB4ICsgXCIgXCIgKyAodyArIDIpICsgXCIgXCIgKyB0b3BMcHg7XG4gICAgICB2YXIgY3VydmVCb3QgPSBcIiBDIFwiICsgdy8yICsgXCIgXCIgKyBib3RMcHggKyBcIiBcIiArIHcvMiArIFwiIFwiICsgYm90UnB4ICsgXCIgLTEgXCIgKyBib3RScHg7XG4gICAgICBhdHRycyhkdi5zdmcuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z05TLCBcInBhdGhcIikpLFxuICAgICAgICAgICAgXCJkXCIsIFwiTSAtMSBcIiArIHRvcFJweCArIGN1cnZlVG9wICsgXCIgTCBcIiArICh3ICsgMikgKyBcIiBcIiArIGJvdExweCArIGN1cnZlQm90ICsgXCIgelwiLFxuICAgICAgICAgICAgXCJjbGFzc1wiLCBkdi5jbGFzc2VzLmNvbm5lY3QpO1xuICAgIH1cbiAgICBpZiAoZHYuY29weUJ1dHRvbnMpIHtcbiAgICAgIHZhciBjb3B5ID0gZHYuY29weUJ1dHRvbnMuYXBwZW5kQ2hpbGQoZWx0KFwiZGl2XCIsIGR2LnR5cGUgPT0gXCJsZWZ0XCIgPyBcIlxcdTIxZGRcIiA6IFwiXFx1MjFkY1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2RlTWlycm9yLW1lcmdlLWNvcHlcIikpO1xuICAgICAgdmFyIGVkaXRPcmlnaW5hbHMgPSBkdi5tdi5vcHRpb25zLmFsbG93RWRpdGluZ09yaWdpbmFscztcbiAgICAgIGNvcHkudGl0bGUgPSBlZGl0T3JpZ2luYWxzID8gXCJQdXNoIHRvIGxlZnRcIiA6IFwiUmV2ZXJ0IGNodW5rXCI7XG4gICAgICBjb3B5LmNodW5rID0gY2h1bms7XG4gICAgICBjb3B5LnN0eWxlLnRvcCA9IHRvcCArIFwicHhcIjtcblxuICAgICAgaWYgKGVkaXRPcmlnaW5hbHMpIHtcbiAgICAgICAgdmFyIHRvcFJldmVyc2UgPSBkdi5vcmlnLmhlaWdodEF0TGluZShjaHVuay5lZGl0RnJvbSwgXCJsb2NhbFwiKSAtIHNUb3BFZGl0O1xuICAgICAgICB2YXIgY29weVJldmVyc2UgPSBkdi5jb3B5QnV0dG9ucy5hcHBlbmRDaGlsZChlbHQoXCJkaXZcIiwgZHYudHlwZSA9PSBcInJpZ2h0XCIgPyBcIlxcdTIxZGRcIiA6IFwiXFx1MjFkY1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDb2RlTWlycm9yLW1lcmdlLWNvcHktcmV2ZXJzZVwiKSk7XG4gICAgICAgIGNvcHlSZXZlcnNlLnRpdGxlID0gXCJQdXNoIHRvIHJpZ2h0XCI7XG4gICAgICAgIGNvcHlSZXZlcnNlLmNodW5rID0ge2VkaXRGcm9tOiBjaHVuay5vcmlnRnJvbSwgZWRpdFRvOiBjaHVuay5vcmlnVG8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdGcm9tOiBjaHVuay5lZGl0RnJvbSwgb3JpZ1RvOiBjaHVuay5lZGl0VG99O1xuICAgICAgICBjb3B5UmV2ZXJzZS5zdHlsZS50b3AgPSB0b3BSZXZlcnNlICsgXCJweFwiO1xuICAgICAgICBkdi50eXBlID09IFwicmlnaHRcIiA/IGNvcHlSZXZlcnNlLnN0eWxlLmxlZnQgPSBcIjJweFwiIDogY29weVJldmVyc2Uuc3R5bGUucmlnaHQgPSBcIjJweFwiO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvcHlDaHVuayhkdiwgdG8sIGZyb20sIGNodW5rKSB7XG4gICAgaWYgKGR2LmRpZmZPdXRPZkRhdGUpIHJldHVybjtcbiAgICB2YXIgZWRpdFN0YXJ0ID0gY2h1bmsuZWRpdFRvID4gdG8ubGFzdExpbmUoKSA/IFBvcyhjaHVuay5lZGl0RnJvbSAtIDEpIDogUG9zKGNodW5rLmVkaXRGcm9tLCAwKVxuICAgIHZhciBvcmlnU3RhcnQgPSBjaHVuay5vcmlnVG8gPiBmcm9tLmxhc3RMaW5lKCkgPyBQb3MoY2h1bmsub3JpZ0Zyb20gLSAxKSA6IFBvcyhjaHVuay5vcmlnRnJvbSwgMClcbiAgICB0by5yZXBsYWNlUmFuZ2UoZnJvbS5nZXRSYW5nZShvcmlnU3RhcnQsIFBvcyhjaHVuay5vcmlnVG8sIDApKSwgZWRpdFN0YXJ0LCBQb3MoY2h1bmsuZWRpdFRvLCAwKSlcbiAgfVxuXG4gIC8vIE1lcmdlIHZpZXcsIGNvbnRhaW5pbmcgMCwgMSwgb3IgMiBkaWZmIHZpZXdzLlxuXG4gIHZhciBNZXJnZVZpZXcgPSBDb2RlTWlycm9yLk1lcmdlVmlldyA9IGZ1bmN0aW9uKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWVyZ2VWaWV3KSkgcmV0dXJuIG5ldyBNZXJnZVZpZXcobm9kZSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHZhciBvcmlnTGVmdCA9IG9wdGlvbnMub3JpZ0xlZnQsIG9yaWdSaWdodCA9IG9wdGlvbnMub3JpZ1JpZ2h0ID09IG51bGwgPyBvcHRpb25zLm9yaWcgOiBvcHRpb25zLm9yaWdSaWdodDtcblxuICAgIHZhciBoYXNMZWZ0ID0gb3JpZ0xlZnQgIT0gbnVsbCwgaGFzUmlnaHQgPSBvcmlnUmlnaHQgIT0gbnVsbDtcbiAgICB2YXIgcGFuZXMgPSAxICsgKGhhc0xlZnQgPyAxIDogMCkgKyAoaGFzUmlnaHQgPyAxIDogMCk7XG4gICAgdmFyIHdyYXAgPSBbXSwgbGVmdCA9IHRoaXMubGVmdCA9IG51bGwsIHJpZ2h0ID0gdGhpcy5yaWdodCA9IG51bGw7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKGhhc0xlZnQpIHtcbiAgICAgIGxlZnQgPSB0aGlzLmxlZnQgPSBuZXcgRGlmZlZpZXcodGhpcywgXCJsZWZ0XCIpO1xuICAgICAgdmFyIGxlZnRQYW5lID0gZWx0KFwiZGl2XCIsIG51bGwsIFwiQ29kZU1pcnJvci1tZXJnZS1wYW5lXCIpO1xuICAgICAgd3JhcC5wdXNoKGxlZnRQYW5lKTtcbiAgICAgIHdyYXAucHVzaChidWlsZEdhcChsZWZ0KSk7XG4gICAgfVxuXG4gICAgdmFyIGVkaXRQYW5lID0gZWx0KFwiZGl2XCIsIG51bGwsIFwiQ29kZU1pcnJvci1tZXJnZS1wYW5lXCIpO1xuICAgIHdyYXAucHVzaChlZGl0UGFuZSk7XG5cbiAgICBpZiAoaGFzUmlnaHQpIHtcbiAgICAgIHJpZ2h0ID0gdGhpcy5yaWdodCA9IG5ldyBEaWZmVmlldyh0aGlzLCBcInJpZ2h0XCIpO1xuICAgICAgd3JhcC5wdXNoKGJ1aWxkR2FwKHJpZ2h0KSk7XG4gICAgICB2YXIgcmlnaHRQYW5lID0gZWx0KFwiZGl2XCIsIG51bGwsIFwiQ29kZU1pcnJvci1tZXJnZS1wYW5lXCIpO1xuICAgICAgd3JhcC5wdXNoKHJpZ2h0UGFuZSk7XG4gICAgfVxuXG4gICAgKGhhc1JpZ2h0ID8gcmlnaHRQYW5lIDogZWRpdFBhbmUpLmNsYXNzTmFtZSArPSBcIiBDb2RlTWlycm9yLW1lcmdlLXBhbmUtcmlnaHRtb3N0XCI7XG5cbiAgICB3cmFwLnB1c2goZWx0KFwiZGl2XCIsIG51bGwsIG51bGwsIFwiaGVpZ2h0OiAwOyBjbGVhcjogYm90aDtcIikpO1xuXG4gICAgdmFyIHdyYXBFbHQgPSB0aGlzLndyYXAgPSBub2RlLmFwcGVuZENoaWxkKGVsdChcImRpdlwiLCB3cmFwLCBcIkNvZGVNaXJyb3ItbWVyZ2UgQ29kZU1pcnJvci1tZXJnZS1cIiArIHBhbmVzICsgXCJwYW5lXCIpKTtcbiAgICB0aGlzLmVkaXQgPSBDb2RlTWlycm9yKGVkaXRQYW5lLCBjb3B5T2JqKG9wdGlvbnMpKTtcblxuICAgIGlmIChsZWZ0KSBsZWZ0LmluaXQobGVmdFBhbmUsIG9yaWdMZWZ0LCBvcHRpb25zKTtcbiAgICBpZiAocmlnaHQpIHJpZ2h0LmluaXQocmlnaHRQYW5lLCBvcmlnUmlnaHQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuY29sbGFwc2VJZGVudGljYWwpXG4gICAgICB0aGlzLmVkaXRvcigpLm9wZXJhdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgY29sbGFwc2VJZGVudGljYWxTdHJldGNoZXMoc2VsZiwgb3B0aW9ucy5jb2xsYXBzZUlkZW50aWNhbCk7XG4gICAgICB9KTtcbiAgICBpZiAob3B0aW9ucy5jb25uZWN0ID09IFwiYWxpZ25cIikge1xuICAgICAgdGhpcy5hbGlnbmVycyA9IFtdO1xuICAgICAgYWxpZ25DaHVua3ModGhpcy5sZWZ0IHx8IHRoaXMucmlnaHQsIHRydWUpO1xuICAgIH1cblxuICAgIHZhciBvblJlc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGxlZnQpIG1ha2VDb25uZWN0aW9ucyhsZWZ0KTtcbiAgICAgIGlmIChyaWdodCkgbWFrZUNvbm5lY3Rpb25zKHJpZ2h0KTtcbiAgICB9O1xuICAgIENvZGVNaXJyb3Iub24od2luZG93LCBcInJlc2l6ZVwiLCBvblJlc2l6ZSk7XG4gICAgdmFyIHJlc2l6ZUludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBmb3IgKHZhciBwID0gd3JhcEVsdC5wYXJlbnROb2RlOyBwICYmIHAgIT0gZG9jdW1lbnQuYm9keTsgcCA9IHAucGFyZW50Tm9kZSkge31cbiAgICAgIGlmICghcCkgeyBjbGVhckludGVydmFsKHJlc2l6ZUludGVydmFsKTsgQ29kZU1pcnJvci5vZmYod2luZG93LCBcInJlc2l6ZVwiLCBvblJlc2l6ZSk7IH1cbiAgICB9LCA1MDAwKTtcbiAgfTtcblxuICBmdW5jdGlvbiBidWlsZEdhcChkdikge1xuICAgIHZhciBsb2NrID0gZHYubG9ja0J1dHRvbiA9IGVsdChcImRpdlwiLCBudWxsLCBcIkNvZGVNaXJyb3ItbWVyZ2Utc2Nyb2xsbG9ja1wiKTtcbiAgICBsb2NrLnRpdGxlID0gXCJUb2dnbGUgbG9ja2VkIHNjcm9sbGluZ1wiO1xuICAgIHZhciBsb2NrV3JhcCA9IGVsdChcImRpdlwiLCBbbG9ja10sIFwiQ29kZU1pcnJvci1tZXJnZS1zY3JvbGxsb2NrLXdyYXBcIik7XG4gICAgQ29kZU1pcnJvci5vbihsb2NrLCBcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBzZXRTY3JvbGxMb2NrKGR2LCAhZHYubG9ja1Njcm9sbCk7IH0pO1xuICAgIHZhciBnYXBFbHRzID0gW2xvY2tXcmFwXTtcbiAgICBpZiAoZHYubXYub3B0aW9ucy5yZXZlcnRCdXR0b25zICE9PSBmYWxzZSkge1xuICAgICAgZHYuY29weUJ1dHRvbnMgPSBlbHQoXCJkaXZcIiwgbnVsbCwgXCJDb2RlTWlycm9yLW1lcmdlLWNvcHlidXR0b25zLVwiICsgZHYudHlwZSk7XG4gICAgICBDb2RlTWlycm9yLm9uKGR2LmNvcHlCdXR0b25zLCBcImNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgICAgIGlmICghbm9kZS5jaHVuaykgcmV0dXJuO1xuICAgICAgICBpZiAobm9kZS5jbGFzc05hbWUgPT0gXCJDb2RlTWlycm9yLW1lcmdlLWNvcHktcmV2ZXJzZVwiKSB7XG4gICAgICAgICAgY29weUNodW5rKGR2LCBkdi5vcmlnLCBkdi5lZGl0LCBub2RlLmNodW5rKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29weUNodW5rKGR2LCBkdi5lZGl0LCBkdi5vcmlnLCBub2RlLmNodW5rKTtcbiAgICAgIH0pO1xuICAgICAgZ2FwRWx0cy51bnNoaWZ0KGR2LmNvcHlCdXR0b25zKTtcbiAgICB9XG4gICAgaWYgKGR2Lm12Lm9wdGlvbnMuY29ubmVjdCAhPSBcImFsaWduXCIpIHtcbiAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMgJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z05TLCBcInN2Z1wiKTtcbiAgICAgIGlmIChzdmcgJiYgIXN2Zy5jcmVhdGVTVkdSZWN0KSBzdmcgPSBudWxsO1xuICAgICAgZHYuc3ZnID0gc3ZnO1xuICAgICAgaWYgKHN2ZykgZ2FwRWx0cy5wdXNoKHN2Zyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGR2LmdhcCA9IGVsdChcImRpdlwiLCBnYXBFbHRzLCBcIkNvZGVNaXJyb3ItbWVyZ2UtZ2FwXCIpO1xuICB9XG5cbiAgTWVyZ2VWaWV3LnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHVjdG9yOiBNZXJnZVZpZXcsXG4gICAgZWRpdG9yOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZWRpdDsgfSxcbiAgICByaWdodE9yaWdpbmFsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucmlnaHQgJiYgdGhpcy5yaWdodC5vcmlnOyB9LFxuICAgIGxlZnRPcmlnaW5hbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmxlZnQgJiYgdGhpcy5sZWZ0Lm9yaWc7IH0sXG4gICAgc2V0U2hvd0RpZmZlcmVuY2VzOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgIGlmICh0aGlzLnJpZ2h0KSB0aGlzLnJpZ2h0LnNldFNob3dEaWZmZXJlbmNlcyh2YWwpO1xuICAgICAgaWYgKHRoaXMubGVmdCkgdGhpcy5sZWZ0LnNldFNob3dEaWZmZXJlbmNlcyh2YWwpO1xuICAgIH0sXG4gICAgcmlnaHRDaHVua3M6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMucmlnaHQpIHsgZW5zdXJlRGlmZih0aGlzLnJpZ2h0KTsgcmV0dXJuIHRoaXMucmlnaHQuY2h1bmtzOyB9XG4gICAgfSxcbiAgICBsZWZ0Q2h1bmtzOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmxlZnQpIHsgZW5zdXJlRGlmZih0aGlzLmxlZnQpOyByZXR1cm4gdGhpcy5sZWZ0LmNodW5rczsgfVxuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBhc1N0cmluZyhvYmopIHtcbiAgICBpZiAodHlwZW9mIG9iaiA9PSBcInN0cmluZ1wiKSByZXR1cm4gb2JqO1xuICAgIGVsc2UgcmV0dXJuIG9iai5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgLy8gT3BlcmF0aW9ucyBvbiBkaWZmc1xuXG4gIHZhciBkbXAgPSBuZXcgZGlmZl9tYXRjaF9wYXRjaCgpO1xuICBmdW5jdGlvbiBnZXREaWZmKGEsIGIpIHtcbiAgICB2YXIgZGlmZiA9IGRtcC5kaWZmX21haW4oYSwgYik7XG4gICAgZG1wLmRpZmZfY2xlYW51cFNlbWFudGljKGRpZmYpO1xuICAgIC8vIFRoZSBsaWJyYXJ5IHNvbWV0aW1lcyBsZWF2ZXMgaW4gZW1wdHkgcGFydHMsIHdoaWNoIGNvbmZ1c2UgdGhlIGFsZ29yaXRobVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGlmZi5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHBhcnQgPSBkaWZmW2ldO1xuICAgICAgaWYgKCFwYXJ0WzFdKSB7XG4gICAgICAgIGRpZmYuc3BsaWNlKGktLSwgMSk7XG4gICAgICB9IGVsc2UgaWYgKGkgJiYgZGlmZltpIC0gMV1bMF0gPT0gcGFydFswXSkge1xuICAgICAgICBkaWZmLnNwbGljZShpLS0sIDEpO1xuICAgICAgICBkaWZmW2ldWzFdICs9IHBhcnRbMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkaWZmO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q2h1bmtzKGRpZmYpIHtcbiAgICB2YXIgY2h1bmtzID0gW107XG4gICAgdmFyIHN0YXJ0RWRpdCA9IDAsIHN0YXJ0T3JpZyA9IDA7XG4gICAgdmFyIGVkaXQgPSBQb3MoMCwgMCksIG9yaWcgPSBQb3MoMCwgMCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgcGFydCA9IGRpZmZbaV0sIHRwID0gcGFydFswXTtcbiAgICAgIGlmICh0cCA9PSBESUZGX0VRVUFMKSB7XG4gICAgICAgIHZhciBzdGFydE9mZiA9IHN0YXJ0T2ZMaW5lQ2xlYW4oZGlmZiwgaSkgPyAwIDogMTtcbiAgICAgICAgdmFyIGNsZWFuRnJvbUVkaXQgPSBlZGl0LmxpbmUgKyBzdGFydE9mZiwgY2xlYW5Gcm9tT3JpZyA9IG9yaWcubGluZSArIHN0YXJ0T2ZmO1xuICAgICAgICBtb3ZlT3ZlcihlZGl0LCBwYXJ0WzFdLCBudWxsLCBvcmlnKTtcbiAgICAgICAgdmFyIGVuZE9mZiA9IGVuZE9mTGluZUNsZWFuKGRpZmYsIGkpID8gMSA6IDA7XG4gICAgICAgIHZhciBjbGVhblRvRWRpdCA9IGVkaXQubGluZSArIGVuZE9mZiwgY2xlYW5Ub09yaWcgPSBvcmlnLmxpbmUgKyBlbmRPZmY7XG4gICAgICAgIGlmIChjbGVhblRvRWRpdCA+IGNsZWFuRnJvbUVkaXQpIHtcbiAgICAgICAgICBpZiAoaSkgY2h1bmtzLnB1c2goe29yaWdGcm9tOiBzdGFydE9yaWcsIG9yaWdUbzogY2xlYW5Gcm9tT3JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRGcm9tOiBzdGFydEVkaXQsIGVkaXRUbzogY2xlYW5Gcm9tRWRpdH0pO1xuICAgICAgICAgIHN0YXJ0RWRpdCA9IGNsZWFuVG9FZGl0OyBzdGFydE9yaWcgPSBjbGVhblRvT3JpZztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW92ZU92ZXIodHAgPT0gRElGRl9JTlNFUlQgPyBlZGl0IDogb3JpZywgcGFydFsxXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzdGFydEVkaXQgPD0gZWRpdC5saW5lIHx8IHN0YXJ0T3JpZyA8PSBvcmlnLmxpbmUpXG4gICAgICBjaHVua3MucHVzaCh7b3JpZ0Zyb206IHN0YXJ0T3JpZywgb3JpZ1RvOiBvcmlnLmxpbmUgKyAxLFxuICAgICAgICAgICAgICAgICAgIGVkaXRGcm9tOiBzdGFydEVkaXQsIGVkaXRUbzogZWRpdC5saW5lICsgMX0pO1xuICAgIHJldHVybiBjaHVua3M7XG4gIH1cblxuICBmdW5jdGlvbiBlbmRPZkxpbmVDbGVhbihkaWZmLCBpKSB7XG4gICAgaWYgKGkgPT0gZGlmZi5sZW5ndGggLSAxKSByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgbmV4dCA9IGRpZmZbaSArIDFdWzFdO1xuICAgIGlmIChuZXh0Lmxlbmd0aCA9PSAxIHx8IG5leHQuY2hhckNvZGVBdCgwKSAhPSAxMCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChpID09IGRpZmYubGVuZ3RoIC0gMikgcmV0dXJuIHRydWU7XG4gICAgbmV4dCA9IGRpZmZbaSArIDJdWzFdO1xuICAgIHJldHVybiBuZXh0Lmxlbmd0aCA+IDEgJiYgbmV4dC5jaGFyQ29kZUF0KDApID09IDEwO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRPZkxpbmVDbGVhbihkaWZmLCBpKSB7XG4gICAgaWYgKGkgPT0gMCkgcmV0dXJuIHRydWU7XG4gICAgdmFyIGxhc3QgPSBkaWZmW2kgLSAxXVsxXTtcbiAgICBpZiAobGFzdC5jaGFyQ29kZUF0KGxhc3QubGVuZ3RoIC0gMSkgIT0gMTApIHJldHVybiBmYWxzZTtcbiAgICBpZiAoaSA9PSAxKSByZXR1cm4gdHJ1ZTtcbiAgICBsYXN0ID0gZGlmZltpIC0gMl1bMV07XG4gICAgcmV0dXJuIGxhc3QuY2hhckNvZGVBdChsYXN0Lmxlbmd0aCAtIDEpID09IDEwO1xuICB9XG5cbiAgZnVuY3Rpb24gY2h1bmtCb3VuZGFyaWVzQXJvdW5kKGNodW5rcywgbiwgbkluRWRpdCkge1xuICAgIHZhciBiZWZvcmVFLCBhZnRlckUsIGJlZm9yZU8sIGFmdGVyTztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNodW5rcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNodW5rID0gY2h1bmtzW2ldO1xuICAgICAgdmFyIGZyb21Mb2NhbCA9IG5JbkVkaXQgPyBjaHVuay5lZGl0RnJvbSA6IGNodW5rLm9yaWdGcm9tO1xuICAgICAgdmFyIHRvTG9jYWwgPSBuSW5FZGl0ID8gY2h1bmsuZWRpdFRvIDogY2h1bmsub3JpZ1RvO1xuICAgICAgaWYgKGFmdGVyRSA9PSBudWxsKSB7XG4gICAgICAgIGlmIChmcm9tTG9jYWwgPiBuKSB7IGFmdGVyRSA9IGNodW5rLmVkaXRGcm9tOyBhZnRlck8gPSBjaHVuay5vcmlnRnJvbTsgfVxuICAgICAgICBlbHNlIGlmICh0b0xvY2FsID4gbikgeyBhZnRlckUgPSBjaHVuay5lZGl0VG87IGFmdGVyTyA9IGNodW5rLm9yaWdUbzsgfVxuICAgICAgfVxuICAgICAgaWYgKHRvTG9jYWwgPD0gbikgeyBiZWZvcmVFID0gY2h1bmsuZWRpdFRvOyBiZWZvcmVPID0gY2h1bmsub3JpZ1RvOyB9XG4gICAgICBlbHNlIGlmIChmcm9tTG9jYWwgPD0gbikgeyBiZWZvcmVFID0gY2h1bmsuZWRpdEZyb207IGJlZm9yZU8gPSBjaHVuay5vcmlnRnJvbTsgfVxuICAgIH1cbiAgICByZXR1cm4ge2VkaXQ6IHtiZWZvcmU6IGJlZm9yZUUsIGFmdGVyOiBhZnRlckV9LCBvcmlnOiB7YmVmb3JlOiBiZWZvcmVPLCBhZnRlcjogYWZ0ZXJPfX07XG4gIH1cblxuICBmdW5jdGlvbiBjb2xsYXBzZVNpbmdsZShjbSwgZnJvbSwgdG8pIHtcbiAgICBjbS5hZGRMaW5lQ2xhc3MoZnJvbSwgXCJ3cmFwXCIsIFwiQ29kZU1pcnJvci1tZXJnZS1jb2xsYXBzZWQtbGluZVwiKTtcbiAgICB2YXIgd2lkZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgd2lkZ2V0LmNsYXNzTmFtZSA9IFwiQ29kZU1pcnJvci1tZXJnZS1jb2xsYXBzZWQtd2lkZ2V0XCI7XG4gICAgd2lkZ2V0LnRpdGxlID0gXCJJZGVudGljYWwgdGV4dCBjb2xsYXBzZWQuIENsaWNrIHRvIGV4cGFuZC5cIjtcbiAgICB2YXIgbWFyayA9IGNtLm1hcmtUZXh0KFBvcyhmcm9tLCAwKSwgUG9zKHRvIC0gMSksIHtcbiAgICAgIGluY2x1c2l2ZUxlZnQ6IHRydWUsXG4gICAgICBpbmNsdXNpdmVSaWdodDogdHJ1ZSxcbiAgICAgIHJlcGxhY2VkV2l0aDogd2lkZ2V0LFxuICAgICAgY2xlYXJPbkVudGVyOiB0cnVlXG4gICAgfSk7XG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBtYXJrLmNsZWFyKCk7XG4gICAgICBjbS5yZW1vdmVMaW5lQ2xhc3MoZnJvbSwgXCJ3cmFwXCIsIFwiQ29kZU1pcnJvci1tZXJnZS1jb2xsYXBzZWQtbGluZVwiKTtcbiAgICB9XG4gICAgQ29kZU1pcnJvci5vbih3aWRnZXQsIFwiY2xpY2tcIiwgY2xlYXIpO1xuICAgIHJldHVybiB7bWFyazogbWFyaywgY2xlYXI6IGNsZWFyfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbGxhcHNlU3RyZXRjaChzaXplLCBlZGl0b3JzKSB7XG4gICAgdmFyIG1hcmtzID0gW107XG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtzLmxlbmd0aDsgaSsrKSBtYXJrc1tpXS5jbGVhcigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkaXRvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlZGl0b3IgPSBlZGl0b3JzW2ldO1xuICAgICAgdmFyIG1hcmsgPSBjb2xsYXBzZVNpbmdsZShlZGl0b3IuY20sIGVkaXRvci5saW5lLCBlZGl0b3IubGluZSArIHNpemUpO1xuICAgICAgbWFya3MucHVzaChtYXJrKTtcbiAgICAgIG1hcmsubWFyay5vbihcImNsZWFyXCIsIGNsZWFyKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcmtzWzBdLm1hcms7XG4gIH1cblxuICBmdW5jdGlvbiB1bmNsZWFyTmVhckNodW5rcyhkdiwgbWFyZ2luLCBvZmYsIGNsZWFyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkdi5jaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjaHVuayA9IGR2LmNodW5rc1tpXTtcbiAgICAgIGZvciAodmFyIGwgPSBjaHVuay5lZGl0RnJvbSAtIG1hcmdpbjsgbCA8IGNodW5rLmVkaXRUbyArIG1hcmdpbjsgbCsrKSB7XG4gICAgICAgIHZhciBwb3MgPSBsICsgb2ZmO1xuICAgICAgICBpZiAocG9zID49IDAgJiYgcG9zIDwgY2xlYXIubGVuZ3RoKSBjbGVhcltwb3NdID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29sbGFwc2VJZGVudGljYWxTdHJldGNoZXMobXYsIG1hcmdpbikge1xuICAgIGlmICh0eXBlb2YgbWFyZ2luICE9IFwibnVtYmVyXCIpIG1hcmdpbiA9IDI7XG4gICAgdmFyIGNsZWFyID0gW10sIGVkaXQgPSBtdi5lZGl0b3IoKSwgb2ZmID0gZWRpdC5maXJzdExpbmUoKTtcbiAgICBmb3IgKHZhciBsID0gb2ZmLCBlID0gZWRpdC5sYXN0TGluZSgpOyBsIDw9IGU7IGwrKykgY2xlYXIucHVzaCh0cnVlKTtcbiAgICBpZiAobXYubGVmdCkgdW5jbGVhck5lYXJDaHVua3MobXYubGVmdCwgbWFyZ2luLCBvZmYsIGNsZWFyKTtcbiAgICBpZiAobXYucmlnaHQpIHVuY2xlYXJOZWFyQ2h1bmtzKG12LnJpZ2h0LCBtYXJnaW4sIG9mZiwgY2xlYXIpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGVhci5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNsZWFyW2ldKSB7XG4gICAgICAgIHZhciBsaW5lID0gaSArIG9mZjtcbiAgICAgICAgZm9yICh2YXIgc2l6ZSA9IDE7IGkgPCBjbGVhci5sZW5ndGggLSAxICYmIGNsZWFyW2kgKyAxXTsgaSsrLCBzaXplKyspIHt9XG4gICAgICAgIGlmIChzaXplID4gbWFyZ2luKSB7XG4gICAgICAgICAgdmFyIGVkaXRvcnMgPSBbe2xpbmU6IGxpbmUsIGNtOiBlZGl0fV07XG4gICAgICAgICAgaWYgKG12LmxlZnQpIGVkaXRvcnMucHVzaCh7bGluZTogZ2V0TWF0Y2hpbmdPcmlnTGluZShsaW5lLCBtdi5sZWZ0LmNodW5rcyksIGNtOiBtdi5sZWZ0Lm9yaWd9KTtcbiAgICAgICAgICBpZiAobXYucmlnaHQpIGVkaXRvcnMucHVzaCh7bGluZTogZ2V0TWF0Y2hpbmdPcmlnTGluZShsaW5lLCBtdi5yaWdodC5jaHVua3MpLCBjbTogbXYucmlnaHQub3JpZ30pO1xuICAgICAgICAgIHZhciBtYXJrID0gY29sbGFwc2VTdHJldGNoKHNpemUsIGVkaXRvcnMpO1xuICAgICAgICAgIGlmIChtdi5vcHRpb25zLm9uQ29sbGFwc2UpIG12Lm9wdGlvbnMub25Db2xsYXBzZShtdiwgbGluZSwgc2l6ZSwgbWFyayk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBHZW5lcmFsIHV0aWxpdGllc1xuXG4gIGZ1bmN0aW9uIGVsdCh0YWcsIGNvbnRlbnQsIGNsYXNzTmFtZSwgc3R5bGUpIHtcbiAgICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICBpZiAoY2xhc3NOYW1lKSBlLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgICBpZiAoc3R5bGUpIGUuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgIGlmICh0eXBlb2YgY29udGVudCA9PSBcInN0cmluZ1wiKSBlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNvbnRlbnQpKTtcbiAgICBlbHNlIGlmIChjb250ZW50KSBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnRlbnQubGVuZ3RoOyArK2kpIGUuYXBwZW5kQ2hpbGQoY29udGVudFtpXSk7XG4gICAgcmV0dXJuIGU7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhcihub2RlKSB7XG4gICAgZm9yICh2YXIgY291bnQgPSBub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBjb3VudCA+IDA7IC0tY291bnQpXG4gICAgICBub2RlLnJlbW92ZUNoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gIH1cblxuICBmdW5jdGlvbiBhdHRycyhlbHQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkgKz0gMilcbiAgICAgIGVsdC5zZXRBdHRyaWJ1dGUoYXJndW1lbnRzW2ldLCBhcmd1bWVudHNbaSsxXSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb3B5T2JqKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKCF0YXJnZXQpIHRhcmdldCA9IHt9O1xuICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB0YXJnZXRbcHJvcF0gPSBvYmpbcHJvcF07XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVPdmVyKHBvcywgc3RyLCBjb3B5LCBvdGhlcikge1xuICAgIHZhciBvdXQgPSBjb3B5ID8gUG9zKHBvcy5saW5lLCBwb3MuY2gpIDogcG9zLCBhdCA9IDA7XG4gICAgZm9yICg7Oykge1xuICAgICAgdmFyIG5sID0gc3RyLmluZGV4T2YoXCJcXG5cIiwgYXQpO1xuICAgICAgaWYgKG5sID09IC0xKSBicmVhaztcbiAgICAgICsrb3V0LmxpbmU7XG4gICAgICBpZiAob3RoZXIpICsrb3RoZXIubGluZTtcbiAgICAgIGF0ID0gbmwgKyAxO1xuICAgIH1cbiAgICBvdXQuY2ggPSAoYXQgPyAwIDogb3V0LmNoKSArIChzdHIubGVuZ3RoIC0gYXQpO1xuICAgIGlmIChvdGhlcikgb3RoZXIuY2ggPSAoYXQgPyAwIDogb3RoZXIuY2gpICsgKHN0ci5sZW5ndGggLSBhdCk7XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc01pbihhLCBiKSB7IHJldHVybiAoYS5saW5lIC0gYi5saW5lIHx8IGEuY2ggLSBiLmNoKSA8IDAgPyBhIDogYjsgfVxuICBmdW5jdGlvbiBwb3NNYXgoYSwgYikgeyByZXR1cm4gKGEubGluZSAtIGIubGluZSB8fCBhLmNoIC0gYi5jaCkgPiAwID8gYSA6IGI7IH1cbiAgZnVuY3Rpb24gcG9zRXEoYSwgYikgeyByZXR1cm4gYS5saW5lID09IGIubGluZSAmJiBhLmNoID09IGIuY2g7IH1cblxuICBmdW5jdGlvbiBmaW5kUHJldkRpZmYoY2h1bmtzLCBzdGFydCwgaXNPcmlnKSB7XG4gICAgZm9yICh2YXIgaSA9IGNodW5rcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGNodW5rID0gY2h1bmtzW2ldO1xuICAgICAgdmFyIHRvID0gKGlzT3JpZyA/IGNodW5rLm9yaWdUbyA6IGNodW5rLmVkaXRUbykgLSAxO1xuICAgICAgaWYgKHRvIDwgc3RhcnQpIHJldHVybiB0bztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kTmV4dERpZmYoY2h1bmtzLCBzdGFydCwgaXNPcmlnKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjaHVuayA9IGNodW5rc1tpXTtcbiAgICAgIHZhciBmcm9tID0gKGlzT3JpZyA/IGNodW5rLm9yaWdGcm9tIDogY2h1bmsuZWRpdEZyb20pO1xuICAgICAgaWYgKGZyb20gPiBzdGFydCkgcmV0dXJuIGZyb207XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ29OZWFyYnlEaWZmKGNtLCBkaXIpIHtcbiAgICB2YXIgZm91bmQgPSBudWxsLCB2aWV3cyA9IGNtLnN0YXRlLmRpZmZWaWV3cywgbGluZSA9IGNtLmdldEN1cnNvcigpLmxpbmU7XG4gICAgaWYgKHZpZXdzKSBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZHYgPSB2aWV3c1tpXSwgaXNPcmlnID0gY20gPT0gZHYub3JpZztcbiAgICAgIGVuc3VyZURpZmYoZHYpO1xuICAgICAgdmFyIHBvcyA9IGRpciA8IDAgPyBmaW5kUHJldkRpZmYoZHYuY2h1bmtzLCBsaW5lLCBpc09yaWcpIDogZmluZE5leHREaWZmKGR2LmNodW5rcywgbGluZSwgaXNPcmlnKTtcbiAgICAgIGlmIChwb3MgIT0gbnVsbCAmJiAoZm91bmQgPT0gbnVsbCB8fCAoZGlyIDwgMCA/IHBvcyA+IGZvdW5kIDogcG9zIDwgZm91bmQpKSlcbiAgICAgICAgZm91bmQgPSBwb3M7XG4gICAgfVxuICAgIGlmIChmb3VuZCAhPSBudWxsKVxuICAgICAgY20uc2V0Q3Vyc29yKGZvdW5kLCAwKTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gQ29kZU1pcnJvci5QYXNzO1xuICB9XG5cbiAgQ29kZU1pcnJvci5jb21tYW5kcy5nb05leHREaWZmID0gZnVuY3Rpb24oY20pIHtcbiAgICByZXR1cm4gZ29OZWFyYnlEaWZmKGNtLCAxKTtcbiAgfTtcbiAgQ29kZU1pcnJvci5jb21tYW5kcy5nb1ByZXZEaWZmID0gZnVuY3Rpb24oY20pIHtcbiAgICByZXR1cm4gZ29OZWFyYnlEaWZmKGNtLCAtMSk7XG4gIH07XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
