var _Bly_Type = require('./type.js');

function InputStream(input) {
    var pos = 0, line = 1, col = 0;
    return {
        next  : next,
        peek  : peek,
        eof   : eof,
        croak : croak
    };
    function next() {
        var ch = input.charAt(pos++);
        if (ch === '\n') {
            line++;
            col = 0;
        } else {
            col++;
        }
        return ch;
    }
    function peek() {
        return input.charAt(pos);
    }
    function eof() {
        return peek() === '';
    }
    function croak(msg) {
        throw new Error(msg + ' (' + line + ':' + col + ')');
    }
}

function TokenStream(input) {
    var current = null;
    var keywords = ` if then elif else begin end for in of while do def class let var from true false ret and or not `;
    
    
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
        return keywords.indexOf(' ' + x + ' ') >= 0;
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
        return { type: _Bly_Type.NUM, value: parseFloat(number) };
    }
    function read_ident() {
        var id = read_while(is_id);
        if (is_keyword(id)) {
            return {
                type  : _Bly_Type.KEYWORD,
                value : id
            };
        } else if (id[0] === "$") {
            return {
                type  : _Bly_Type.VAR,
                subtype : _Bly_Type.VAR,
                value : id.substring(1)
            };
        } else {
            return {
                type  : _Bly_Type.VAR,
                subtype : _Bly_Type.FUNCVAR,
                value : id
            };
        }
        /*
        return {
            type  : is_keyword(id) ? _Bly_Type.KEYWORD : _Bly_Type.VAR,
            value : id
        };
        */
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
                    case ' ':
                        str += ' ';
                        break;
                    default:
                        str += ch;
                }
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else {
                if (!Array.isArray(end)) {
                    if (ch === end) break;
                    else str += ch;
                } else {
                    if (end.indexOf(ch) >= 0) break;
                    else str += ch;
                }
            }
        }
        return str;
    }
    function read_string() {
        return { type: _Bly_Type.STR, value: read_escaped(['"', '\n']) };
    }
    
    function read_sh_string() {
        return { type: _Bly_Type.STR, value: read_escaped([' ', '\n']) };
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
            type  : _Bly_Type.PUNC,
            value : input.next()
        };
        if (is_op_char(ch)) return {
            type  : _Bly_Type.OP,
            value : read_while(is_op_char)
        };
        
        /*
        if (is_newline(ch)) return {
            type  : _Bly_Type.NEWLINE,
            value : input.next()
        }
        */
        
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
    if $a == $b and 10 > 20:
        ret -200 + $a + $b + 100 + '123
    elif $a >= $b:
        ret false
    else:
        ret 'This\\ is\\ awesome!
end
`));
*/

/******* END TEST ********/



module.exports = {
    InputStream: InputStream,
    TokenStream: TokenStream
};
