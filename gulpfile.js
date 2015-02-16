'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var jshint = require('gulp-jshint');

var path = require('path');
var glob = require('glob');
var done = require('exuent');
var webpack = require('webpack');

function lintTask(){
  return gulp.src(['**/*.js', '!public/**', '!node_modules/**', '!coverage/**'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
}

function bundleTask(cb){
  var notCalled = true;
  var entryDir = './client/js/entries/';

  var entryFiles = glob.sync(path.join(entryDir, '*.js'));

  var entries = entryFiles.reduce(function(entries, file){
    var key = path.basename(file, '.js');
    entries[key] = path.join(__dirname, file);
    return entries;
  }, {});

  webpack({
    entry: entries,
    output: {
      path: path.join(__dirname, './public/js/'),
      filename: '[name].js'
    },
    module: {
      loaders: [
        { test: /\.jsx$/, loader: 'jsx-loader?insertPragma=React.DOM' }
      ]
    },
    resolve: {
      alias: {
        net: 'net-browserify'
      }
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin('vendor.js', 2)
    ],
    watch: true
  }, function(err){
    if(err){
      console.error(err);
    }

    console.log('Bundle Complete');

    if(notCalled){
      notCalled = false;
      cb();
    }
  });
}

function styleTask(cb){
  var example = gulp.src('./public/less/*.less')
    .pipe(less())
    .pipe(gulp.dest('./public/less/'))
    .on('error', console.log);

  var main = gulp.src('./client/less/*.less')
    .pipe(less())
    .pipe(gulp.dest('./public/css/'))
    .on('error', console.log);

  gulp.watch('./client/less/**/*.less', ['less']);

  done(example, main, cb);
}

gulp.task('lint', lintTask);
gulp.task('less', styleTask);
gulp.task('bundle', bundleTask);

gulp.task('default', ['lint']);
