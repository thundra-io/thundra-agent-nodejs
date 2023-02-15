const typescript = require('rollup-plugin-typescript');
const { terser } = require('rollup-plugin-terser');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const replace = require('rollup-plugin-re');
const copy = require('rollup-plugin-copy');

module.exports = [
    {
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
            commonjs(),
            replace({
                exclude: 'node_modules/**',
                replaces: {
                    'import * as opentracing from \'opentracing\';': 'import opentracing from \'opentracing\';',
                }
            }),
            copy({
                targets: [
                    { src: 'src/bootstrap/*', dest: 'dist/bootstrap' },
                    { src: 'src/index.d.ts', dest: 'dist', rename: 'thundra.d.ts' }
                ]
            })
        ]
    },
    {
        input: './src/handler.ts',
        output: {
            file: 'dist/handler.js',
            format: 'cjs',
        },
        plugins: [
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
        ]
    },
    {
        input: './src/thundraInternalApi.ts',
        external: [
            'aws-xray-sdk-core', 'util', 'url',
            'os', 'child_process', 'fs', 'net',
            'http', 'https', 'zlib', 'path',
        ],
        output: {
            file: 'dist/thundraInternalApi.js',
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
            commonjs(),
            replace({
                exclude: 'node_modules/**',
                replaces: {
                    'import * as opentracing from \'opentracing\';': 'import opentracing from \'opentracing\';',
                }
            }),
        ]
    },
    {
        input: './src/thundraBridge.ts',
        output: {
            file: 'dist/thundraBridge.js',
            format: 'cjs',
        },
        plugins: [
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
        ],
    },
];
