var gulp = require('gulp');
var electron = require('electron-connect').server.create();

gulp.task('serve', function () {
    // Start browser process
    electron.start();

    // Restart browser process
    gulp.watch(['main.js','renderer.js'], electron.restart);

    // Reload renderer process
    gulp.watch(['assets/**/*.js', 'assets/**/*.css', 'views/**/*.html', 'index.html'], electron.reload);
});