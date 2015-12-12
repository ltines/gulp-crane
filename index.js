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

function buildImage(opts) {
    var stream = through.obj(function (file, enc, cb) {
        var self = this;
        opts = opts || {};
        var buildOpts = {
            file: file.path,
            quiet: true
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
            }
        }

        var args = ['build'];
        args = buildCmdLine(args, buildOpts);
        args.push(path.dirname(file.path));
        
        if (opts.debug) {
            console.log('Running docker with args: %s', args.join(' '));
        }

        process.stdout.write(PLUGIN_NAME + ' Building docker image ' + file.path + '\n');        

        var errorLog = '';
        var proc = spawn('docker', args);

        proc.stderr.on('data', function (data) {
            errorLog += data;
        });

        proc.on('close', function (code) {
            if (code !== 0) {
                self.emit('error', new PluginError(PLUGIN_NAME, 'Docker exited with code ' + code + ': ' + errorLog));
            }
        });

        // make sure the file goes through the next gulp plugin
        self.push(file);
        // tell the stream engine that we are done with this file
        cb();
    });
    
    return stream;
}

module.exports = buildImage;