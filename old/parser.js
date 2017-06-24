const util = require('util')

var _Bly = {
    Type: require('./type.js'),
    Token: require('./token.js')
};

var FALSE = { type: _Bly.Type.BOOL, value: false };
function parse(input) {
    var PRECEDENCE = {
        "=": 1,
        "||": 2,
        "&&": 3,
        "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
        "+": 10, "-": 10,
        "*": 20, "/": 20, "%": 20,
    };
    return parse_toplevel();
    function is_punc(ch) {
        var tok = input.peek();
        return tok && tok.type == _Bly.Type.PUNC && (!ch || tok.value == ch) && tok;
    }
    function is_kw(kw) {
        var tok = input.peek();
        return tok && tok.type == _Bly.Type.KEYWORD && (!kw || tok.value == kw) && tok;
    }
    function is_op(op) {
        var tok = input.peek();
        return tok && tok.type == _Bly.Type.OP && (!op || tok.value == op) && tok;
    }
    function is_newline() {
        var tok = input.peek();
        return tok && tok.type == _Bly.Type.NEWLINE && (!nl || tok.value == '\n') && tok;
    }
    
    function skip_punc(ch) {
        if (is_punc(ch)) input.next();
        else input.croak("Expecting punctuation: \"" + ch + "\"");
    }
    function skip_kw(kw) {
        if (is_kw(kw)) input.next();
        else input.croak("Expecting keyword: \"" + kw + "\"");
    }
    function skip_op(op) {
        if (is_op(op)) input.next();
        else input.croak("Expecting operator: \"" + op + "\"");
    }
    
    // Using these functions to skip with knowledge of space
    function skip_newline() {
        if (is_newline()) input.next();
        else input.croak("Expecting newline delimiting");
    }
    
    
    function unexpected() {
        input.croak("Unexpected token: " + JSON.stringify(input.peek()));
    }
    function maybe_binary(left, my_prec) {
        var tok = is_op();
        if (tok) {
            var his_prec = PRECEDENCE[tok.value];
            if (his_prec > my_prec) {
                input.next();
                return maybe_binary({
                    type     : tok.value === "=" ? "assign" : "binary",
                    operator : tok.value,
                    left     : left,
                    right    : maybe_binary(parse_atom(), his_prec)
                }, my_prec);
            }
        }
        return left;
    }
    function delimited(start, stop, separator, parser) {
        var a = [], first = true;
        skip_punc(start);
        while (!input.eof()) {
            if (is_punc(stop)) break;
            if (first) first = false; else skip_punc(separator);
            if (is_punc(stop)) break;
            a.push(parser());
        }
        skip_punc(stop);
        return a;
    }
    function space_delimited_args(stop, parser) {
        var a = [];
        while (!input.eof()) {
            if (is_punc(stop)) break;
            a.push(parser());
        }
        skip_punc(stop);
        return a;
    }
    
    function parse_call(func) {
        return {
            type: "call",
            func: func,
            args: delimited("(", ")", ",", parse_expression),
        };
    }
    function parse_varname() {
        var name = input.next();
        if (name.type != "var") input.croak("Expecting variable name");
        return name.value;
    }
    function parse_if() {
        skip_kw("if");
        var cond = parse_expression();
        //if (!is_punc("{")) skip_kw("then");
        var then = parse_expression();
        var ret = {
            type: "if",
            cond: cond,
            then: then,
        };
        
        if (is_kw("else")) {
            input.next();
            ret.else = parse_expression();
        }
        
        if (is_kw("end")) {
            return ret;
        } else {
            console.log("Expecting 'end' for 'if' expression");
        }
        //return ret;
    }
    
    /*
     * def funcname $a $b: ... end
     * fun $a $b : $a + $b end
     */
    function parse_lambda() {
        return {
            type: "lambda",
            name: input.peek().type === "var" ? input.next().value : null,
            vars: space_delimited_args(":", parse_varname),
            body: parse_expression()
        };
    }
    function parse_return() {
        return {
            type: "return",
            value: parse_expression()
        };
    }
    function parse_bool() {
        return {
            type  : "bool",
            value : input.next().value == "true"
        };
    }
    function maybe_call(expr) {
        expr = expr();
        if (expr.type === "var" && expr.value[0] != "$") { // funcname $a $b
            return parse_call(expr);
        } else {
            return expr;
        }
        //return is_punc("(") ? parse_call(expr) : expr;
    }
    function parse_atom() {
        return maybe_call(function() {    
            if (is_punc("(")) {
                input.next();
                var exp = parse_expression();
                skip_punc(")");
                return exp;
            }
            if (is_punc("{")) return parse_prog();
            if (is_punc(":")) return parse_prog();
            if (is_kw("if")) return parse_if();
            if (is_kw("true") || is_kw("false")) return parse_bool();
            
            if (is_kw("def") || is_kw("fun")) {
                input.next();
                return parse_lambda();
            }
            
            if (is_kw("ret")) {
                input.next();
                return parse_return();
            }
            
            var tok = input.next();
            if (tok.type == "var" || tok.type == "num" || tok.type == "str")
                return tok;
            else {
                console.log(tok);
            }
                
            unexpected();
        });
    }
    function parse_toplevel() {
        var prog = [];
        while (!input.eof()) {
            while (is_punc("\n")) skip_punc("\n");
            prog.push(parse_expression());
        }
        return { type: "prog", prog: prog };
    }
    function parse_prog() {
        var prog = delimited(":", "end", "\n", parse_expression);
        if (prog.length == 0) return FALSE;
        if (prog.length == 1) return prog[0];
        return { type: "prog", prog: prog };
    }
    function parse_expression() {
        return maybe_call(function(){
            return maybe_binary(parse_atom(), 0);
        });
    }
}


console.log(util.inspect(parse(_Bly.Token.TokenStream(_Bly.Token.InputStream(`
100


`))), false, null))