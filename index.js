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

function removeImage(imageOrImages, opts)
{
    var stream = through.obj(function (file, enc, cb) {
        var self = this;
        opts = opts || {};

        if (!Array.isArray(imageOrImages))
            imageOrImages = [imageOrImages];
        var buildOpts = {
        };

        for (var k in opts) {
            switch (k) {
                case 'force':
                    buildOpts['force'] = opts['force'];
                    break;
                case 'no-prune':
                    buildOpts['no-prune'] = opts['no-prune'];
            }
        }
        var args = ['rmi'];
        args = buildCmdLine(args, buildOpts);
        
        for (var i = 0; i < imageOrImages.length; i++)
        {
            args.push(imageOrImages[i]);    
        }
        

        process.stdout.write(PLUGIN_NAME + ' Removing docker image(s) ' + imageOrImages.join(',') + '\n');

        runDocker(args, opts.debug)
            .then(function () {
                // make sure the file goes through the next gulp plugin
                self.push(file);
                // tell the stream engine that we are done with this file
                cb();
            })
            .catch(function (message) {
                
                self.emit('error', new PluginError(PLUGIN_NAME, message));    
                self.push(file);
                cb();
            });
    });
    
    return stream;
}

function runImage(imageId, opts)
{
    var stream = through.obj(function (file, enc, cb) {
        var self = this;
        opts = opts || {};

        var buildOpts = {
        };
        
        var containerRun = '';

        for (var k in opts) {
            switch (k) {
                case 'name':
                    buildOpts['name'] = opts['name'];
                    break;
                case 'net':
                    buildOpts['net'] = opts['net'];
                case 'publish-all':
                    buildOpts['publish-all-allet'] = opts['publish-all'];
                case 'privileged':
                    buildOpts['privileged'] = opts['privileged'];
                case 'tty':
                    buildOpts['tty'] = opts['tty'];
                case 'user':
                    buildOpts['user'] = opts['user'];
                case 'volume':
                    buildOpts['volume'] = opts['volume'];
                case 'workdir':
                    buildOpts['workdir'] = opts['workdir'];
                case 'restart':
                    buildOpts['restart'] = opts['restart'];
                case 'read-only':
                    buildOpts['read-only'] = opts['read-only'];
                case 'env-file':
                    buildOpts['env-file'] = opts['env-file'];
                case 'publish':
                    buildOpts['publish'] = opts['publish'];
                case 'memory':
                    buildOpts['memory'] = opts['memory'];
                case 'hostname':
                    buildOpts['hostname'] = opts['hostname'];
                case 'attach':
                    buildOpts['attach'] = opts['attach'];
                case 'run':
                    containerRun = opts['run'];
            }
        }
        var args = ['rmi'];
        args = buildCmdLine(args, buildOpts);
        
        args.push(imageId);
        args.push(containerRun);
        

        process.stdout.write(PLUGIN_NAME + ' Starting docker image(s) ' + imageOrImages.join(',') + '\n');

        runDocker(args, opts.debug)
            .then(function () {
                // make sure the file goes through the next gulp plugin
                self.push(file);
                // tell the stream engine that we are done with this file
                cb();
            })
            .catch(function (message) {
                
                self.emit('error', new PluginError(PLUGIN_NAME, message));    
                self.push(file);
                cb();
            });
    });
    
    return stream;
}


module.exports = {
    build: buildImage,
    removeImage: removeImage
};