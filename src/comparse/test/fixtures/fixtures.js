module.exports = exports = {
    // Fixtures for testing the options
    zeroLineIndex: {
        before: '',
        after: ''
    },
    zeroCharIndex: {
        before: '',
        after: ''
    },
    returnBoolean: {
        before: '',
        after: ''
    },
    // Fixtures for content testing
    added: {
       before: 'foo',
       after: 'foo bar'
    },
    newContent: {
        before: '',
        after: 'foo'
    },
    removed: {
        before: 'foo bar',
        after: 'bar'
    },
    replaced: {
        before: 'foo baz',
        after: 'bar baz'
    },
    multiLine: {
        before: 'function foo(){\n\tvar a = 5;\n\tb = 5;\n\treturn a + b;\n}',
        after: 'var bar = function foo(){\nvar a = 5;\n\tb = 5;\n\treturn a + c;\n}'
    },
    addSpaces: {
        before: 'foo',
        after: 'foo   '
    },
    removeSpaces: {
        before: '   bar',
        after: 'bar'
    },
    noChanges: {
        before: 'foo bar',
        after: 'foo bar'
    },
    mixed: {
        before: 'foo bar test',
        after: 'bar trek bald'
    }
};