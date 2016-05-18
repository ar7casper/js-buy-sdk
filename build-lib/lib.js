/* global require, module */

"use strict";

const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const babelTranspiler = require('broccoli-babel-transpiler');
const uglifyJavaScript = require('broccoli-uglify-js');
const pkg = require('../package.json');
const polyfills = require('./polyfills');
const loader = require('./loader');
const babelConfig = require('./util/babel-config');
const Licenser = require('./util/licenser');
const Versioner = require('./util/versioner');


function sourceTree(pathConfig, moduleType) {
  const lib = babelTranspiler(pathConfig.lib, babelConfig(pkg.name, moduleType));

  const shims = babelTranspiler(
    funnel(pathConfig.shims, { include: ['fetch.js', 'promise.js'] }),
    babelConfig(null, moduleType)
  );

  return mergeTrees([lib, shims]);
}

module.exports = function (pathConfig, env) {
  let tree;

  const amdTree = sourceTree(pathConfig, 'amd');
  const polyfillTree = polyfills(env);
  const loaderTree = loader();

  const globalsOutput = concat(mergeTrees([amdTree, loaderTree]), {
    header: ';(function () {',
    headerFiles: ['loader.js'],
    inputFiles: ['**/*.js'],
    footer: `
window.ShopifyBuy = require('shopify-buy/shopify').default;
})();`,
    outputFile: `${pkg.name}.globals.js`
  });

  if (env === 'production') {
    const amdOutput = concat(amdTree, {
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.amd.js`
    });

    const polyFilledAmdOutput = concat(mergeTrees([amdOutput, polyfillTree]), {
      headerFiles: ['polyfills.js'],
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.polyfilled.amd.js`
    });

    const polyFilledGlobalsOutput = concat(mergeTrees([globalsOutput, polyfillTree]), {
      headerFiles: ['polyfills.js'],
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.polyfilled.globals.js`
    });

    const commonTree = sourceTree(pathConfig, 'commonjs');
    const commonOutput = concat(commonTree, {
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.common.js`
    });

    const polyFilledCommonOutput = concat(mergeTrees([commonOutput, polyfillTree]), {
      headerFiles: ['polyfills.js'],
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.polyfilled.common.js`
    });

    const nodeLibOutput = funnel(commonTree, {
      srcDir: '.',
      destDir: './node-lib'
    });

    tree = mergeTrees([
      amdOutput,
      polyFilledAmdOutput,
      globalsOutput,
      polyFilledGlobalsOutput,
      commonOutput,
      polyFilledCommonOutput
    ]);

    const minifiedTree = uglifyJavaScript(funnel(tree, {
      getDestinationPath: function (path) {
        return path.replace(/\.js/, '.min.js');
      },
      exclude: ['**/*.map']
    }));

    const licensedAndVersionedTree = new Licenser([
      new Versioner([
        mergeTrees([
          tree,
          minifiedTree
        ])
      ], { templateString: '{{versionString}}' })
    ]);

    tree = mergeTrees([licensedAndVersionedTree, nodeLibOutput]);

  } else {
    const amdOutput = concat(mergeTrees([amdTree, loaderTree]), {
      headerFiles: ['loader.js'],
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.amd.js`
    });

    const polyFilledGlobalsOutput = concat(mergeTrees([globalsOutput, polyfillTree]), {
      headerFiles: ['polyfills.js'],
      inputFiles: ['**/*.js'],
      outputFile: `${pkg.name}.polyfilled.globals.js`
    });

    tree = new Versioner([
      mergeTrees([
        amdOutput,
        polyfillTree,
        globalsOutput,
        polyFilledGlobalsOutput
      ])
    ], { templateString: '{{versionString}}' });
  }

  return tree;
};
