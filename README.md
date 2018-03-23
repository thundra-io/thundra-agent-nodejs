# Thundra.io Lambda Node.js Agent

[![Coverage Status](https://coveralls.io/repos/github/thundra-io/thundra-lambda-agent-nodejs/badge.svg?branch=master)](https://coveralls.io/github/thundra-io/thundra-lambda-agent-nodejs?branch=master)
[![CircleCI](https://circleci.com/gh/thundra-io/thundra-lambda-agent-nodejs.svg?style=svg)](https://circleci.com/gh/thundra-io/thundra-lambda-agent-nodejs)

Instrument and profile your AWS lambda functions with zero overhead.

Check out [example projects](https://github.com/thundra-io/thundra-examples-lambda-nodejs) for a quick start and [Thundra docs](https://thundra.readme.io/docs) for more information.

## Installation

```bash
npm install @thundra/core --save
```

## Usage

Just require this module, pass your api key to it and wrap your handler:

```js
const thundra = require("@thundra/core")({ apiKey: "MY_APIKEY" });

exports.handler = thundra((event, context,callback) => {
    callback(null, "Hello Thundra!");
});
```

Thundra will monitor your AWS lambda function and report automatically!

`context.done`, `context.succeed` and `context.fail` are also supported:

```js
const thundra = require("@thundra/core")({ apiKey: "MY_APIKEY" });

exports.handler = thundra((event, context) => {
    context.succeed("Hello Thundra!");
});
```

## Configuration
You can configure Thundra using **environment variables** or **module initialization parameters**.

Environment variables have **higher precedence** over initialization parameters.

Check out the [configuration part](https://thundra.readme.io/docs/configuration-1) of our docs for more detailed information.

#### 1. Environment variables

| Name                                     | Type   | Default Value |
|:-----------------------------------------|:------:|:-------------:|
| thundra_apiKey                           | string |       -       |
| thundra_applicationProfile               | string |    default    |
| thundra_disable                          |  bool  |     false     |
| thundra_disable_trace                    |  bool  |     false     |
| thundra_disable_metric                   |  bool  |     false     |
| thundra_lambda_publish_cloudwatch_enable |  bool  |     false     |

#### 2. Module initialization parameters

| Name           | Type   | Default Value |
|:---------------|:------:|:-------------:|
| apiKey         | string |       -       |
| disableThundra |  bool  |     false     |
| disableTrace   |  bool  |     false     |
| disableMetric  |  bool  |     false     |


## Async Monitoring with Zero Overhead
By default, Thundra agent reports by making an HTTPS request. This adds an overhead to your lambda function.

Instead, you can [setup async monitoring](https://docs.thundra.io/docs/how-to-setup-async-monitoring) in **2 minutes** and monitor your lambda functions with **zero overhead**!

Check out our async monitoring example at our [example projects](https://github.com/thundra-io/thundra-examples-lambda-nodejs)  for a quick start.

## How to build
[Webpack](https://webpack.js.org/) is used as a module bundler.

To build the project,
 ```bash
 npm install
 npm run build
 ```

## How to test
Tests are written using [Jest](https://facebook.github.io/jest/).

To run tests,
 ```bash
 npm run test
 ```

