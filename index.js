#! /usr/bin/env node

var os      = require('os');
var child   = require('child_process');
var fs      = require('fs-extra');
var path    = require('path');
var tar     = require('tar');
var xml     = require('xml2js');

var package = fs.readJsonSync('package.json');
var version = `${package.version}-SNAPSHOT`;
var webjar = `${package.name}.jar`;

var packed = child.execSync('npm pack', { encoding: 'UTF-8' }).trim();

var tmp = fs.mkdtempSync(`${package.name}-${version}-webjar`);
var webjarRoot = path.join(tmp, 'META-INF', 'resources', 'webjars', package.name, version);
var webjarPath = path.join(tmp, webjar);
var ivyPath = path.join(os.homedir(), '.ivy2', 'local', 'org.webjars.npm', package.name, version);

fs.ensureDirSync(webjarRoot);

tar.extract({
  file: packed,
  C: webjarRoot,
  strip: 1,
  sync: true
});

tar.create({
  file: webjarPath,
  sync: true
}, [tmp]);

var builder = new xml.Builder();

var ivyFile = {
  'ivy-module': {
    '$': {
      'version': '2.0',
      'xmlns:e': 'http://ant.apache.org/ivy/extra'
    },
    'info': {
      '$': {
        'organisation': 'org.webjars.npm',
        'module': package.name,
        'revision': version,
        'status': 'release'
      },
      'description': `${package.name}-${version}`
    }
  }
};

fs.ensureDirSync(path.join(ivyPath, 'jars'));
fs.moveSync(webjarPath, path.join(ivyPath, 'jars', webjar), { overwrite: true });

fs.ensureDirSync(path.join(ivyPath, 'ivys'));
fs.writeFileSync(path.join(ivyPath, 'ivys', 'ivy.xml'), builder.buildObject(ivyFile));

fs.removeSync(packed);
fs.removeSync(tmp);

console.log(`published ${webjar} (version ${version})`);