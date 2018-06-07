~function(window, undefined) {
	var IO = {}
	var toString = Object.prototype.toString

	// Iterator
	function forEach(obj, iterator, context) {
		if (!obj) return 
		if ( obj.length && obj.length === +obj.length ) {
			for (var i=0; i<obj.length; i++) {
				if (iterator.call(context, obj[i], i, obj) === true) return
			}
		} else {
			for (var k in obj) {
				if (iterator.call(context, obj[k], k, obj) === true) return
			}
		}
	}

	// IO.isArray, IO.isBoolean, ...
	forEach(['Array', 'Boolean', 'Function', 'Object', 'String', 'Number'], function(name) {
		IO['is' + name] = function(obj) {
			return toString.call(obj) === '[object ' + name + ']'
		}
	})

	// Object to queryString
	function serialize(obj) {
		var a = []
		forEach(obj, function(val, key) {
			if ( IO.isArray(val) ) {
				forEach(val, function(v, i) {
					a.push( key + '=' + encodeURIComponent(v) )
				})
			} else {
				a.push(key + '=' + encodeURIComponent(val))
			}
		})
		return a.join('&')
	}

	// Parse json string
	function parseJSON(str) {
		try {
			return JSON.parse(str)
		} catch(e) {
			try {
				return (new Function('return ' + str))()
			} catch(e) {
			}
		}
	}
		
	// Empty function
	function noop() {}


	/**
	 *  Ajax API
	 *     IO.ajax, IO.get, IO.post, IO.text, IO.json, IO.xml
	 *  
	 */
	~function(IO) {
		
		var createXHR = window.XMLHttpRequest ?
			function() {
				return new XMLHttpRequest()
			} :
			function() {
				return new window.ActiveXObject('Microsoft.XMLHTTP')
			}
			
		function ajax(url, options) {
			if ( IO.isObject(url) ) {
				options = url
				url = options.url
			}
			var xhr, isTimeout, timer, options = options || {}
			var async      = options.async !== false,
				method     = options.method  || 'GET',
				type       = options.type    || 'text',
				encode     = options.encode  || 'UTF-8',
				timeout    = options.timeout || 0,
				credential = options.credential,
				data       = options.data,
				scope      = options.scope,
				success    = options.success || noop,
				failure    = options.failure || noop
			
			// 大小写都行，但大写是匹配HTTP协议习惯
			method  = method.toUpperCase()
			
			// 对象转换成字符串键值对
			if ( IO.isObject(data) ) {
				data = serialize(data)
			}
			if (method === 'GET' && data) {
				url += (url.indexOf('?') === -1 ? '?' : '&') + data
			}
			
			xhr = createXHR()
			if (!xhr) {
				return
			}
			
			isTimeout = false
			if (async && timeout>0) {
				timer = setTimeout(function() {
					// 先给isTimeout赋值，不能先调用abort
					isTimeout = true
					xhr.abort()
				}, timeout)
			}
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					if (isTimeout) {
						failure(xhr, 'request timeout')
					} else {
						onStateChange(xhr, type, success, failure, scope)
						clearTimeout(timer)
					}
				}
			}
			xhr.open(method, url, async)
			if (credential) {
				xhr.withCredentials = true
			}
			if (method == 'POST') {
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded;charset=' + encode)
			}
			// if (method == 'POST') {
			// 	xhr.setRequestHeader('Content-type', 'application/json;charset=utf-8')
			// }
			xhr.send(data)
			return xhr
		}
		
		function onStateChange(xhr, type, success, failure, scope) {
			var s = xhr.status, result
			if (s>= 200 && s < 300) {
				switch (type) {
					case 'text':
						result = xhr.responseText
						break
					case 'json':
						result = parseJSON(xhr.responseText)
						break
					case 'xml':
						result = xhr.responseXML
						break
				}
				// text, 返回空字符时执行success
				// json, 返回空对象{}时执行suceess，但解析json失败，函数没有返回值时默认返回undefined
				result !== undefined && success.call(scope, result, s, xhr)
				
			} else {
				failure(xhr, xhr.status)
			}
			xhr = null
		}
		
		// exports to IO
		var api = {
			method: ['get', 'post'],
			type: ['text','json','xml'],
			async: ['sync', 'async']
		}
		
		// Low-level Interface: IO.ajax
		IO.ajax = ajax
		
		// Shorthand Methods: IO.get, IO.post, IO.text, IO.json, IO.xml
		forEach(api, function(val, key) {
			forEach(val, function(item, index) {
				IO[item] = function(key, item) {
					return function(url, opt, success) {
						if ( IO.isObject(url) ) {
							opt = url
						}
						if ( IO.isFunction(opt) ) {
							opt = {success: opt}
						}
						if ( IO.isFunction(success) ) {
							opt = {data: opt}
							opt.success = success
						}
						if (key === 'async') {
							item = item==='async' ? true : false
						}
						opt = opt || {}
						opt[key] = item
						return ajax(url, opt)
					}
				}(key, item)
			})
		})

	}(IO)

	/**
	 *  JSONP API
	 *  IO.jsonp
	 *  
	 */
	~function(IO) {
		
		var ie678 = !-[1,]
		var win = window
		var opera = win.opera
		var doc = win.document
		var head = doc.head || doc.getElementsByTagName('head')[0]
		var timeout = 3000 
		var done = false
		
		// Thanks to Kevin Hakanson
		// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/873856#873856
		function generateRandomName() {
			var uuid = ''
			var s = []
			var i = 0
			var hexDigits = '0123456789ABCDEF'
			for (i = 0; i < 32; i++) {
				s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
			}
			// bits 12-15 of the time_hi_and_version field to 0010
			s[12] = '4'
			// bits 6-7 of the clock_seq_hi_and_reserved to 01  
			s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1)
			uuid = 'jsonp_' + s.join('')
			return uuid
		}
		
		function jsonp(url, options) {
			if ( IO.isObject(url) ) {
				options = url;
				url = options.url;
			}
			var options = options || {}
			var me      = this
			var url     = url.indexOf('?') === -1 ? (url + '?') : (url + '&')
			var data    = options.data
			var charset = options.charset
			var success = options.success || noop
			var failure = options.failure || noop
			var scope   = options.scope || win
			var timestamp = options.timestamp
			var jsonpName = options.jsonpName || 'callback'
			var callbackName = options.jsonpCallback || generateRandomName()
			
			if ( IO.isObject(data) ) {
				data = serialize(data)
			}
			var script = doc.createElement('script')
			
			function callback(isSucc) {
				if (isSucc) {
					done = true
				} else {
					failure.call(scope)
				}
				// Handle memory leak in IE
				script.onload = script.onerror = script.onreadystatechange = null
				if ( head && script.parentNode ) {
					head.removeChild(script)
					script = null
					win[callbackName] = undefined
				}
			}
			function fixOnerror() {
				setTimeout(function() {
					if (!done) {
						callback()
					}
				}, timeout)
			}
			if (ie678) {
				script.onreadystatechange = function() {
					var readyState = this.readyState
					if (!done && (readyState == 'loaded' || readyState == 'complete')) {
						callback(true)
					}
				};
				
			} else {
				script.onload = function() {
					callback(true)
				}
				script.onerror = function() {
					callback()
				}
				if (opera) {
					fixOnerror()
				}
			}
			
			url += jsonpName + '=' + callbackName
			
			if (charset) {
				script.charset = charset
			}
			if (data) {
				url += '&' + data
			}
			if (timestamp) {
				url += '&ts='
				url += (new Date).getTime()
			}
			
			win[callbackName] = function(json) {
				success.call(scope, json)
			};
			
			script.src = url
			head.insertBefore(script, head.firstChild)
		}
		
		// exports to IO
		IO.jsonp = function(url, opt, success) {
			
			if ( IO.isObject(url) ) {
				opt = url
			}
			if ( IO.isFunction(opt) ) {
				opt = {success: opt}
			}
			if ( IO.isFunction(success) ) {
				opt = {data: opt}
				opt.success = success
			}
			
			return jsonp(url, opt)
		}

	}(IO)


	// Expose IO to the global object or as AMD module
	if (typeof define === 'function' && define.amd) {
		define('IO', [], function() { return IO } )
	} else {
		window.IO = IO
	}

}(window);



