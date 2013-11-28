module.exports = exports = {
    added: {
       before: 'foo',
       after: 'foo bar'
    },
    removed: {
        before: 'foo bar',
        after: 'bar'
    },
    replaced: {
        before: 'foo',
        after: 'bar'
    },
    multiLine: {
        before: 'function foo(){\n\tvar a = 5;\n\tb = 5;\n\treturn a + b;\n}',
        after: 'var bar = function foo(){\n\tvar a = 5;\n\tb = 5;\n\treturn a;\n}'
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
        before: 'foo bar test ',
        after: 'bar trek bald'
    }
};