const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const fs = require('fs');
const path = require('path');
const clean = require('gulp-clean');
const replace = require('gulp-replace');
const cssnano = require('gulp-cssnano');
const autoprefixer = require('gulp-autoprefixer');

function unlinkDir(dirPath) {
    try { var files = fs.readdirSync(dirPath); }
    catch (e) { return; }
    if (files.length > 0)
        for (let i = 0; i < files.length; i++) {
            const filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
            else
                rmDir(filePath);
        }
    fs.rmdirSync(dirPath);
    return;
};

exports.setup = function (config) {

    let styles = config.styles ?? [];
    let srcDir = config.srcDir ?? './src';
    let outDir = config.outDir ?? './dist';

    gulp.task('clean', function () {
        const isExists = fs.existsSync(outDir);
        if (isExists) {
            return gulp.src(outDir).pipe(clean({ force: true, allowEmpty: true }));
        }
        return Promise.resolve(true);
    });

    gulp.task('source', function () {
        return gulp.src(srcDir + '/**/*.!(map|scss)')
            .pipe(gulp.dest(outDir));
    });
    gulp.task("prefix", () => {
        return gulp.src(srcDir,{allowEmpty:true})
            .pipe(autoprefixer({
                cascade: false
            }))
            .pipe(gulp.dest(outDir))
    })

    gulp.task("nano", () => {
        return gulp.src(srcDir,{allowEmpty:true})
            .pipe(cssnano())
            .pipe(gulp.dest(outDir))
    })
    gulp.task('sass', function () {
        return gulp.src(styles)
            .pipe(sass({ outputStyle: 'compressed' })
                .on('error', sass.logError))
            .pipe(replace(/\/\*!/g, '/*'))
            .pipe(replace(/\*\//g, '*/\n\n'))
            .pipe(gulp.dest(outDir));
    });

    gulp.task('build', gulp.series(['clean', 'source', 'nano','prefix', 'sass']));

    gulp.task('watcher', function () {
        const fileWatcher = gulp.watch(srcDir + '/**/!(*.map|*.scss)', { events: 'all' });
        fileWatcher.on('error', function (e) {
            console.log('Error :' + e);
            console.log('Watcher Restarted');
            this.emit('end');
        });

        fileWatcher.on('all', function (action, file) {
            const filePath = path.relative(path.resolve(srcDir + '/'), path.resolve(file));
            const distPath = path.resolve(path.resolve(outDir), filePath);

            if (action == 'unlinkDir') {
                fs.exists(distPath, function (exists) {
                    if (exists) {
                        unlinkDir(distPath);
                        console.log('Directory Removed: ' + filePath + ' -> ' + distPath);
                    }
                })
            }

            if (action == 'change' || action == 'add') {
                const copyFile = function () {
                    fs.copyFile(srcDir + '/' + filePath, distPath, function (e) {
                        console.log((action == 'change' ? 'Changed' : 'Created') + ' : ' + filePath + ' -> ' + distPath);
                    });
                }
                fs.exists(path.dirname(distPath), function (exists) {
                    if (!exists) {
                        fs.mkdir(path.dirname(distPath), { recursive: true }, function () {
                            copyFile();
                        });
                    } else {
                        copyFile();
                    }
                })
            }

            if (action == 'unlink') {
                fs.unlink(distPath, function (e) {
                    console.log('Deleted : ' + filePath + ' -> ' + distPath);
                });
            }
        });


        gulp.watch(styles, { events: 'all' }, gulp.series(['sass']));
    });

    gulp.task('watch', gulp.series(['build', 'watcher']));

}