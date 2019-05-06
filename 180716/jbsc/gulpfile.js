const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const runSequence = require('run-sequence');
const del = require('del');

const swig = require('swig-templates');
const through = require('through2');
const path = require('path');

const webpack = require('webpack');
const glob = require('glob');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const es3ifyPlugin = require('es3ify-webpack-plugin');


// 编译Sass
gulp.task('sass',()=>{
    return gulp.src('src/sass/[^_]*.scss')
        .pipe($.sass())
        .pipe($.autoprefixer())
		.pipe( $.if(process.env.production !== undefined, $.cleanCss()) )
        .pipe(gulp.dest('build/css'))
        .pipe($.connect.reload());
});


gulp.task('reloadJs',()=>{
    return gulp.src('src/**/**.ts')
		.pipe($.connect.reload());
		
});



gulp.task('js', callback => {
	const files = glob.sync('src/js/*.ts');
	const entry = {};
	files.forEach(filepath => {
		const pathObj = path.parse(filepath);
		entry[pathObj.name] = path.resolve(filepath);
	});
	const production = process.env.production !== undefined;
	const plugins = [];
	plugins.push(new es3ifyPlugin());
	if (production) {
		plugins.push(new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('production'),
		}));
		plugins.push(new UglifyJSPlugin({
			uglifyOptions: {
		
			  compress: {
				properties:false
			  }
			}
		  }));
	}
	webpack({
		mode: 'none',
		entry,
		output: {
			filename: '[name].js',
			path: __dirname + '/build/js'
		},
		resolve: {
			extensions: [".ts",".js", ".json"]
		},
		module: {
			/* 在webpack2.0版本已经将 module.loaders 改为 module.rules 为了兼容性考虑以前的声明方法任然可用，
　　　　　　同时链式loader(用!连接)只适用于module.loader，
　　　　　　同时-loader不可省略 */
			rules: [
				{ 
					test: /\.ts$/,
					use: [
						{
							loader: "ts-loader"
						}
					],
					exclude: /node_modules/
				}
			]
		},
	
		plugins
	},(error, stats) => {
		if (error) {
			console.log(error);
		} else if (stats.hasErrors()) {
			console.log(stats.toString({
				colors: true,
				reasons: true,
			}));
		}else{	// success
		}
		callback();//这个callback是为了解决gulp异步任务的核心，强烈注意
		//gulp.task('reloadJs');
		runSequence(['reloadJs']);
		
	});
});



const swigParser = function(){
	// 设置加载器
	swig.setDefaults({
		cache: false,// 禁用内存缓存
		loader: swig.loaders.fs(),
	});
	return through.obj(function(file, enc, next){

		let locals = {};
		locals.file = path.parse(file.path);
		// locals.Random = Mock.Random;
		locals.makeArray = lenth=>new Array(lenth);
		let content = file.contents.toString();
		//let pathObj = path.parse(file.path);
		let html = '';
		try{
			html = swig.render(content, {filename: file.path, locals});
		} catch(e){
			this.emit('error', new $.util.PluginError('swig-parser', e.message));
		}
		// pathObj.ext = '.html';
		// pathObj.base = pathObj.name + pathObj.ext;
		// file.path = path.format(pathObj);
		file.contents = Buffer.from(html);
		next(null, file);
	});
};


gulp.task('html',() => {
    return gulp.src('src/[^_]*.html')
        .pipe(swigParser())
        .pipe(gulp.dest('build'))
        .pipe($.connect.reload());
});

gulp.task('image',() => {
	return gulp.src('src/images/*.{jpg,png}')
		.pipe($.if(process.env.production !== undefined, $.smushit()))//压缩图片非常慢，请耐心等待
	   .pipe(gulp.dest('build/images'))
        .pipe($.connect.reload());
});

gulp.task('temp',() => {
	return gulp.src('src/temp/**/*.*')
		.pipe($.if(process.env.production !== undefined, $.smushit()))//压缩图片非常慢，请耐心等待
	  .pipe(gulp.dest('build/temp'))
        .pipe($.connect.reload());
});



gulp.task('server', () => {
	$.connect.server({
		root: 'build',
		host: '0.0.0.0',
        port: 8080,
		livereload: true
	});
});

gulp.task('watch',['server'],function() {
    gulp.watch('src/*.html', ['html']);
    gulp.watch('src/sass/*.scss', ['sass']);
    gulp.watch('src/images/*.*', ['image']);
    gulp.watch('src/temp/*.*', ['temp']);
    //gulp.watch('src/js/*.js', Object.keys(taskSrc));
	gulp.watch('src/**/*.ts',['js']);
	
});

gulp.task('default',()=>{
    runSequence(['sass','html','image','temp','js'],'watch');
    //runSequence(['sass','html','image','temp',...Object.keys(taskSrc)],'watch');
});

gulp.task('clean', callback => {
	del('build').then(paths => callback());
})

gulp.task('build',['clean'],function(callback){
	process.env.production = true;
    runSequence(['sass','html','image','temp','js'],'watch');
    //runSequence(['sass','html','image','temp',...Object.keys(taskSrc)]);
});

gulp.task('cleanModule', callback => {
	del('node_modules').then(paths => callback());
});