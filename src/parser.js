const util = require('util');
const Types = require('./type.js');
const InputStream = require('./input.js');
const TokenStream = require('./token.js');
const Keywords = require('./keyword.js');
const OPs = require('./op.js');

var FALSE = { type: Types.maintype.BOOL, value: false };

var parse = function (input) {
    return parse_toplevel();
    
    function is_punc(ch) {
        var tok = input.peek();
        return tok && tok.type === Types.maintype.PUNC && (!ch || tok.value === ch) && tok;
    }
    function is_kw(kw) {
        var tok = input.peek();
        return tok && tok.type === Types.maintype.KW && (!kw || tok.value === kw) && tok;
    }
    function is_op(op) {
        var tok = input.peek();
        return tok && tok.type === Types.maintype.OP && (!op || tok.value === op) && tok;
    }
    function is_any(t) {
        var tok = input.peek();
        return tok && tok.type === t.type && tok.value === t.value;
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
    function skip_any(t) {
        if (is_any(t)) input.next();
        else input.croak("Expecting: " + op);
    }
    function skip_any_from_list(tlist) { // Skip any that comes first from list
        for (let e of tlist) {
            if (is_any(e)) {
                input.next();
                return true;
            }
        }
        return false;
    }
    
    function delimited_by(starts, require_start, stops, should_skip_stop, separators, separate_by_space, parser) {
        var a = [], first = true;
        
        if (require_start && skip_any_from_list(starts) !== true) {
            input.croak("Missing start delimiting");
        }
        
        var test_stop = function () {
            for (let e of stops) {
                if (is_any(e)) {
                    return e;
                }
            }
            return null;
        }
        
        let stop_val;
        while (!input.eof()) {
            stop_val = test_stop();
            if (stop_val !== null) break;
            if (first) {
                first = false;
            } else {
                if (!separate_by_space) {
                    if (skip_any_from_list(separators)) {
                        input.croak("Expecting separator");
                    }
                }
            }
            stop_val = test_stop();
            if (stop_val !== null) break;
            a.push(parser());
        }
        if (should_skip_stop) {
            skip_any_from_list(stops);
        }
        return a;
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
    
    function delimited_func_call_args(parser) {
        var a = [];
        while (!input.eof()) {
            if (is_punc("\n")) {
                skip_punc("\n");
                break;
            }
            if (is_punc(";")) {
                skip_punc(";");
                break;
            }
            if (is_punc(")")) break;
            if (is_punc(":")) break;
            
            a.push(parser());
        }
        return a;
    }
    
    function parse_varname() {
        var name = input.next();
        if (name.type != "var") input.croak("Expecting variable name");
        return name.value;
    }
    
    function parse_bool() {
        return {
            type  : "bool",
            value : input.next().value == "true"
        };
    }
    function parse_call(func) {
        return {
            type: Types.maintype.CALL,
            func: func,
            args: delimited_func_call_args(parse_expression),
        };
    }
    function parse_lambda() {
        
        let peeked_token = input.peek();
        let peeked_name = null;
        
        if (peeked_token.type === Types.maintype.VAR && peeked_token.subtype === Types.subtype.FUNC) {
            peeked_name = input.next().value;
        }
        return {
            type: Types.maintype.LAMBDA,
            name: peeked_name,
            vars: delimited_by([], false, [
                    { type: Types.maintype.PUNC, value: ':' }
                ], false, "", true, parse_expression),
            body: parse_expression()
        };
    }
    function parse_if() {
        
    }
    
    function parse_atom() {
        return maybe_call(function() { 
              
            if (is_punc("(")) {
                input.next();
                var exp = parse_expression();
                skip_punc(")");
                return exp;
            }
            //if (is_punc("{")) return parse_prog();
            if (is_punc(":")) return parse_scope_prog();
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
                console.log("Invalid token: ");
                console.log(tok);
            }
                
            unexpected();
        });
    }
    
    function parse_scope_prog() {
        if (input.peek().value === ':') {
            input.next(); // skip starting colon
        } else {
            input.croak("missing scope start statement");
        }
        var prog = [];
        
        while (true) {
            while (is_punc("\n")) {
                input.next();
            }
            let peeked = input.peek();
            if (peeked.type === Types.maintype.KW) {
                if (peeked.value === "end") {
                    // end is always skippable
                    input.next();
                    while (is_punc("\n")) {
                        input.next();
                    }
                    break;
                } else if (peeked.value === "else" || peeked.value === "elif") {
                    // Do not skip these keyword as they would be used
                    break;
                }
            }
            prog.push(parse_expression());
        }
        return {
            type: "prog",
            prog: prog
        };
    }
    
    function parse_toplevel() {
        var prog = [];
        while (!input.eof()) {
            while (is_punc("\n")) {
                input.next(); // skip all unnecessary newlines
            }
            if (!input.eof()) {
                prog.push(parse_expression());
            }
        }
        return { type: Types.maintype.PROG, prog: prog };
    }
    function parse_expression() {
        return maybe_call(function(){
            return maybe_binary(parse_atom(), 0);
        });
    }
    // Handle call expression in case
    function maybe_call(expr) {
        expr = expr();
        if (expr.type === Types.maintype.VAR && expr.subtype === Types.subtype.FUNC) { // funcname $a $b
            return parse_call(expr);
        } else {
            return expr;
        }
    }
    function maybe_binary(left, my_prec) {
        var tok = is_op();
        if (tok) {
            var his_prec = OPs[tok.value];
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
};


console.log(util.inspect(parse(TokenStream(InputStream(`

mask (call $a $b) $c

def func $a $b:
    $a = 1 + 2
    $b = $a and $b
    echo ('123 + '456 )
end

`))), false, null))

/*
TODO:
1. fix shell string (FIXED)
2. fix -1 negative expression parsing
3. add if...else expression
4. add for, while construct
5. add pipe functions
*/