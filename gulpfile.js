var gulp = require('gulp'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    sourcemaps = require('gulp-sourcemaps'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish')
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    cache = require('gulp-cache'),
    livereload = require('gulp-livereload'),
    express = require('express'),
    del = require('del'),
    stripDebug = require('gulp-strip-debug'),
    browserSync = require('browser-sync'),
    argv = require('yargs').argv,
    gulpif = require('gulp-if'),
    todo = require('gulp-todo'),
    plumber = require('gulp-plumber'),
    ngannotate = require('gulp-ng-annotate'),
    replace = require('gulp-replace');

var options = {liveReload: false};

/**
 * browser-sync task for starting a server. This will open a browser for you. Point multiple browsers / devices to the same url and watch the magic happen.
 * Depends on: watch
 */
gulp.task('browser-sync', ['watch'], function() {

  // Watch any files in dist/*, reload on change
  gulp.watch(['dist/**']).on('change', function(){browserSync.reload({});notify({ message: 'Reload browser' });});

  return browserSync({
      server: {
          baseDir: "./dist"
      },
      ghostMode: {
        clicks: true,
        location: true,
        forms: true,
        scroll: true
      },
      open: "external",
      injectChanges: true, // inject CSS changes (false force a reload) 
      browser: ["google chrome"],
      scrollProportionally: true, // Sync viewports to TOP position
      scrollThrottle: 50,
    });
});


/**
 * Build and copy all styles, scripts, images and fonts.
 * Depends on: clean
 */
gulp.task('build', ['clean'], function() {
    gulp.start('styles', 'scripts', 'images', 'copy', 'todo');
});


/**
 * Cleans the `dist` folder and other generated files
 */
gulp.task('clean', function(cb) {
    del(['dist', 'todo.md', 'todo.json'], cb);
});


/**
 * Copies all to dist/
 */
gulp.task('copy', function() {

  // copy all jpg's as they are not handled by the images task
  gulp.src( 'src/img/**/*.jpg')
    .pipe(gulp.dest('dist/img'));

  // copy all fonts
  gulp.src( 'src/fonts/**')
    .pipe(gulp.dest('dist/fonts'));

  // copy all html && json
  gulp.src( ['src/js/app/**/*.html', 'src/js/app/**/*.json'])
    .pipe(gulp.dest('dist/js/app'));

  // copy the index.html
   return gulp.src('src/index.html')
    .pipe(gulpif(options.liveReload, replace(/(\<\/body\>)/g, "<script>document.write('<script src=\"http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1\"></' + 'script>')</script>$1")))
    .pipe(gulp.dest('dist/'));
});


/**
 * Default task.
 * Depends on: build
 */
gulp.task('default', ['build']);


/**
 * Task to start a Express server on port 4000.
 */
gulp.task('express', function(){
  var app = express(), port = 4000;
  var url = require('url');
  var proxy = require('proxy-middleware');
  app.use(express.static(__dirname + "/dist"));
  app.use('/api', proxy(url.parse('http://localhost:1337')));
  app.listen(port); 
  console.log('started webserver on port ' + port);
});


/**
 * Task to start a Express server on port 4000 and used the live reload functionality.
 * Depends on: express, live-reload
 */
gulp.task('express-lr', ['express', 'live-reload'], function(){});

/**
 * Task to optimize and deploy all images found in folder `src/img/**`. Result is copied to `dist/img`
 */
gulp.task('images', function() {
  return gulp.src('src/img/**/*')
    .pipe(plumber())
    .pipe(cache(imagemin({ optimizationLevel: 5, progressive: true, interlaced: true })))
    .pipe(gulp.dest('dist/img'));
});


/**
 * Start the live reload server. Live reload will be triggered when a file in the `dist` folder changes. This will add a live-reload script to the index.html page, which makes it all happen.
 * Depends on: watch
 */
gulp.task('live-reload', ['watch'], function() {

  options.liveReload = true;
  // first, delete the index.html from the dist folder as we will copy it later
  del(['dist/index.html']);

  // add livereload script to the index.html
  gulp.src(['src/index.html'])
   .pipe(replace(/(\<\/body\>)/g, "<script>document.write('<script src=\"http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1\"></' + 'script>')</script>$1"))
   .pipe(gulp.dest('dist'));
   
  // Create LiveReload server
  livereload.listen();

  // Watch any files in dist/*, reload on change
  gulp.watch(['dist/**']).on('change', livereload.changed);
});


/**
 * Task to handle and deploy all javascript, application & vendor
 *
 * Depends on: scripts-app, scripts-vendor
 */
gulp.task('scripts', ['scripts-app','scripts-vendor']);


/**
 * Removes the node_modules
 */
gulp.task('remove',['clean'], function(cb){
  del('node_modules', cb);
});


/**
 * Minifies all javascript found in the `src/js/**` folder. All files will be concatenated into `app.js`.  Minified and non-minified versions are copied to the dist folder.
 * This will also generete sourcemaps for the minified version.
 */
gulp.task('scripts-app', [], function() {
  return gulp.src(['src/js/app/huna.js','src/js/app/**/*.js'])
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(jshint())
    .on('error', notify.onError(function (error) {
      return error.message;
     }))
    .pipe(jshint.reporter(stylish))
    .pipe(concat('app.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulpif(!argv.dev, stripDebug()))
    .pipe(ngannotate())
    .pipe(gulpif(!argv.dev, uglify()))
    .on('error', handleError)
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/js'));
});


/**
 * Task to handle all vendor specific javasript. All vendor javascript will be copied to the dist directory. Also a concatinated version will be made, available in \dist\assets\js\vendor\vendor.js
 */
gulp.task('scripts-vendor', function() {
    // script must be included in the right order. First include angular, then angular-route
  return gulp.src(['src/js/vendor/angularjs/1.3.14/angular.min.js','src/js/vendor/angularjs/1.3.14/angular-route.min.js','src/js/vendor/**/*.js'])
    .pipe(gulp.dest('dist/js/vendor'))
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('dist/js/vendor'));
});


/**
 * Compile Sass into Css and minify it. Minified and non-minified versions are copied to the dist folder.
 * This will also auto prefix vendor specific rules.
 */
gulp.task('styles', function() {
  return gulp.src('src/styles/main.scss')
    .pipe(plumber())
    .pipe(sass({ style: 'expanded' }))
    .on('error', handleError)
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .on('error', handleError)
    .pipe(gulp.dest('dist/css'))
    .pipe(rename({suffix: '.min'}))
    .pipe(minifycss())
    .pipe(gulp.dest('dist/css'));
});


/**
 * Output TODO's & FIXME's in markdown and json file as well
 */
gulp.task('todo', function() {
    gulp.src('src/js/app/**/*.js')
      .pipe(plumber())
      .pipe(todo())
      .pipe(gulp.dest('./')) //output todo.md as markdown
      .pipe(todo.reporter('json', {fileName: 'todo.json'}))
      .pipe(gulp.dest('./')) //output todo.json as json
});


/**
 * Watches changes to template, Sass, javascript and image files. On change this will run the appropriate task, either: copy styles, scripts or images. 
 */
gulp.task('watch', function() {

  // watch html files
  gulp.watch('src/**/*.html', ['copy']);

  // Watch .scss files
  gulp.watch('src/styles/**/*.scss', ['styles']);

  // Watch app .js files
  gulp.watch('src/js/app/**/*', ['scripts-app']);

  // Watch vendor .js files
  gulp.watch('src/js/vendor/**/*', ['scripts-vendor']);

  // Watch image files
  gulp.watch('src/img/**/*', ['images']);
});


function handleError (error) {

    //If you want details of the error in the console
    console.log(error.toString());

    this.emit('end');
}