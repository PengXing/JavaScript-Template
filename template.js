var app = {};

/**
 * javascript template
 * 
 * @author PengXing
 * @email px.pengxing@gmail.com
 */
;(function(A){

    function Parser(str){
        var me = this;
        me.str = str;
        me.length = str.length;

        var EOF = undefined;

        var START = 0,
            DONE = 1,
            INCODE = 2,
            INCOMMENT = 3,
            INTEXT = 4;

        var type = {
            CODE : 0,
            TEXT : 1,
            NONE : 2
        };

        //running variables
        me.offset = -1;
        me.lineno = 1;


        /* 
        too many function invokes slow down this program.
        me.getNextChar = function(){
            if(me.str[me.offset + 1] === undefined){
                me.offset++;
                return EOF;
            }
            return me.str[++me.offset];
        };

        me.ungetNextChar = function(){
            me.offset--;
        };
        */

        var error = function(msg){
            throw new Error(msg + ': lineno[' + me.lineno + ']');
        };

        me.getNextStmt = function(){
            var status = START,
            start = me.offset + 1,
            end,
            category;

            while(status != DONE){
                //var c = me.getNextChar();
                var c = me.str[++me.offset];

                if(c == "\n"){
                    me.str = me.str.substring(0, me.offset) + ' ' + me.str.substring(me.offset + 1);
                    c = ' ';
                    me.lineno++;
                }
                switch(status){
                    case START:
                        if(c == '<'){
                            //var _c = me.getNextChar();
                            var _c = me.str[++me.offset];
                            if(_c == '%'){
                                status = INCODE;
                            } else {
                                me.offset--;
                                status = INTEXT
                            }
                        } else if(c === EOF){
                            status = DONE;
                            category = type.NONE;
                        } else {
                            status = INTEXT
                        }
                        break;
                    case INCODE:
                        if(c == '%'){
                            //var _c = me.getNextChar();
                            var _c = me.str[++me.offset];
                            if(_c == '>'){
                                status = DONE;
                                category = type.CODE;
                            } else {
                                //me.ungetNextChar();
                                me.offset--;
                            }
                        } else if(c === EOF){
                            error("Error. There is a single syntax seperator.");
                        }
                        break;
                    case INTEXT:
                        if(c == '<'){
                            //var _c = me.getNextChar();
                            var _c = me.str[++me.offset];
                            if(_c == '%'){
                                me.offset -= 2;
                                status = DONE;
                                category = type.TEXT;
                            }
                        } else if(c === EOF){
                            status = DONE;
                            category = type.TEXT;
                        }
                }

            }

            if(category == type.NONE){
                return null;
            } else {
                return {
                    start : start,
                    end : me.offset + 1,
                    type : category
                };
            }
        };

        me.parse = function(){
            var stmt,
            code = '';
            while(stmt = me.getNextStmt()){
                switch(stmt.type){
                    case type.CODE:
                        var flag = me.str[stmt.start + 2];
                        if(flag == '='){
                            code += 'print(' + me.str.substring(stmt.start + 3, stmt.end - 2) + ');';
                        } else if(flag == ':'){
                            flag = me.str[stmt.start + 3];
                            switch(flag){
                                case 'u':
                                    if(me.str[stmt.start + 4] == '='){
                                        code += 'print(encodeURIComponent(' + me.str.substring(stmt.start + 5, stmt.end - 2) + '));';
                                    } else 
                                        error("Errors. Expect char: \'=\'");
                                    break;
                                //可以再这里添加其他命令
                            }
                        } else if(flag == '#'){
                            //注释
                            break;
                        } else {
                            code += me.str.substring(stmt.start + 2, stmt.end - 2);
                        }
                        break;
                    case type.TEXT:
                        code += '__s+="' + me.str.substring(stmt.start, stmt.end) + '";';
                        break;
                    default:
                        error("Errors. Unsupported statement");
                }
            }

            return code;
        };

    }

    /**
     * @function 模板函数
     * @param {string} 模板
     * @param {object} 数据
     * @param {object} 参数，可包含自定义函数
     * @return {string|Function} 如果包含数据，则返回函数执行后的字符串，否则返回函数
     */
    var tpl = function(template, data, opt){
        if(!opt) opt = {};
        var parser = new Parser(template);
        var str = parser.parse();
        var inFns = '',
            key,
            value;
        for(key in opt['fns']){
            value = opt['fns'][key];
            value = 'var ' + key + '=' + value.replace(/[\r\t\n]/g, ' ') + ';';
            inFns += value;
        }
        var fn = new Function('obj', 'var __s="",print=function(s){__s+=s};' + inFns + 'with(obj){' + str + '}return __s');
        return data ? fn(data) : fn;
    };

    A.tpl = tpl;
})(app);
