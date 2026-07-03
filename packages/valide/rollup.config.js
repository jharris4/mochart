import replace from 'rollup-plugin-replace';
import babel from 'rollup-plugin-babel';
import node from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

const isMinified = process.env.BABEL_ENV === 'min';

let pkg = require('./package.json');
const outputFile = isMinified ? 'dist/valide.min.js' : 'dist/valide.js';

let babelConfig = Object.assign({}, pkg.babel.env.es);

babelConfig.babelrc = false;
babelConfig.exclude = 'node_modules/**';

let externalPackages = pkg.vendorize;
let globalPackages = pkg.globalize;

let config = {
  input: 'src/validators.js',
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    node(),
    babel(babelConfig), // order changed, see: https://github.com/rollup/rollup/issues/1148#issuecomment-275922534
    commonjs()
  ],
  external: externalPackages,
  globals: globalPackages,
  output: [{
    format: 'umd',
    file: outputFile
  }],
  name: 'Valide',
  sourcemap: true
};

if (isMinified) {
  let bannerArgIndex = process.argv.indexOf('--banner');
  if (bannerArgIndex === -1) {
    throw new Error('--banner not found in rollup command line arguments!');
  }
  let banner = process.argv[bannerArgIndex + 1];
  let uglifyOptions = {
    compress: {
      negate_iife: false
    },
    output: {
      preamble: banner
    }
  };
  config.plugins.push(uglify(uglifyOptions));
}

export default config;