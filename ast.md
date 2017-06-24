```
num  { type: "num", value: NUMBER }
str  { type: "str", value: STRING }
bool { type: "bool", value: true or false }
var  { type: "var", value: NAME }
lambda { type: "lambda", vars: [ NAME ... ], body: AST }
call { type: "call", func: AST, args: [ AST ... ] }
if   { type: "if", cond: AST, then: AST, else: AST }
assign { type: "assign", operator: "=", left: AST, right: AST }
binary { type: "binary", operator: OPERATOR, left: AST, right: AST }
prog { type: "prog", prog: [ AST... ] }
```

```
num  { type: "num", value: NUMBER }

e.g.

123.45
123
-123.45
+123.45
```

```
str  { type: "str", value: STRING }

e.g.

"This is a string"
'This\ is\ a\ string
```