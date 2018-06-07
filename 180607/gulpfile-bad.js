var gulp = require('gulp');
//var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
// var sass = require('gulp-ruby-sass');
//var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var minifyCSS = require('gulp-minify-css');
var autoprefixer = require('gulp-autoprefixer');


// 编译Sass
gulp.task('sass',function() {

	// return sass('./sass/*.scss',{style:'expanded'})
	return gulp.src('./sass/!(reset|define).scss')
        .pipe(sass())
		.pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
		//.pipe(minifyCSS({keepBreaks:false}))
		.pipe(minifyCSS({keepBreaks:false,compatibility:'ie7'}))
        .pipe(gulp.dest('./css'));
});

gulp.task('scripts',function() {
    gulp.src('./script/*.js')
		//.pipe(concat('zp.js'))
		//.pipe(gulp.dest('./js'))
        //.pipe(rename('common-min.js'))
        .pipe(uglify())
		//.pipe(rename('*-min.js'))
        .pipe(gulp.dest('./js'));
});

gulp.task('watch', function() {
	gulp.watch('./sass/*.scss', ['sass']);
	gulp.watch('./script/*.js', ['scripts']);
});

gulp.task('default', ['sass','scripts']);