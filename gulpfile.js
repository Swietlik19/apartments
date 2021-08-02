var gulp         = require('gulp'), // Подключаем Gulp
    sass         = require('gulp-sass'), //Подключаем Sass пакет,
    browserSync  = require('browser-sync'), // Подключаем Browser Sync
    cssnano      = require('gulp-cssnano'), // Подключаем пакет для минификации CSS
    rename       = require('gulp-rename'), // Подключаем библиотеку для переименования файлов
    pug          = require('gulp-pug'), // Подключаем pug
    del          = require('del'), // Подключаем библиотеку для удаления файлов и папок
    concat       = require("gulp-concat"), // Конкатенация файлов
    plumber      = require('gulp-plumber'), // Отлов ошибок
    cache        = require('gulp-cache'), // Подключаем библиотеку кеширования
    autoprefixer = require('gulp-autoprefixer'),// Подключаем библиотеку для автоматического добавления префиксов
    imagemin     = require('gulp-imagemin'),
    prettify     = require('gulp-prettify'),
    svgSprite    = require('gulp-svg-sprite'),
    svgmin       = require('gulp-svgmin'),
    cheerio      = require('gulp-cheerio'),
    replace      = require('gulp-replace');

var paths = {
  html: {
    src: 'code/pages/*.pug',
    dest: 'code',
    srcHTML: 'code/*.html',
    destHTML: 'code'
  },
  sass: {
    src: ['code/sass/main.sass'],
    dest: 'code/css'
  },
  css: {
    src: ['code/css/main.css'],
    dest: 'code/css'
  },
  img: {
    src: ['code/img/**/*.jpg','code/img/**/*.png'],
    dest: 'code/img'
  },
  svg: {
    src: ['code/img/svg/orig/*.svg'],
    dest: 'code/img/svg'
  },
};

gulp.task('svgSpriteBuild', function () {
  return gulp.src(paths.svg.src)
  // minify svg
    .pipe(svgmin({
      js2svg: {
        pretty: true
      }
    }))

    // build svg sprite
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: "../sprite.svg"
        }
      }
    }))
    .pipe(gulp.dest(paths.svg.dest));
});

gulp.task('prettifyAll', ['pugHTML'], function() {
  return gulp.src(paths.html.srcHTML)
    .pipe(prettify({
      indent_size: 2
    }))
    .pipe(gulp.dest(paths.html.destHTML));
});

gulp.task('compress', function() {
    return gulp.src(paths.img.src)
        .pipe(imagemin())
        .pipe(gulp.dest(paths.img.dest))
});

gulp.task('sass', function(){
    return gulp.src(paths.sass.src)
        .pipe(plumber())
        .pipe(sass({outputStyle: 'expanded'}))
        .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(gulp.dest(paths.sass.dest));
});

gulp.task('pugHTML', function () {
  return gulp.src(paths.html.src)
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest(paths.html.dest));
});

gulp.task('browser-sync', ['sass'], function() {
    browserSync({
        server: {
            baseDir: 'code'
            ,index: "index.html"
        },
        notify: false
    });
});

gulp.task('build', ['svgSpriteBuild','compress', 'sass', 'prettifyAll'], function() { 
});


gulp.task('watch', ['browser-sync'], function() {
  gulp.watch('code/pages/**/*.pug', ['prettifyAll', browserSync.reload]);
  gulp.watch ('code/sass/**/*.sass', ['sass', browserSync.reload]);  
  gulp.watch('code/js/*.js', ['sass', browserSync.reload]); 
  gulp.watch('code/img/svg/orig/*.svg', ['svgSpriteBuild', browserSync.reload]);
});

gulp.task('default', ['build','watch']);

gulp.task('clear', function () {
    return cache.clearAll();
});
