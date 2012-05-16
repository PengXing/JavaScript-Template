var app = {};

;(function(A){

	function Parser(str){
		var me = this;
		me.str = str;
		me.length = str.length;

		var EOF = -1;

		var START = 0,
			DONE = 1,
			INCODE = 2,
			INCOMMENT = 3,
			INTEXT = 4;

		var type = {};
		type.CODE = 0;
		type.TEXT = 1;
		type.NONE = 2;

		//running variables
		me.offset = -1;

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

		me.getNextStmt = function(){
			var status = START,
				start = me.offset + 1,
				end,
				category;
			while(status != DONE){
				var c = me.getNextChar();

				if(c == "\n"){
					me.str = me.str.substring(0, me.offset) + ' ' + me.str.substring(me.offset + 1);
					c = ' ';
				}
				switch(status){
					case START:
						if(c == '<'){
							var _c = me.getNextChar();
							if(_c == '%'){
								status = INCODE;
							} else {
								me.ungetNextChar();
								status = INTEXT
							}
						} else if(c == EOF){
							status = DONE;
							category = type.NONE;
						} else {
							status = INTEXT
						}
						break;
					case INCODE:
						if(c == '%'){
							var _c = me.getNextChar();
							if(_c == '>'){
								status = DONE;
								category = type.CODE;
							} else {
								me.ungetNextChar();
							}
						} else if(c == EOF){
							throw new Error('Errors exist in template');
						}
						break;
					case INTEXT:
						if(c == '<'){
							var _c = me.getNextChar();
							if(_c == '%'){
								me.ungetNextChar();
								me.ungetNextChar();
								status = DONE;
								category = type.TEXT;
							}
						} else if(c == EOF){
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
						if(me.str[stmt.start + 2] == '='){
							code += 'print(' + me.str.substring(stmt.start + 3, stmt.end - 2) + ');';
						} else {
							code += me.str.substring(stmt.start + 2, stmt.end - 2);
						}
						break;
					case type.TEXT:
						code += '__p.push("' + me.str.substring(stmt.start, stmt.end) + '");';
						break;
					default:
						throw new Error("Errors exist in template");
				}
			}

			return code;
		};

	}

	var tpl = function(template, data){
		var parser = new Parser(template);
		var str = parser.parse();
		var fn = new Function('obj', 'var __p=[],print=function(){__p.push.apply(__p,arguments)};'
				+ 'with(obj){' + str + '}return __p.join("")');
		return data ? fn(data) : fn;
	};

	A.tpl = tpl;
})(app);

