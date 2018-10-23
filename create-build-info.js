var fs = require('fs');
var path = require('path');
var pjson = require('./package.json');
var tsjon = require('./tsconfig.json');
var semver = require('semver');

var version = pjson.version;
var libDir = tsjon.compilerOptions.outDir;

version = semver.inc(version, 'patch');

var buildInfo = {
    'version': version
};

var infoExport = 'module.exports = ' + JSON.stringify(buildInfo) + ';';

if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir);
}

fs.writeFileSync(path.join(libDir, 'BuildInfo.js'), infoExport);