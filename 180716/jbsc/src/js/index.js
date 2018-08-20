;(function(){

    let sdkObj = {};

    const doc = document,

        curlink = encodeURIComponent(location.href),
        
        getQueryString = function(name){//获取网址参数
            var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$) ");
            var r = window.location.search.substr(1).match(reg);
            if(r!=null)return  unescape(r[2]); return null;
            
        },
        
        ajaxGet = function(){

                const toString = Object.prototype.toString;

                const IO = function(){
        
                    let IO = {};
                
                    const toString = Object.prototype.toString;
                
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
                                // //stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/873856#873856
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

                    return IO;
                
                }();

                return function(path = '',data ={},callback=function(){}){

                       

                        if( toString.call( data ) === '[object Function]'){

                            callback = data;

                            data = {};

                        }

                        // data.token = sdkObj.userToken;

                        if(path.indexOf('.2144.cn') == -1){
                            
                                path = 'http://test.mapp.2144.cn/mall/mall-api/' + path;
                        }


                        IO.jsonp(path,data,callback);
                };
                
        }(),

        popWrap = function(){//弹窗

            let maskEle = function(){

                    const divEle = doc.createElement('div');
                   
                    divEle.className = 'pop-wrap';

                    return doc.body.appendChild(divEle);

                }(),

                msg = str=>{//弹窗

                    maskEle.innerHTML = `<div class="pop-box">
                        <div class="pop-close"></div>
                        <p class="tips-txt">${str}</p>
                    </div>`;

                    maskEle.classList.add('flex');

                    maskEle.classList.add('_fadeIn');

                },

                show = obj=>{

                    let str = '';

                    if(obj.gift_type == 1){

                        str = `<div class="pop-box">
                                    <div class="pop-close"></div>
                                    <div class="tips-content-title">恭喜成功抽中</div>
                                    <div class="Winning-prizes">
                                            <img src="${obj.gift_image}" alt="${obj.gift_name}">
                                            <p>${obj.gift_name}</p>
                                    </div>		
                                    <span class="go-address modify">修改地址</span>
                                </div>`;

                    }


                    if(obj.gift_type == 2){

                        str = `<div class="pop-box">
                                    <div class="pop-close"></div>
                                    <div class="tips-content-title">恭喜成功抽中</div>
                                    <input value="${obj.gift_code}" class="ma-input" readonly>
                                    <div class="ma-name">${obj.gift_name}</div>
                                    <span class="ma-cpoy_bth">复制</span>
                                    <p class="ma-tips">点击复制按钮-进入游戏—点击“奖励”—“兑换码”—输入游戏礼包码</p>
                                </div>`;

                    }

                    if(obj.gift_type == 3){

                        str = `<div class="red-box">
                                    <div class="pop-close"></div>
                                    <div class="tips-content-title">恭喜成功抽中</div>
                                    <div class="ma-name">微信红包码</div>
                                    <input value="${obj.gift_code}" class="ma-input" readonly>
                                    <span class="ma-cpoy_bth">复制</span>
                                    <p class="ma-tips">关注微信服务号“2144手游”<br>（微信号shouyou_2144)<br>输入兑换码即可领取微信红包 </p>
                                </div>`;

                    }


                    if(obj.gift_type == 4){

                        str = `<div class="pop-box">
                                    <div class="pop-close"></div>
                                    <div class="tips-content-title">恭喜成功抽中</div>
                                    <div class="Winning-prizes">
                                            <img src="//static.2144.cn/mapp/activity/temp/b/5.png" alt="${obj.gift_name}">
                                            <p>${obj.gift_name}</p>
                                    </div>		
                                </div>`;

                    }

                    if(obj.exchange ){

                        str = `<div class="pop-box">
                                    <div class="pop-close"></div>
                                    <div class="tips-content-title">我的兑换记录<span class="go-address">收货地址</span></div>
                                    <div class="gift-wrap">
                                            <table class="gift-header">
                                                <tr>
                                                    <th>奖品名称</th>
                                                    <th>兑换时间</th>
                                                    <th>发放详情</th>
                                                </tr>
                                            </table>
                                            <table>
                                                ${                                     
                                                    obj.data.map(item=>`<tr>
                                                        <td>${item.gift_name}</td>
                                                        <td>${item.time}</td>
                                                        <td>${
                                                            item.gift_type == 1 ? `请于7日内填写地址` : `<input value="${item.gift_code}" readonly>`
                                                            
                                                        }</td>
                                                    </tr>`).join('')
                                                }
                                            </table>
                                    </div>
                                    <div class="gift-last-time">请在兑换时间起7日内正确填写收货地址</div>
                                </div>`;

                    }

                    if(obj.address ){

                        str = `<div class="pop-box">
                                    <div class="pop-close"></div>
                                    <div class="tips-content-title">收件地址</div>
                                    <ul class="form-items">
                                        <li><label>收件人</label><input id="addressName" value="${obj['name']}"></li>
                                        <li><label>联系电话</label><input id="addressPhone" type="tel" value="${obj.phone}"></li>
                                        <li><label>联系地址</label><textarea id="addressTxt">${obj.address}</textarea></li>
                                        <li><label></label><span  class="submit-address">确认</span></li>
                                    </ul>
                                </div>`;

                    }

                    maskEle.innerHTML = str;

                    maskEle.classList.add('flex');

                    maskEle.classList.add('_fadeIn');
                    
                },

                popHidden = ()=>{

                    maskEle.classList.remove('_fadeIn');

                    maskEle.classList.add('_fadeOut');

                    setTimeout(function(){

                        maskEle.classList.remove('flex');

                        maskEle.classList.remove('_fadeOut');
                        
                    },500);

                },
                
                clickEvent = event=> {

                        const target = event.target;

                        if(target.className == 'pop-close'){

                            popHidden();

                            return;
                        }

                };


            maskEle.addEventListener('click',clickEvent,false);

            return {
                maskEle,
                show,
                msg,
                popHidden
            };


        }(),


        detail = function(){
            const wrap = doc.querySelector('.detail-main');
            const btnlink = doc.querySelector('.db-ljdh');
            let goods_id = getQueryString('goods_id');
            goods_id = 1;

            const dataLoad = function stateFun(){
                
                    if(stateFun.state) return;

                    stateFun.state = true;

                    ajaxGet('get-goods',{goods_id},data=>{

                        stateFun.state = false;

                        if(data.code != 200){
                            popWrap.msg(data.message);
                            return;
                        }

                        const {
                            id,
                            type,
                            category_name,
                            name,
                            image,
                            current_price,
                            original_price,
                            stock,
                            goods_introduce
                        } = data.data;

                        let strlink = '//test.2144.cn:8080/order-sw.html';//实物


                        if(`${type}` == '2'){//虚拟
                            strlink = '//test.2144.cn:8080/order-xn.html';
                        }



                        wrap.innerHTML = `<div class="detail-pic-wrap"><img src="${image}" alt=""></div>
                        <div class="detail-base-wrap"><h2 class="db-tit">${name}</h2><div class="db-cont"><em>${current_price}<i>金币</i></em><ins>${original_price}金币</ins><span>库存：${stock}</span></div></div>
                        <div class="detail-info-wrap"><h2 class="di-tit">商品详情</h2><div class="di-cont">${goods_introduce}</div></div>
                        <div class="detail-btn-wrap">
                            <a class="db-ljdh" href="`
                            +strlink+
                            `?id=${id}&category_name=${category_name}">立即兑换</a>
                        </div>
                        `;

                        // if(`${type}` == 1){//实物
                        //     console.log(btnlink,1);
                        //     btnlink.href = '//test.2144.cn:8080/order-sw.html?id=1';
                        //     // btnlink.href = '//test.2144.cn:8080/order-sw.html?id='+`${id}`+'&category_name='+`${category_name}`;
                        // }else{
                        //     console.log(2);
                        //     btnlink.href = '//test.2144.cn:8080/order-xn.html?id='+`${id}`+'&category_name='+`${category_name}`;
                        // }

        
                    });

                };

            wrap.addEventListener('click',event=>{

                const target = event.target;

                // if(target.className=='task-yes'){

                //     execuTask( target );

                //     return;
                // }


                // if(target.className=='exchange-btn'){

                //     exchangeLog( target );

                //     return;
                // }

            });


            return{
                dataLoad
            };

        }(),



        // headerTask = function(){//头部任务

        //     const wrap = doc.querySelector('.header');
                    
        //     const dataLoad = function stateFun(){

        //                 if(stateFun.state) return;

        //                 stateFun.state = true;

        //                 ajaxGet('task',data=>{

        //                     stateFun.state = false;

        //                     if(data.code != 200){
        //                         popWrap.msg(data.message);
        //                         return;
        //                     }

        //                     const {
        //                         task_title,
        //                         task_status,
        //                         my_coin,
        //                         task_id
        //                     } = data.data;

        //                     const stateClass = ['no','yes','ok'];

        //                     wrap.innerHTML = `<div class="act-title">${task_title}</div>
        //                     <span class="task-${stateClass[task_status]}" data-type="${task_id}"></span>
        //                     <span class="my-gold-coin">
        //                         我的金币<em>${my_coin}</em>
        //                     </span>
        //                     <span class="exchange-btn">我的兑换记录</span>`;
            
        //                 });
        //         },

        //         execuTask = target =>{

        //             if(target.state) return;

        //             target.state = true;

        //             ajaxGet('finish-task',{task_id:target.dataset.type},data=>{

        //                 target.state = false;

        //                 popWrap.msg(data.message);

        //                 if(data.code != 200) return;

        //                 dataLoad();
                        
        
        //             });

        //         },
        //         exchangeLog = target =>{

        //             if(target.state) return;

        //             target.state = true;

        //             ajaxGet('exchange-log',data=>{

        //                 target.state = false;

        //                 if(data.code != 200){
        //                     popWrap.msg(data.message);
        //                     return;
        //                 }

        //                 popWrap.show({
        //                     exchange : true,
        //                     data : data.data
        //                 });
                        
        
        //             });

        //         };
            
        //     wrap.addEventListener('click',event=>{

        //         const target = event.target;

        //         if(target.className=='task-yes'){

        //             execuTask( target );

        //             return;
        //         }


        //         if(target.className=='exchange-btn'){

        //             exchangeLog( target );

        //             return;
        //         }

        //     });


        //     return{
        //         dataLoad
        //     };

        // }(),

        lazyLoad = function() {//图片延迟加载
            const setTimeoutImg = ()=>{
                        let map_element = {},
                            element_obj = [],
                            download_count = 0,
                            last_offset = -1,
                            doc = document,
                            doc_body = doc.body,
                            doc_element = doc.documentElement,
                            lazy_load_tag = "img",
                            imagesrcname = 'a',
                            thissrolltop = 400;

                        
                        function getAbsoluteTop(element) {

                            if (arguments.length != 1 || element == null){ 

                                return null;

                            }


                            let offsetTop = element.offsetTop,

                                current = element.offsetParent;

                            while(current !== null){

                                offsetTop += current.offsetTop;

                                current = current.offsetParent;

                            }
                            return offsetTop; 
                        }
                        
                        function initElementMap(){

                                const images = document.querySelectorAll('img[data-src]');

                                Array.prototype.slice.call(images).forEach((target,index)=>{

                                    const t_index = getAbsoluteTop(target);

                                    if (map_element[t_index]){

                                        map_element[t_index].push( index );

                                    }else{

                                        map_element[t_index] = [index]; 

                                        download_count++;

                                    } 

                                    element_obj.push( target );
                                
                                });

                        }

                        function initDownloadListen(){

                            if (!download_count) return;

                            let getscrolltop = doc_body.scrollTop || doc.documentElement.scrollTop;

                            const visio_offset = getscrolltop + doc_element.clientHeight; 

                            if (last_offset == visio_offset){
                                setTimeout(initDownloadListen,200);
                                return; 
                            }

                            last_offset = visio_offset;

                            const visio_height = doc_element.clientHeight + thissrolltop,

                                    img_show_height = visio_height + getscrolltop; 
                        
                            let j = 0;

                            for (let key in map_element) {

                                    if (img_show_height > key){

                                        let t_o = map_element[key],

                                            img_vl = t_o.length; 

                                        for (let l = 0; l < img_vl; l++) { 
                                        
                                            element_obj[t_o[l]].src = element_obj[t_o[l]].dataset.src;

                                            element_obj[t_o[l]].classList.add('fade-in');

                                            element_obj[t_o[l]].removeAttribute('data-src');

                                            j++; 
                                        }

                                        delete map_element[key];

                                        download_count--;

                                    }
                            }
                            
                            setTimeout(initDownloadListen, 200); 
                        }

                        
                        initElementMap(); 

                        initDownloadListen(); 
                    
                },
                observerImg = ()=>{
                        //获取所有标记为懒惰加载的图像。
                        let images = document.querySelectorAll('img[data-src]'),
                            config = {//如果图像在y轴内达到50px，则开始下载。
                                rootMargin: '50px 0px',
                                threshold: 0.01
                            },
                            imageCount = images.length,
                            observer = new IntersectionObserver(onIntersection, config);

                        Array.prototype.slice.call(images).forEach(target=>{observer.observe(target)});
                    
                        function onIntersection(entries) {
                            //终止对所有目标的观察
                            if (imageCount === 0) {
                                observer.disconnect();
                            }

                            entries.forEach(entry=>{
                                //1在视口内,0为不在视口内
                                if (entry.intersectionRatio > 0) {
                                    imageCount--;
                                    //停止观察并载入图像
                                    observer.unobserve(entry.target);//停止监听特定目标元素。
                                    preloadImage(entry.target);
                                }

                            });

                        }

            
                        function fetchImage(url) {
                            return new Promise((resolve, reject)=>{
                                let image = new Image();
                                image.src = url;
                                image.onload = resolve;
                                image.onerror = reject;
                            });
                        }

            
                        function preloadImage(image) {
                            const src = image.dataset.src;
                            if(!src) return;
                            return fetchImage(src).then( ()=>{ applyImage(image, src) });
                        }

                        function applyImage(img, src) {
                            img.src = src;
                            img.classList.add('fade-in');
                        }
                };

            if('IntersectionObserver' in window ){
                observerImg();
                return;
            }
            setTimeoutImg();
        },

        // addressWrap = function(){

        //         let  cacheData = '',
                    
        //                 getAddress = target=>{
        //                     if(target.state) return;
        //                     target.state = true;
        //                     ajaxGet('get-address',data=>{
        //                         target.state = false;
        //                         if(data.code != 200){
        //                             popWrap.msg(data.message);
        //                             return;
        //                         }

        //                         const {name,phone,address} = data.data;

        //                         cacheData = `${name}${phone}${address}`;

        //                         // data.data.address = true;

        //                         popWrap.show(data.data);
                
        //                     });

        //                 },

        //                 modifyAddress = target=>{

        //                     const wrap = target.parentNode.parentNode;

        //                     const name = wrap.querySelector('#addressName').value;

        //                     const phone = wrap.querySelector('#addressPhone').value;

        //                     const address = wrap.querySelector('#addressTxt').value;

        //                     if(cacheData == `${name}${phone}${address}`){
        //                         popWrap.popHidden();
        //                         return;
        //                     }

        //                     if(target.state) return;

        //                     target.state = true;

        //                     ajaxGet('modify-address',{name,phone,address},data=>{
        //                         target.state = false;
        //                         if(data.code != 200){
        //                             popWrap.msg(data.message);
        //                             return;
        //                         }

        //                         popWrap.popHidden();
                
        //                     });
        //                 },
        //                 clickEvent = event=> {
        
        //                         const target = event.target;

        //                         if( target.classList.contains('go-address') ){

        //                             getAddress( target );

        //                             return;
        //                         }

        //                         if( target.className == 'submit-address' ){

        //                             modifyAddress( target );

        //                             return;
        //                         }

        //                 };

        //         popWrap.maskEle.addEventListener('click',clickEvent,false);
        // }(),

        // openBox = function(){//开启宝箱
        //         const wrap = doc.querySelector('.task-textarea');
        //         const dataLoad = function stateFun(){
        //                     if(stateFun.state) return;
        //                     stateFun.state = true;
        //                     ajaxGet('box',data=>{
        //                         stateFun.state = false;
        //                         if(data.code != 200){
        //                             popWrap.msg(data.message);
        //                             return;
        //                         }

        //                         const items = data.data;
        //                         Array.prototype.slice.call(wrap.querySelectorAll('.subwrap')).forEach((item,index)=>{

        //                             item.innerHTML = `<div class="sub-title"><span class="open-btn" data-type="${items[index]['type']}">开启宝箱</span><span class="gold-tips">消耗金币${items[index].need_gold}枚</span></div>
        //                             <ul class="items">
        //                                 ${
        //                                     items[index].gift.map(item=>`<li>
        //                                     <img data-src="${item.gift_image}" alt="${item.gift_name}">
        //                                     <h4>${item.gift_name}</h4>
        //                                     ${item.gift_remain?'':'<p>已抢光</p>'}
        //                                 </li>`).join('')
        //                                 }
        //                             </ul>
        //                             <div class="items-tips">（随机获得以上奖品）</div>`;

        //                         });

        //                         lazyLoad();
                
        //                     });
        //                 },

        //                 getGift = target=>{

        //                         if(target.state) return;

        //                         target.state = true;

        //                         ajaxGet('open-box',{type:target.dataset.type},data=>{

        //                             target.state = false;

        //                             if(data.code != 200){
        //                                 popWrap.msg(data.message);
        //                                 return;
        //                             }

        //                             popWrap.show(data.data);

        //                             headerTask.dataLoad();

        //                             dataLoad();

                    
        //                         });
        //                 },

        //                 copyToClipboard = target=>{
        //                     var win = window,
        //                           doc = document,
        //                           ele = target.parentNode.querySelector('input'),
        //                          txt = ele.value;
        //                     if(win.clipboardData){//IE浏览器
        //                         win.clipboardData.clearData();
        //                         win.clipboardData.setData("Text", txt);
        //                         alert("复制成功！");
        //                         return;
        //                     }
        //                     if(ele.select && doc.execCommand){
        //                        ele.select();//首先要选中要复制的内容
        //                         ele.setSelectionRange(0,ele.value.length);
        //                         //doc.execCommand('Copy')返回值如果是 false 则表示操作不被支持或未被启用
        //                         if( doc.execCommand('Copy') ){
        //                             alert("复制成功！");
        //                         }else{
        //                             alert("复制操作不被支持，请双击内容复制！");
        //                         }
        //                     }
        //                 },

        //                 clickEvent = event=> {
        
        //                         const target = event.target;
        
        //                         if(target.className == 'ma-cpoy_bth'){
        
        //                             copyToClipboard( target );
        
        //                             return;
        //                         }
        
        //                 };
        
        
        //         popWrap.maskEle.addEventListener('click',clickEvent,false);
        //         wrap.addEventListener('click',event=>{

        //             const target = event.target;

        //             if(target.className == 'open-btn'){

        //                 getGift(target);

        //                 return;

        //             }

        //         });


        //         return{
        //             dataLoad
        //         }
        // }(),

        inIt = ()=>{
            
            detail.dataLoad();

            // headerTask.dataLoad();

            // openBox.dataLoad();

        };

    detail.dataLoad();

    

    //手游助手客户端相关交互
	//IOS 初始化
	window.syzsIos = obj=>{
		sdkObj = obj;
		inIt();
	};

	//安卓 初始化
	window.syzsFromjs = obj=>{

        obj = JSON.parse(obj);

        if(!obj.userToken){

            obj.userToken = obj.usertoken;

        }

        sdkObj = obj;

        inIt();
    };


}());