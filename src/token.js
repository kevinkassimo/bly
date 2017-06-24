const Types = require('./type.js');
const InputStream = require('./input.js');
const Keywords = require('./keyword.js');
const OPs = require('./op.js');

function TokenStream(input) {
    var current = null;
    // TEST
    /*
    let test_obj;
    while ((test_obj = read_next()) !== null) {
        console.log(test_obj);
    }
    */
    
    return {
        next  : next,
        peek  : peek,
        eof   : eof,
        croak : input.croak
    };
    function is_keyword(x) {
        return Keywords.indexOf(x) >= 0;
    }
    function is_full_op(x) {
        return (x in OPs);
    }
    
    function is_digit(ch) {
        return /[0-9]/i.test(ch);
    }
    function is_id_start(ch) {
        return /[A-Za-z_$@]/i.test(ch); //$a as variable
    }
    function is_id(ch) {
        return is_id_start(ch) || "0123456789".indexOf(ch) >= 0;
    }
    function is_op_char(ch) {
        return ("+-*/%=&|<>!" + "~@^?").indexOf(ch) >= 0;
    }
    // Changed: treating newline as part of punctuation
    function is_punc(ch) {
        return ":,;(){}[]\n".indexOf(ch) >= 0;
    }
    function is_whitespace(ch) {
        return " \t".indexOf(ch) >= 0;
    }
    
    function read_while(predicate) {
        var str = "";
        while (!input.eof() && predicate(input.peek())) {
            str += input.next();
        }
        return str;
    }
    function read_number() {
        var has_dot = false;
        var number = read_while(function dot_check(ch) {
            if (ch == ".") {
                if (has_dot) return false;
                has_dot = true;
                return true;
            }
            return is_digit(ch);
        });
        return { type: Types.maintype.NUM, value: parseFloat(number) };
    }
    function read_ident() {
        var id = read_while(is_id);
        if (is_keyword(id)) {
            return {
                type  : Types.maintype.KW,
                value : id
            };
        } else if (is_full_op(id)) {
            return {
                type  : Types.maintype.OP,
                value : id
            };
        } else if (id[0] === "$") {
            return {
                type  : Types.maintype.VAR,
                subtype : Types.subtype.VAR,
                value : id.substring(1)
            };
        } else {
            return {
                type  : Types.maintype.VAR,
                subtype : Types.subtype.FUNC,
                value : id
            };
        }
    }
    
    function read_sh_escaped() {
        var escaped = false, str = "";
        input.next(); // eat '
        while (!input.eof()) {
            var ch = input.peek();
            if (escaped) {
                switch (ch) {
                    case 't':
                        str += '\t';
                        input.next();
                        break;
                    case 'n':
                        str += '\n';
                        input.next();
                        break;
                    default:
                        str += ch;
                        input.next();
                }
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
                input.next();
            } else {
                if (ch === '\n' || is_whitespace(ch)) {
                    break;
                } else {
                    str += ch;
                    input.next();
                }
            }
        }
        return str;
    }
    
    function read_escaped(end) {
        var escaped = false, str = "";
        input.next();
        while (!input.eof()) {
            var ch = input.next();
            if (escaped) {
                switch (ch) {
                    case 't':
                        str += '\t';
                        break;
                    case 'n':
                        str += '\n';
                        break;
                    default:
                        str += ch;
                }
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else {
                if (!Array.isArray(end)) {
                    if (ch === end) {
                        break;
                    } else {
                        str += ch;
                    }
                } else {
                    if (end.indexOf(ch) >= 0) {
                        break;
                    }
                    else {
                        str += ch;
                    }
                }
            }
        }
        return str;
    }
    function read_string() {
        return { type: Types.maintype.STR, value: read_escaped(['"', '\n']) };
    }
    
    function read_sh_string() {
        return { type: Types.maintype.STR, value: read_sh_escaped() };
    }
    
    function read_op(ch) {
        let temp_op = input.next();
        while (!is_whitespace(input.peek()) && is_full_op(temp_op + input.peek())) {
            temp_op += input.next();
        }
        return {
            type  : Types.maintype.OP,
            value : temp_op
        };
    }
    
    function skip_comment() {
        read_while(function read_till_newline(ch) { return ch != "\n"; });
        input.next();
    }
    function read_next() {
        read_while(is_whitespace);
        if (input.eof()) return null;
        var ch = input.peek();
        if (ch === "#") {
            skip_comment();
            return read_next();
        }
        if (ch === '"') return read_string(); // 'String\ is\ amazing!
        if (ch === "'") return read_sh_string();
        if (is_digit(ch)) return read_number();
        if (is_id_start(ch)) return read_ident();
        if (is_punc(ch)) return {
            type  : Types.maintype.PUNC,
            value : input.next()
        };
        
        if (is_op_char(ch)) return read_op();
        
        input.croak("Can't handle character: " + ch);
    }
    function peek() {
        return current || (current = read_next());
    }
    function next() {
        var tok = current;
        current = null;
        return tok || read_next();
    }
    function eof() {
        return peek() == null;
    }
}


/******* TEST ********/

/*
var a = new TokenStream(new InputStream(`
def funcname $a $b:
    # this is a comment
    if $a == $b and 10 >= 20:
        ret -200 + $a + $b + 100 + '123
    elif $a >= $b:
        ret false
    else:
        ret 'This\\ is\\ awesome!
    end
end
`));

var b = new TokenStream(new InputStream(`


`))
*/

/******* END TEST ********/



module.exports = TokenStream;
