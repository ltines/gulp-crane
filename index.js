var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var path = require('path');
var spawn = require('child_process').spawn;


// consts
const PLUGIN_NAME = 'gulp-crane';

function buildCmdLine(args, opts)
{
    for (var n in opts)
    {
        if (!opts[n])
            continue;
        args.push('--' + n + '=' + opts[n]);
    }
    
    return args;
}

function runDocker(args, debug) {
    debug = debug || false;
    
    return new Promise(function (resolve, reject) {
        var proc = spawn('docker', args);
        var errorLog = '';
        proc.stderr.on('data', function (data) {
            errorLog += data;
        });
        
        if (debug) {
            process.stdout.write('Running docker with args: ' + args.join(' ') + '\n');
        }

        proc.on('close', function (code) {
            if (code !== 0) {
                reject('Docker exited with code ' + code + ': ' + errorLog);
            }
            resolve();
        });
    });
    
}

function buildImage(opts) {
    var stream = through.obj(function (file, enc, cb) {
        var self = this;
        opts = opts || {};
        var buildOpts = {
            file: file.path,
            quiet: true,
            rm: true
        };

        for (var k in opts) {
            switch (k) {
                case 'tag':
                    buildOpts['tag'] = opts['tag'];
                    break;
                case 'pull':
                    buildOpts['tag'] = opts['pull'];
                case 'no-cache':
                    buildOpts['no-cache'] = opts['no-cache'];
                case 'rm':
                    buildOpts['rm'] = opts['rm'];
            }
        }

        var args = ['build'];
        args = buildCmdLine(args, buildOpts);
        args.push(path.dirname(file.path));

        process.stdout.write(PLUGIN_NAME + ' Building docker image ' + file.path + '\n');

        runDocker(args, opts.debug)
            .then(function () {
                // make sure the file goes through the next gulp plugin
                self.push(file);
                // tell the stream engine that we are done with this file
                cb();
            })
            .catch(function (message) {
                self.emit('error', new PluginError(PLUGIN_NAME, message));
            });
    });
    
    return stream;
}


module.exports = buildImage;