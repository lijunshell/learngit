const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const runSequence = require('run-sequence');
const del = require('del');

// 编译Sass
gulp.task('sass',()=>{
    return gulp.src('src/sass/*.scss')
        .pipe($.sass())
        .pipe($.autoprefixer())
        .pipe( $.if(process.env.production !== undefined, $.cleanCss()) )
        .pipe(gulp.dest('build/css'))
        .pipe($.connect.reload());
});


gulp.task('script', ()=> {
    return gulp.src( 'src/js/*.js' )
        .pipe($.babel({
                presets: ['es2015']
            }))
        .pipe( $.if(process.env.production !== undefined, $.uglify()) )
        .pipe(gulp.dest('build/js'))
        .pipe($.connect.reload());
});



gulp.task('html', () => {
	return gulp.src('src/*.html')
        .pipe(gulp.dest('build'))
        .pipe($.connect.reload());
});

gulp.task('image', () => {
	return gulp.src('src/images/*.*')
       // .pipe($.if(process.env.production !== undefined, $.tinypngUnlimited()))//注意多个连字符插件引用是要转换为驼峰
        .pipe(gulp.dest('build/images'))
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
	gulp.watch('src/js/*.js',['script']);
});

gulp.task('default',()=>{
    runSequence(['sass','html','image','script'],'watch');
});

gulp.task('clean', callback => {
	del('build').then(paths => callback());
})

gulp.task('build',['clean'],function(callback){
	process.env.production = true;
	runSequence(['sass','html','image','script']);
});

gulp.task('cleanModule', callback => {
	del('node_modules').then(paths => callback());
});