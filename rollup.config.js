const typescript = require('rollup-plugin-typescript');
const { terser } = require('rollup-plugin-terser');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');

module.exports = {
    input: './src/index.ts',
    external: [
        'aws-xray-sdk-core', 'util', 'url',
        'os', 'child_process', 'fs', 'net',
        'http', 'https', 'zlib', 'path',
    ],
    output: {
        file: 'dist/thundra.js',
        format: 'cjs',
    },
    plugins: [
        resolve(),
        typescript(),
        json(),
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
              'minimatch': [ 'Minimatch', 'IMinimatch' ],
              'opentracing': [ 'initGlobalTracer' ],
            }
          })
    ]
};
