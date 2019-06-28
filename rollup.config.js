const typescript = require('rollup-plugin-typescript');
const { terser } = require('rollup-plugin-terser');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

module.exports = {
    input: './src/index.ts',
    external: ['aws-xray-sdk-core'],
    output: {
        file: 'dist/thundra.js',
        format: 'cjs',
    },
    plugins: [
        resolve(),
        typescript(),
        terser({
            warnings: 'verbose',
            compress: {
                warnings: 'verbose',
            },
            mangle: {
                keep_fnames: true,
            },
            output: {
                beautify: false,
            },
        }),
        commonjs({
            namedExports: {
              // left-hand side can be an absolute path, a path
              // relative to the current directory, or the name
              // of a module in node_modules
              'minimatch': [ 'Minimatch', 'IMinimatch' ],
              'opentracing': [ 'initGlobalTracer' ],
            }
          })
    ]
};