#!/usr/bin/env node

/* globals global */

'use strict';

const path = require('path');
const Module = require('module');
const fs = require('fs');
const QUnit = require('qunitjs');
const testsDir = __dirname + "/../.dist-test/node-lib/tests";
const recursiveReadDir = require('../build-lib/util/recursive-read-dir');

function mockLocalStorage() {
  global.localStorage = {
    cache: {},
    setItem(key, value) {
      this.cache[key] = value;
    },
    getItem(key) {
      return this.cache[key] || null;
    },
    removeItem(key) {
      delete this.cache[key];
    }
  };
}

function overrideRequire() {
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function () {
    const srcNamespace = 'shopify-buy';
    const testsNamespace = 'shopify-buy/tests';
    const libDirName = 'node-lib';
    const srcDirName = 'src';
    const testsDirName = 'tests';
    const currentDirFullPath = path.dirname(this.id);
    const distBaseDirFullPath = currentDirFullPath.substring(0, currentDirFullPath.indexOf(libDirName));
    let newRequire = arguments[0];

    if (arguments[0] === 'qunit') {
      // console.log(this.id)
      // arguments[0] = path.join(testsDirRelativePath, arguments[0]);
      newRequire = 'qunitjs';
    } else if (arguments[0] === 'pretender') {
      newRequire = 'fetch-pretender';
    } else if (arguments[0].indexOf(testsNamespace) === 0) { //order matters here. `shopify-buy/tests` must match before `shopify-buy`
      const testsDirFullPath = path.join(distBaseDirFullPath, libDirName, testsDirName);
      const testsDirRelativePath = path.relative(currentDirFullPath, testsDirFullPath);

      newRequire = arguments[0].replace(testsNamespace, testsDirRelativePath);
    } else if (arguments[0].indexOf(srcNamespace) === 0) {
      const srcDirFullPath = path.join(distBaseDirFullPath, libDirName, srcDirName);
      const srcDirRelativePath = path.relative(currentDirFullPath, srcDirFullPath);

      newRequire = arguments[0].replace(srcNamespace, srcDirRelativePath);
    }

    arguments[0] = newRequire;
    return originalRequire.apply(this, arguments);
  };
}

function setupQUnitCallbacks() {
  let index = 1;
  const tests = {};

  QUnit.log(function (data) {
    if (!tests[data.testId]) {
      tests[data.testId] = [];
    }

    tests[data.testId].push(data);
  });

  QUnit.testDone(function (data) {
    let status = 'ok';

    if (data.failed !== 0) {
      status = 'not ok';
    }

    console.info(`${status} ${index} NodeQUnit - ${data.module}: ${data.name}`);
    if (data.failed !== 0) {
      tests[data.testId].forEach(function (log) {
        if (log.result === false) {
          console.info('\tactual: >', log.actual);
          console.info('\texpected: >', log.expected);
          console.info('\tmessage: >', log.message);
          console.info('\tLog: ', '');
        }
      });
    }

    delete tests[data.testId];
    index++;
  });
}

overrideRequire();
mockLocalStorage();
setupQUnitCallbacks();

recursiveReadDir(testsDir).map(function(test){
  require(test);
});

QUnit.load();
