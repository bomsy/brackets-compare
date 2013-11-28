'use strict';
var comparse = require('../comparse');
var fixtures = require('fixtures/fixtures');
/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports['comparse'] = {
    'content was added': function(test){
        var fix = fixtures.added;
        var actual = comparse.parse(fix.before, fix.after);
        test.equal(actual.length, 1);
        test.equal(actual[0].change, 'added');
        test.done();
    },
    'mixed changes': function(test){
    
    },
    'content was replaced': function(test){
    
    },
    'added, removed, replaced' : function(test){
    
    }
}