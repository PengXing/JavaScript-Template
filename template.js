/**
 * javascript template
 * 基于有限状态自动机的前端模板，非正则
 * 
 * @author PengXing (px.pengxing@gmail.com)
 */
;(function(A){

    /**
     * Paser
     * @constructor
     * @param {string} str
     */
    function Parser(str){
        var me = this;
        me.str = str;
        me.length = str.length;

        var EOF = "";

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

        /**
         * Report error
         * @param {string} msg The error message
         */
        function error (msg) {
            throw new Error(msg + ': lineno[' + me.lineno + ']');
        };

        /**
         * Get the next code statement
         *
         * @return {null|object} The statement object, it contains the start and end offset, ant the statement type.
         */
        me.getNextStmt = function(){
            var status = START,
            start = me.offset + 1,
            end,
            category;

            while(status != DONE){
                var c = me.str.charAt(++me.offset);

                if(c == "\n"){
                    me.str = me.str.substring(0, me.offset) + ' ' + me.str.substring(me.offset + 1);
                    c = ' ';
                    me.lineno++;
                }
                switch(status){
                    case START:
                        if(c == '<'){
                            var _c = me.str.charAt(++me.offset);
                            if(_c == '%'){
                                status = INCODE;
                            } else {
                                me.offset--;
                                status = INTEXT;
                            }
                        } else if(c === EOF){
                            status = DONE;
                            category = type.NONE;
                        } else {
                            status = INTEXT;
                        }
                        break;
                    case INCODE:
                        if(c == '%'){
                            var _c = me.str.charAt(++me.offset);
                            if(_c == '>'){
                                status = DONE;
                                category = type.CODE;
                            } else {
                                me.offset--;
                            }
                        } else if(c === EOF){
                            error("Error. There is a single syntax seperator.");
                        }
                        break;
                    case INTEXT:
                        if(c == '<'){
                            var _c = me.str.charAt(++me.offset);
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
                code = '',
                lastType = 1;
            /**
             * Combine two consecutive output statement to one line code.
             * @type {string} str T
             */
            function concatCode(str, type){
                switch(type){
                    case 0 :
                        if(lastType){
                            code += '__s+=' + str;
                        } else {
                            code += '+' + str;
                        }
                        lastType = 0;
                        break;
                    default:
                        if(!lastType){
                            code += ';'
                        }
                        code += str;
                        lastType = 1;
                }
            };
            while(stmt = me.getNextStmt()){
                switch(stmt.type){
                    case type.CODE:
                        var flag = me.str.charAt(stmt.start + 2);
                        if(flag == '='){
                            concatCode(me.str.substring(stmt.start + 3, stmt.end - 2), 0);
                        } else if(flag == ':'){
                            flag = me.str.charAt(stmt.start + 3);
                            switch(flag){
                                case 'u':
                                    if(me.str.charAt(stmt.start + 4) == '='){
                                        concatCode('encodeURIComponent(' + me.str.substring(stmt.start + 5, stmt.end - 2) + ')', 0);
                                    } else 
                                        error("Errors. Expect char: \'=\'");
                                    break;
                                case 'h':
                                    if(me.str.charAt(stmt.start + 4) == '='){
                                        concatCode('encodeHTML(' + me.str.substring(stmt.start + 5, stmt.end - 2) + ')', 0);
                                    } else 
                                        error('Errors. Expect char: \'=\'');
                                    break;
                            }
                        } else if(flag == '#'){
                            // This is comment.
                            break;
                        } else {
                            concatCode(me.str.substring(stmt.start + 2, stmt.end - 2), 1);
                        }
                        break;
                    case type.TEXT:
                        concatCode('"' + me.str.substring(stmt.start, stmt.end).replace(/"/g, "\\\"").replace(/'/g, "\\\'") + '"', 0);
                        break;
                    default:
                        error("Errors. Unsupported statement");
                }
            }

            return code;
        };

    }

    var innerFns = {
        'encodeHTML': function(str){
            return String(str)
                .replace(/&/g,"&amp;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;")
                .replace(/"/g,"&quot;")
                .replace(/\'/g,"&#39;")
                .replace(/\\\\/g,"\\\\")
                .replace(/\\\//g,"\\\/")
        },
        'print': function(s){__s+=s}
    };

    /**
     * @param {!string} template The template string, can't be empty
     * @param {object=} opt_data
     * @param {opt=} opt
     */
    var tpl = function(template, opt_data, opt){
        if(!opt) opt = {};
        var parser = new Parser(template);
        var str = parser.parse();
        var inFns = '',
            key,
            value;
        opt['fns'] = opt['fns'] || {};
        for(key in innerFns){
            value = innerFns[key];
            opt['fns'][key] = opt['fns'][key] || value.toString();
        }
        for(key in opt['fns']){
            value = opt['fns'][key];
            value = 'var ' + key + '=' + value.replace(/[\r\t\n]/g, ' ') + ';';
            inFns += value;
        }
        var fn = new Function('obj', 'var __s="";' + inFns + 'with(obj){' + str + '}return __s');
        return opt_data ? fn(opt_data) : fn;
    };

    A.tpl = tpl;
})(window);
