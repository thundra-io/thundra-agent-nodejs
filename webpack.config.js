const webpack = require('webpack');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    mode : 'production' ,
    entry: './src/index.ts',
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: './thundra.js',
        libraryTarget: 'commonjs2',
        library: 'thundra'
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ]
    },
    module: {
        rules: [
            {
                use: 'ts-loader',
                exclude: /(node_modules)/,
                test: /\.ts?$/,
            },
        ],
    },
    plugins: [
        new UglifyJsPlugin({
            uglifyOptions: {
                compress: {
                    warnings: false
                }
            },
            sourceMap: true,
            parallel: true,
        }),
        new webpack.optimize.ModuleConcatenationPlugin()
    ]
};
