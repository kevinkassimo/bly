module.exports = {
    maintype: {
        NUM    : 'num',
        STR    : 'str',
        BOOL   : 'bool',
        VAR    : 'var',
        KW     : 'kw',
        OP     : 'op',
        PUNC   : 'punc',
        PROG   : 'prog',
        CALL   : 'call',
        
        // FUNC and LAMBDA in maintype are synonym
        FUNC   : 'lambda',
        LAMBDA : 'lambda'
    },
    subtype: {
        VAR  : 'var',
        FUNC : 'func'
    }
};