;(function(){

	let doc = document,
			
		hasCode = '',//有无Code
			
		hastime = 0,//有无time
			
		hasshare = false,//有无share

		notMicroMessenger = ()=>{

			const ua = window.navigator.userAgent.toLowerCase();

			return ua.match(/MicroMessenger/i) != 'micromessenger';
		},

		$ = function (selector, parent) {
			return (parent || document).querySelector(selector);
		},

		$$ = function (selector, parent) {
			return (parent || document).querySelectorAll(selector);
		},
		
		showError = msg => {//报错弹窗



			let tips = $('.errortips'),

				countdown = 2;

			if (!tips) {

				tips = doc.createElement('div');

				tips.className = 'errortips';

			}

			tips.innerHTML = msg;

			doc.body.appendChild(tips);

			(function settime() {
				if (countdown > 0) {
					countdown--;

				} else {
					tips.parentNode.removeChild(tips);
					clearTimeout(settime);
					return;
				}

				setTimeout(settime, 1000);

			}());

		},

		ajaxGet = function () {

			const toString = Object.prototype.toString;

			return (path = '', data = {}, callback = function () {}) => {


				if (toString.call(data) === '[object Function]') {

					callback = data;

					data = {};

				}

				//data = Object.assign({game:'lmhx'},data);

				if (path.indexOf('.2144.cn') == -1) {

					path = '//m.hd.2144.cn/act/card/' + path;
				}


				IO.json(path, data, callback);
			};

		}(),

		getCode =  ()=>{//刮奖

			ajaxGet('getCode', { game_slug }, data=> {

				const card = $('#card');

				const cover = $('#cover');				

				if (data.status == 200) {

					cover.style.display = 'none';

					if (!data.code) {
						showError(data.msg);
						hasCode = '';
						// $('#card').innerHTML = '';
						if (hastime < 1) {//没有次数

							card.innerHTML = '<span>再接再厉(ง •_•)ง</span><a class="btn">分享获得机会</a>';
						} else {

							card.innerHTML = '<span>再接再厉(ง •_•)ง</span><a class="btn" href="javascript:void(0)" onclick="location.reload()">再刮一次</a>';
						}


					} else {
						showError('恭喜您获得激活码' + data.code);
						hasCode = data.code;
						card.innerHTML = '恭喜获得激活码<input value="' + data.code + '" readonly="readonly">';
					}

					hastime--;
					$('.l-number em').innerHTML = hastime;

					return;

				}

				if (!data.code) {
					showError(data.msg);
					return;
				}

				if (hastime < 1) {//没有次数
					cover.style.display = 'none';
					card.innerHTML = '<span>再接再厉(ง •_•)ง</span><a class="btn">分享获得机会</a>';
				}

				showError('不要重复刮奖哦~<br>您已有的激活码啦！');


			});

		},

		ScrapingArea = function () {//渲染刮奖区

			const maskImg = 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABQAAD/4QMvaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzEzOCA3OS4xNTk4MjQsIDIwMTYvMDkvMTQtMDE6MDk6MDEgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE3IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpDRUJBNkE0QjRBQzExMUU4QUQxMEJFNUVFOTgyQTEwMiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpDRUJBNkE0QzRBQzExMUU4QUQxMEJFNUVFOTgyQTEwMiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkNFQkE2QTQ5NEFDMTExRThBRDEwQkU1RUU5ODJBMTAyIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkNFQkE2QTRBNEFDMTExRThBRDEwQkU1RUU5ODJBMTAyIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+/+4AJkFkb2JlAGTAAAAAAQMAFQQDBgoNAAAMqgAAEi4AABqb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';

			LuckyCard.case({
				// coverImg:'mask.jpg',
				coverImg: maskImg,
				ratio: .2,
				callback: function () {

					this.clearCover();

					const card = $('#card');

					const cover = $('#cover');

					if (notMicroMessenger) {
						showError('啊哦！请用微信打开本页面刮奖哟~');
						card.innerHTML = '<em>出错啦！</em>请用微信打开本页面（//▽//）';
						return;
					}

					if (hasCode != '') {
						showError('不要重复刮奖哦~<br>您已有的激活码啦！');
						// $('#card').innerHTML = '<p>'+hasCode+'</p>';
						card.innerHTML = '您已获得激活码<input value="' + hasCode + '" readonly="readonly">';
						cover.style.display = 'none';
						return;
					}

					if (hastime == 0) {
						showError('啊哦！您的刮奖次数不足哟~');
						card.innerHTML = '<p>明天再来吧~</p>';
						cover.style.display = 'none';
						return;
					}

					getCode();
					// this.clearCover();
				}

			});

		}(),

		init = function () {//初始化

			ajaxGet('init', { game_slug }, data=>{

				const card = $('#card');

				const cover = $('#cover');

				if (data.status == 200) {

					if (data.code != '') {
						showError('不要重复刮奖哦~<br>您已有的激活码啦！');
						// $('#card').innerHTML = '<p>'+data.code+'</p>';
						card.innerHTML = '恭喜获得激活码<input value="' + data.code + '" readonly="readonly">';
						cover.style.display = 'none';
						return;
					}

					if (data.canUse == 0) {
						showError('啊哦！您的刮奖次数不足哟~');
						card.innerHTML = '<p>明天再来吧~（//▽//）</p>';
						cover.style.display = 'none';
						return;
					}

					hasCode = data.code;

					hastime = data.canUse - 0;

					$('.l-number em').innerHTML = data.canUse;

					if (hasshare) {
						card.innerHTML = '<span>分享成功</span><a class="btn" href="javascript:void(0)" onclick="location.reload()">再刮一次</a>';
						cover.style.display = 'none';
					}

					return;
				}

				showError(data.msg);

			});

		},

		addFun = ()=>{	//分享成功


			ajaxGet('plus', { game_slug }, data=> {


				if (data.status == 200) {

					showError('分享成功(*^▽^*)');

					hasshare = true;

					init();



					return;

				} 

				showError(data.msg);

				hasshare = false;

			});

		};


	
	if(notMicroMessenger){
		showError('啊哦！请用微信打开本页面刮奖哟~');
		return;
	}

	init();


	wx.config(wxConfig);

	wx.ready(function () {

		wx.onMenuShareTimeline({
			title: shareTitle, // 分享标题
			link: shareLink, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
			imgUrl: shareImage, // 分享图标
			success: addFun,
			cancel: function(){
				// 用户取消分享后执行的回调函数
				showError('取消分享(￣^￣)');
			}
		});
		wx.onMenuShareAppMessage({
			title: shareTitle, // 分享标题
			desc: shareDesc, // 分享描述
			link: shareLink, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
			imgUrl: shareImage, // 分享图标
			type: '', // 分享类型,music、video或link，不填默认为link
			dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
			success: addFun,
			cancel: function(){
				// 用户取消分享后执行的回调函数
				showError('取消分享(￣^￣)');
			}
		});
		wx.onMenuShareQQ({
			title: shareTitle, // 分享标题
			desc: shareDesc, // 分享描述
			link: shareLink, // 分享链接
			imgUrl: shareImage, // 分享图标
			success: addFun,
			cancel: function () {
				// 用户取消分享后执行的回调函数
				showError('取消分享(￣^￣)');
			}
		});
		wx.onMenuShareWeibo({
			title: shareTitle, // 分享标题
			desc: shareDesc, // 分享描述
			link: shareLink, // 分享链接
			imgUrl: shareImage, // 分享图标
			success: addFun,
			cancel: function () {
				// 用户取消分享后执行的回调函数
				showError('取消分享(￣^￣)');
			}
		});
		wx.onMenuShareQZone({
			title: shareTitle, // 分享标题
			desc: shareDesc, // 分享描述
			link: shareLink, // 分享链接
			imgUrl: shareImage, // 分享图标
			success: addFun,
			cancel: function () {
				// 用户取消分享后执行的回调函数
				showError('取消分享(￣^￣)');
			}
		});
	});

	wx.error(function (res) {
		showError(res.errMsg);
	});



}());
