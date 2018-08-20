;(function(){

    let sdkObj = {};

    const doc = document,

    	openGame = function(){
                const wrap = doc.querySelector('.game-link-wrap');

                const gotoGame = target=>{
                        if(target.state) return;
                        target.state = true;

                        var sid = target.getAttribute('data-StringId');

                        // console.log('String_Id='+target.getAttribute('data-StringId'));

                        if( (iPhone|iPad|iPod|iOS)/i.test(sdkObj['device_type']) ){

                        	target.state = false;

                        }else{

                        	target.state = false;
                        	window.Android.navigateToWeChat(sid);
                        }

                    };

                wrap.addEventListener('click',event=>{

                    const target = event.target;

                    if(target.className == 'gb-star'){

                        gotoGame(target);

                        return;

                    }

                });

    	},

        inIt = ()=>{

			openGame();

        };

    

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