/**
 * javascript template
 * 基于有限状态自动机的前端模板，遍历一次模板字符串
 * 
 * @author PengXing (px.pengxing@gmail.com)
 */
;(function(A) {

    /**
     * Paser 语法分析器
     * @constructor
     * @param {string} str 模板字符串
     */
    function Parser(str) {
        /**
         * 指向Parser实例
         * @type {Parser}
         */
        var me = this;
        me.str = str;
        me.length = str.length;

        /**
         * 结束符
         * @type {string}
         */
        var EOF = '';

        var START = 0; // 开始状态
        var DONE = 1; // 结束状态
        var INCODE = 2; // 在代码中
        var INTEXT = 3; // 文本状态

        /**
         * 表示一个语句的类型
         * @type {Object}
         */
        var type = {
            'CODE': 0,
            'TEXT': 1,
            'NONE': 2
        };

        //running variables
        me.offset = -1;
        // 当前所在行号
        me.lineno = 1;

        /**
         * Report error
         * @param {string} msg The error message
         */
        function error(msg) {
            throw new Error(msg + ': lineno[' + me.lineno + ']');
        };

        /**
         * Get the next code statement
         *
         * @return {null|{start:number, end:number, type:number}} The statement object, it contains the start and end offset, ant the statement type.
         */
        me.getNextStmt = function() {
            var status = START;
            var start = me.offset + 1;
            var end;
            var category;

            while(status != DONE) {
                var c = me.str.charAt(++me.offset);

                if(c === "\n"){
                    me.str = ''
                        + me.str.substring(0, me.offset)
                        + ' '
                        + me.str.substring(me.offset + 1);
                    c = ' ';
                    me.lineno++;
                }
                switch(status){
                    case START:
                        if(c === '<') {
                            var _c = me.str.charAt(++me.offset);
                            if(_c === '%'){
                                status = INCODE;
                            } else {
                                me.offset--;
                                status = INTEXT;
                            }
                        } else if(c === EOF) {
                            status = DONE;
                            category = type.NONE;
                        } else {
                            status = INTEXT;
                        }
                        break;
                    case INCODE:
                        if(c === '%') {
                            var _c = me.str.charAt(++me.offset);
                            if(_c === '>'){
                                status = DONE;
                                category = type.CODE;
                            } else {
                                me.offset--;
                            }
                        } else if(c === EOF){
                            error('Error. There is a single syntax seperator.');
                        }
                        break;
                    case INTEXT:
                        if(c === '<'){
                            var _c = me.str.charAt(++me.offset);
                            if(_c === '%'){
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

            if(category === type.NONE){
                return null;
            } else {
                return ({
                    start : start,
                    end : me.offset + 1,
                    type : category
                });
            }
        };

        /**
         * 处理模板，生成拼接好的字符串
         * @return {string}
         */
        me.parse = function() {
            var code = '';
            var lastType = 1;

            /**
             * Combine two consecutive output statement to one line code.
             * @param {string} str
             * @param {number} type
             */
            function concatCode(str, type) {
                switch(type){
                    case 0 :
                        if(lastType) {
                            code += '__s+=' + str;
                        } else {
                            code += '+' + str;
                        }
                        lastType = 0;
                        break;
                    default:
                        if(!lastType) {
                            code += ';'
                        }
                        code += str;
                        lastType = 1;
                }
            };

            var stmt;
            while(stmt = me.getNextStmt()) {
                switch(stmt.type) {
                    case type.CODE:
                        var flag = me.str.charAt(stmt.start + 2);
                        if(flag === '=') {
                            concatCode(
                                me.str.substring(stmt.start + 3, stmt.end - 2),
                                0
                            );
                        } else if(flag == ':'){
                            flag = me.str.charAt(stmt.start + 3);
                            switch(flag){
                                case 'u':
                                    if(me.str.charAt(stmt.start + 4) == '='){
                                        concatCode(
                                            'encodeURIComponent('
                                                + me.str.substring(
                                                    stmt.start + 5, stmt.end - 2
                                                )
                                                + ')',
                                            0
                                        );
                                    } else 
                                        error('Errors. Expect char: \'=\'');
                                    break;
                                case 'h':
                                    if(me.str.charAt(stmt.start + 4) == '='){
                                        concatCode(
                                            'encodeHTML('
                                                + me.str.substring(
                                                    stmt.start + 5, stmt.end - 2
                                                )
                                                + ')',
                                            0
                                        );
                                    } else 
                                        error('Errors. Expect char: \'=\'');
                                    break;
                            }
                        } else if(flag === '#'){
                            break;
                        } else {
                            concatCode(
                                me.str.substring(stmt.start + 2, stmt.end - 2),
                                1
                            );
                        }
                        break;
                    case type.TEXT:
                        concatCode(
                            '"'
                                + me.str.substring(stmt.start, stmt.end)
                                    .replace(/"/g, "\\\"").replace(/'/g, "\\\'")
                                + '"',
                            0
                        );
                        break;
                    default:
                        error('Errors. Unsupported statement');
                }
            }

            return code;
        };

    }

    /**
     * 模板内置函数
     * @type {{encodeHTML:Function, print: Function}}
     */
    var innerFns = {
        'encodeHTML': function(str) {
            return String(str)
                .replace(/&/g,"&amp;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;")
                .replace(/"/g,"&quot;")
                .replace(/\'/g,"&#39;")
                .replace(/\\\\/g,"\\\\")
                .replace(/\\\//g,"\\\/")
        },
        'print': function(s) {__s+=s;}
    };

    /**
     * 模板主函数，解析模板并且根据数据渲染出string或者返回模板函数
     * @param {!string} template The template string, can't be empty
     * @param {Object=} opt_data
     * @param {{fns:Object.<string, Function>}=} opt 可选项，目前只接受fns函数
     *
     * @return {string|Function} 如果opt_data不为空，则返回渲染之后的string，反之，返回编译好的Function
     */
    var tpl = function(template, opt_data, opt) {
        if(!opt){
            opt = {
                'fns': {}
            };
        };

        var key;
        var value;
        for(key in innerFns) {
            value = innerFns[key];
            opt['fns'][key] = opt['fns'][key] || value.toString();
        }

        var inFns = '';
        for(key in opt['fns']) {
            value = opt['fns'][key];
            value = 'var ' 
                + key
                + '='
                + value.replace(/[\r\t\n]/g, ' ') 
                + ';';
            inFns += value;
        }

        var parser = new Parser(template);
        var str = parser.parse();
        var fn = new Function (
            'obj',
            'var __s="";' + inFns + 'with(obj){' + str + '}return __s'
        );
        return opt_data ? fn(opt_data) : fn;
    };

    A.tpl = tpl;
})(window);
