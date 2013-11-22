/*
 * Comparse
 * parses content and outputs a list of change objects identifying differences
 * http://
 * Work based of "Javascript Diff Algorithm by John Resig (http://ejohn.org/)"
 * More Info:
 *  http://ejohn.org/projects/javascript-diff-algorithm/
 */
// Sample change object
/* {
        before: {
            startline:  [1-n],
            startpos:   [0-n],
            endline:    [1-n],
            endpos:     [0-n]
            content:    ''
        },
        after: {
            startline:  [1-n],
            startpos:   [0-n]
            endline:    [1-n],
            endpos:     [0-n],
            content:    ''
        }
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
    var actions = {
        add: "added",
        remove: "removed",
        replace: "replaced"
    };
    
    function escape(s) {
        var n = s;
        n = n.replace(/&/g, "&amp;");
        n = n.replace(/</g, "&lt;");
        n = n.replace(/>/g, "&gt;");
        n = n.replace(/"/g, "&quot;");
    
        return n;
    }
    
    function diffString( o, n ) {
        o = o.replace(/\s+$/, '');
        n = n.replace(/\s+$/, '');
        var chnges =[];
        var nlines = n.split('\n');
        var olines = o.split('\n');
        var ops = 0;
        var nps = 0;
        console.log(nlines);
        console.log(olines);
        
        var lines = [];
        var lgth = nlines.length > olines.length ? nlines.length : olines.length;
        
        for(var i = 0; i < lgth; i++){
            if(typeof nlines[i] !== 'undefined' && typeof olines[i] !== 'undefined'){
                lines[i] = diff(olines[i] === '' ? [] : olines[i].split(/\s+/), nlines[i] === '' ? [] : nlines[i].split(/\s+/) );
            }else{
                if(typeof nlines[i] === 'undefined'){
                    lines[i] = { o: olines[i].split(/\s+/), n: [] }
                }
                if(typeof olines[i] === 'undefined'){
                    lines[i] = { o: [], n: nlines[i].split(/\s+/) }
                }
            }
        }
        
        var oSpaces = [];
        var nSpaces = [];
        
        for(var i=0; i<nlines.length;i++){
            nSpaces[i] = nlines[i].match(/\s+/g)
        }
        for(var j=0; j<olines.length;j++){
            oSpaces[j] = olines[j].match(/\s+/g)
        }
        
        console.log(lines);
        console.log(nSpaces);
        console.log(oSpaces);
//---------------------------------------------------------------------------------------------------------------------
        for(var k = 0; k < lgth; k++){
            if(lines[k].n.length === 0){
                for (var l = 0; l < lines[k].o.length; l++) {
                    chnges[chnges.length] = { 
                      before: { 
                        startpos: ops,
                        endpos: ops += ops + lines[k].o[l].length,
                        content: escape(lines[k].o[l])
                      }, 
                      after: { 
                        startpos: null,
                        endpos: null,
                        content: '' 
                      },
                      line : k,
                      change: actions.remove
                  }
                } 
            } else {
            
            }
            ops = 0;
        }
        console.log("---------- Changes -------------------");
        console.log(chnges);
        console.log("---------- end -------------------");
//---------------------------------------------------------------------------------------------------------------------
      var out = diff(o == '' ? [] : o.split(/\s+/), n == '' ? [] : n.split(/\s+/) );
      var str = "";
      var changes = [];
      var oSpace = o.match(/\s+/g);
      if (oSpace == null) {
        oSpace = ["\n"];
      } else {
        oSpace.push("\n");
      }
      var nSpace = n.match(/\s+/g);
      if (nSpace == null) {
        nSpace = ["\n"];
      } else {
        nSpace.push("\n");
      }
    //console.log(out);
    var n_offset = 0;
    var o_offset = 0;
    var len;
    var nline = 1;
    var oline = 1;
    var npos = 0;
    var opos = 0;
    var count = 0;
    var spcOffset = 1;
    var n_sizes = measure(out.n);
    var o_sizes = measure(out.o);
    var spc = 0
        /*console.log(oSpace);
        console.log(n_sizes);
        console.log(o_sizes);*/
      if (out.n.length == 0) {
          // empty string in new (the old string was removed)
          for (var i = 0; i < out.o.length; i++) {
              changes[changes.length] = { 
                  before: { 
                    startline: oline,
                    startpos: opos,
                    endline: oline,
                    endpos:opos += o_sizes[i] + (oSpace[i].indexOf('\n') === -1 ? oSpace[i].length : oSpace[i].indexOf('\n') + spcOffset),
                    content: escape(out.o[i]) + oSpace[i] 
                  }, 
                  after: { 
                    startline: null,
                    startpos: null,
                    endline: null,
                    endpos: null,
                    content: '' 
                  },
                  change: actions.remove
              }
              if(oSpace[i].indexOf('\n') !== -1){
                  oline++;
                  opos = oSpace[i].length - (oSpace[i].indexOf('\n') + spcOffset);
              }
            str += '<del>' + escape(out.o[i]) + oSpace[i] + '</del>';
          }
      } else {
          //------------------------------------------------------------------------
          len = out.n.length > out.o.length ? out.n.length : out.o.length; 
          for(var i = 0; i <  len; i++){
            if(typeof out.n[i+n_offset] !== 'undefined' && typeof out.o[i+o_offset] !== 'undefined'){
                // 2
                if(typeof out.n[i+n_offset] !== 'object' && typeof out.o[i+o_offset] !== 'object'){
                   changes[count] = {
                        before: { 
                            startline: oline,
                            startpos: opos,
                            endline: 0,
                            endpos: opos += o_sizes[i] + (oSpace[i].indexOf('\n') === -1 ? oSpace[i].length : oSpace[i].indexOf('\n') + spcOffset),
                            content: escape(out.o[i+o_offset]) + oSpace[i] 
                        },
                        after:  { 
                            startline: nline,
                            startpos: npos,
                            endline: 0,
                            endpos: npos += n_sizes[i] + (nSpace[i].indexOf('\n') === -1 ? nSpace[i].length : nSpace[i].indexOf('\n') + spcOffset),
                            content: escape(out.n[i+n_offset]) + nSpace[i] 
                        },
                        change: actions.replace
                   } 
                   count++;
                }else if(typeof out.n[i+n_offset] !== 'object' && typeof out.o[i+o_offset] === 'object'){
                    // 1
                    changes[count] = {
                        before: {
                            startline: null,
                            startpos: null,
                            endline: null,
                            endpos: null,
                            content: '' 
                        },
                        after:  {
                            startline: nline,
                            startpos: npos,
                            endline: 0,
                            endpos: npos += n_sizes[i],
                            content: escape(out.n[i+n_offset]) + nSpace[i] 
                        },
                        change: actions.add
                   }
                   n_offset++;
                    count++;
                }else if(typeof out.n[i+n_offset] === 'object' && typeof out.o[i+o_offset] !== 'object'){
                    // 3
                    changes[count] = {
                        before: { 
                            startline: oline,
                            startpos: opos,
                            endline: 0,
                            endpos: opos += o_sizes[i],
                            content: escape(out.o[i+o_offset]) + oSpace[i] 
                        },
                        after:  { 
                            startline: null,
                            startpos: null,
                            endline: null,
                            endpos: null,
                            content: '' 
                        },
                        change: actions.remove
                   }
                   o_offset++;
                    count++;
                }else {
                    opos += o_sizes[i];
                    npos += n_sizes[i];
                }
            } else {
                // one of the arrays has run out
                if(typeof out.n[i+n_offset] === 'undefined'){ //no more new items
                    for(var j = i + o_offset; j < out.o.length; j++){
                        if(typeof out.o[j] !== 'object'){
                            changes[count] = {
                                before: { 
                                    startline: oline,
                                    startpos: opos,
                                    endline: 0,
                                    endpos: opos += o_sizes[i],
                                    content: escape(out.o[j]) + oSpace[i] 
                                },
                                after:  { 
                                    startline: null,
                                    startpos: null,
                                    endline: null,
                                    endpos: null,
                                    content: '' 
                                },
                                change: actions.remove
                            }
                            count++;
                        }
                    }
                    break;
                }
                if(typeof out.o[i+o_offset] === 'undefined'){ //no more old items
                    for(var j = i + n_offset; j < out.n.length; j++){
                        if(typeof out.n[j] !== 'object'){
                            changes[count] = {
                                before: { 
                                    startline: null,
                                    startpos: null,
                                    endline: null,
                                    endpos: null,
                                    content: '' 
                                },
                                after:  { 
                                    startline: nline,
                                    startpos: npos,
                                    endline: 0,
                                    endpos: npos += n_sizes[i],
                                    content: escape(out.n[j]) + nSpace[i] 
                                },
                                change: actions.add
                            }
                            count++;
                        }
                    }
                    break;
                }
            }
          }
          
       //------------------------------------------------------------------------------
        if (out.n[0].text == null) {
          // displaying everything that has been removed
          for (n = 0; n < out.o.length && out.o[n].text == null; n++) {
            str += '<del>' + escape(out.o[n]) + oSpace[n] + "</del>";
          }
        }
        
        for ( var i = 0; i < out.n.length; i++ ) {
          if (out.n[i].text == null) {
              // has been added
            str += '<ins>' + escape(out.n[i]) + nSpace[i] + "</ins>";
          } else {
              // everything else
            var pre = "";
    
            for (n = out.n[i].oldPos + 1; n < out.o.length && out.o[n].text == null; n++ ) {
              pre += '<del>' + escape(out.o[n]) + oSpace[n] + "</del>";
            }
            str += " " + out.n[i].text + nSpace[i] + pre;
          }
        }
      }
      console.log(changes);
      console.log(str.replace("<del>", ""));
      return str;
    }
    
   
    function measure(o){
        var s = [];
        for(var i = 0; i < o.length; i++){
            if(typeof o[i] === "object"){
                s[i] = o[i].text.length;
            }else{
                s[i] = o[i].length;
            }
        }
        return s;
    };
    
    function diff( o, n ) {
      var ns = [];
      var os = [];
      for ( var i = 0; i < n.length; i++ ) {
        if ( ns[ n[i] ] == null )
          ns[ n[i] ] = { rows: new Array(), o: null };
        ns[ n[i] ].rows.push( i );
      }
      
      for ( var i = 0; i < o.length; i++ ) {
        if ( os[ o[i] ] == null )
          os[ o[i] ] = { rows: new Array(), n: null };
        os[ o[i] ].rows.push( i );
      }
      
      for ( var i in ns ) {
        if ( ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1 ) {
          n[ ns[i].rows[0] ] = { text: n[ ns[i].rows[0] ], oldPos: os[i].rows[0] };
          o[ os[i].rows[0] ] = { text: o[ os[i].rows[0] ], newPos: ns[i].rows[0] };
        }
      }
      
      for ( var i = 0; i < n.length - 1; i++ ) {
        if ( n[i].text != null && n[i+1].text == null && n[i].oldPos + 1 < o.length && o[ n[i].oldPos + 1 ].text == null && 
             n[i+1] == o[ n[i].oldPos + 1 ] ) {
          n[i+1] = { text: n[i+1], oldPos: n[i].oldPos + 1 };
          o[n[i].oldPos+1] = { text: o[n[i].oldPos+1], newPos: i + 1 };
        }
      }
      
      for ( var i = n.length - 1; i > 0; i-- ) {
        if ( n[i].text != null && n[i-1].text == null && n[i].oldPos > 0 && o[ n[i].oldPos - 1 ].text == null && 
             n[i-1] == o[ n[i].oldPos - 1 ] ) {
          n[i-1] = { text: n[i-1], oldPos: n[i].oldPos - 1 };
          o[n[i].oldPos-1] = { text: o[n[i].oldPos-1], newPos: i - 1 };
        }
      }
      
      return { o: o, n: n };
    } 
    exports.parse = function(old, nw, opts){
        return diffString(old, nw);
    }
})