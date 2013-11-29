'use strict';
var comparse = require('../comparse');
var fixtures = require('./fixtures/fixtures');
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
    'New content was added to old': function(test){
        var fix = fixtures.added;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 1, 'The should be only one change');
        test.equal(actual[0].change,'added' ,'New content was added');
        test.equal(actual[0].line, 1, 'The change was on the first line' );
        
        test.equal(actual[0].before.content, null , 'There was no previous content');
        test.equal(actual[0].before.startpos, null, 'There was no previous startpos');
        test.equal(actual[0].before.endpos, null, 'There was no previous endpos');
        
        test.equal(actual[0].after.content, 'bar', 'The added content is bar');
        test.equal(actual[0].after.startpos, 4, 'The startpos for the added content should be 4');
        test.equal(actual[0].after.endpos, 6, 'The endpos for the added content should be 6');
        
        test.done();
    },
    'New content is created, no old content previously': function(test){
        var fix = fixtures.newContent;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 1, 'The should be only one change');
        test.equal(actual[0].change,'added' ,'New content was added');
        test.equal(actual[0].line, 1, 'The change was on the first line' );
        
        test.equal(actual[0].before.content, null , 'There was no previous content');
        test.equal(actual[0].before.startpos, null, 'There was no previous startpos');
        test.equal(actual[0].before.endpos, null, 'There was no previous endpos');
        
        test.equal(actual[0].after.content, 'foo', 'The added content is "foo"');
        test.equal(actual[0].after.startpos, 0, 'The startpos for the added content should be 0');
        test.equal(actual[0].after.endpos, 2, 'The endpos for the added content should be 2');
        
        test.done();
    },
    'Old content was removed': function(test){
        var fix = fixtures.removed;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 1, 'The should be only one change');
        test.equal(actual[0].change,'removed' ,'New content was added');
        test.equal(actual[0].line, 1, 'The change was on the first line' );
        
        test.equal(actual[0].before.content, 'foo', 'The removed content is "foo"');
        test.equal(actual[0].before.startpos, 0, 'The startpos for the removed content should be 0');
        test.equal(actual[0].before.endpos, 2, 'The endpos for the removed content should be 2');
        
        test.equal(actual[0].after.content, null , 'There was no new content');
        test.equal(actual[0].after.startpos, null, 'There was no new startpos');
        test.equal(actual[0].after.endpos, null, 'There was no new endpos');
        
        test.done();
    },
    'Content was replaced': function(test){
        var fix = fixtures.replaced;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 1, 'The should be only one change');
        test.equal(actual[0].change,'replaced' ,'New content was added');
        test.equal(actual[0].line, 1, 'The change was on the first line' );
        
        test.equal(actual[0].before.content, 'foo', 'The content to be replaced is "foo"');
        test.equal(actual[0].before.startpos, 0, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[0].before.endpos, 2, 'The endpos for the content to be replaced should be 2');
        
        test.equal(actual[0].after.content, 'bar' , 'The content that replaced is "bar"');
        test.equal(actual[0].after.startpos, 0, 'The startpos for the content that replaced should be 0');
        test.equal(actual[0].after.endpos, 2, 'The endpos for the content that replaced should be 2');
        
        test.done();
    },
    'Multiline changes': function(test){
        var fix = fixtures.multiLine;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 5, 'The should be five changes');
        
        test.equal(actual[0].change,'added' ,'New content was added');
        test.equal(actual[0].line, 1, 'The change was on the first line' );
        test.equal(actual[0].before.content, null, 'The content to be replaced is "foo"');
        test.equal(actual[0].before.startpos, null, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[0].before.endpos, null, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[0].after.content, 'var' , 'The content that replaced is "bar"');
        test.equal(actual[0].after.startpos, 0, 'The startpos for the content that replaced should be 0');
        test.equal(actual[0].after.endpos, 2, 'The endpos for the content that replaced should be 2');
        
        test.equal(actual[1].change,'added' ,'New content was added');
        test.equal(actual[1].line, 1, 'The change was on the first line' );
        test.equal(actual[1].before.content, null, 'The content to be replaced is "foo"');
        test.equal(actual[1].before.startpos, null, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[1].before.endpos, null, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[1].after.content, 'bar' , 'The content that replaced is "bar"');
        test.equal(actual[1].after.startpos, 4, 'The startpos for the content that replaced should be 0');
        test.equal(actual[1].after.endpos, 6, 'The endpos for the content that replaced should be 2');
        
        test.equal(actual[2].change,'added' ,'New content was added');
        test.equal(actual[2].line, 1, 'The change was on the first line' );
        test.equal(actual[2].before.content, null, 'The content to be replaced is "foo"');
        test.equal(actual[2].before.startpos, null, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[2].before.endpos, null, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[2].after.content, '=' , 'The content that replaced is "bar"');
        test.equal(actual[2].after.startpos, 8, 'The startpos for the content that replaced should be 0');
        test.equal(actual[2].after.endpos, 8, 'The endpos for the content that replaced should be 2');
        
        
        test.equal(actual[3].change,'removed' ,'New content was added');
        test.equal(actual[3].line, 2, 'The change was on the first line' );
        test.equal(actual[3].before.content, '', 'The content to be replaced is "foo"');
        test.equal(actual[3].before.startpos, 0, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[3].before.endpos, 0, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[3].after.content, null , 'The content that replaced is "bar"');
        test.equal(actual[3].after.startpos, null, 'The startpos for the content that replaced should be 0');
        test.equal(actual[3].after.endpos, null, 'The endpos for the content that replaced should be 2');
        
        test.equal(actual[4].change,'replaced' ,'New content was added');
        test.equal(actual[4].line, 4, 'The change was on the first line' );
        test.equal(actual[4].before.content, 'b;', 'The content to be replaced is "foo"');
        test.equal(actual[4].before.startpos, 12, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[4].before.endpos, 13, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[4].after.content, 'c;' , 'The content that replaced is "bar"');
        test.equal(actual[4].after.startpos, 12, 'The startpos for the content that replaced should be 0');
        test.equal(actual[4].after.endpos, 13, 'The endpos for the content that replaced should be 2');
        
        test.done();
    },
    'No changes': function(test){
        var fix = fixtures.noChanges;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 0, 'The should be no changes');
        
        test.done();
    },
    'Mixed changes': function(test){
        var fix = fixtures.mixed;
        var actual = comparse.parse(fix.before, fix.after);
        
        test.equal(actual.length, 3, 'The should be 3 changes');
        
        test.equal(actual[0].change,'removed' ,'New content was removed');
        test.equal(actual[0].line, 1, 'The change was on the first line' );
        test.equal(actual[0].before.content, 'foo', 'The content to be replaced is "foo"');
        test.equal(actual[0].before.startpos, 0, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[0].before.endpos, 2, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[0].after.content, null , 'The content that replaced is "bar"');
        test.equal(actual[0].after.startpos, null, 'The startpos for the content that replaced should be 0');
        test.equal(actual[0].after.endpos, null, 'The endpos for the content that replaced should be 2');
        
        test.equal(actual[1].change,'replaced' ,'Content was replaced');
        test.equal(actual[1].line, 1, 'The change was on the first line' );
        test.equal(actual[1].before.content, 'test', 'The content to be replaced is "test"');
        test.equal(actual[1].before.startpos, 8, 'The startpos for the content to be replaced should be 8');
        test.equal(actual[1].before.endpos, 11, 'The endpos for the content to be replaced should be 11');
        test.equal(actual[1].after.content, 'trek' , 'The content that replaced is "trek"');
        test.equal(actual[1].after.startpos, 4, 'The startpos for the content that replaced should be 4');
        test.equal(actual[1].after.endpos, 7, 'The endpos for the content that replaced should be 7');
        
        test.equal(actual[2].change,'added' ,'New content was added');
        test.equal(actual[2].line, 1, 'The change was on the first line' );
        test.equal(actual[2].before.content, null, 'The content to be replaced is "foo"');
        test.equal(actual[2].before.startpos, null, 'The startpos for the content to be replaced should be 0');
        test.equal(actual[2].before.endpos, null, 'The endpos for the content to be replaced should be 2');
        test.equal(actual[2].after.content, 'bald' , 'The content that replaced is "bar"');
        test.equal(actual[2].after.startpos, 9, 'The startpos for the content that replaced should be 0');
        test.equal(actual[2].after.endpos, 12, 'The endpos for the content that replaced should be 2');
        
        test.done();
    }
    
}