# Thundra Lambda Node.js Agent

[![OpenTracing Badge](https://img.shields.io/badge/OpenTracing-enabled-blue.svg)](http://opentracing.io)
[![Coverage Status](https://coveralls.io/repos/github/thundra-io/thundra-lambda-agent-nodejs/badge.svg?branch=master)](https://coveralls.io/github/thundra-io/thundra-lambda-agent-nodejs?branch=master)
[![CircleCI](https://circleci.com/gh/thundra-io/thundra-lambda-agent-nodejs.svg?style=svg)](https://circleci.com/gh/thundra-io/thundra-lambda-agent-nodejs)

Instrument and profile your AWS lambda functions with zero overhead.

Check out [example projects](https://github.com/thundra-io/thundra-examples-lambda-nodejs) for a quick start and [Thundra docs](https://docs.thundra.io/) for more information.

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

Check out the [configuration part](https://thundra.readme.io/docs/nodejs-configuration) of our docs for more detailed information.

#### 1. Environment variables

| Name                                                                     | Type   | Default Value |
|:------------------------------------------------------------------------ |:------:|:-------------:|
| thundra_apiKey                                                           | string |       -       |
| thundra_agent_lambda_warmup_warmupAware                                  | bool   |     false     |
| thundra_agent_lambda_application_stage                                   | string |    empty      |
| thundra_agent_lambda_application_domainName                              | string |    API        |
| thundra_agent_lambda_application_className                               | string |    AWS-Lambda |
| thundra_agent_lambda_disable                                             | bool   |    false      |
| thundra_agent_lambda_timeout_margin                                      | number |    200        |
| thundra_agent_lambda_report_rest_baseUrl                                 | string | https<nolink>://api.thundra.io/v1 |
| thundra_agent_lambda_report_cloudwatch_enable                            | bool   |    false      |
| thundra_agent_lambda_trace_disable                                       | bool   |    false      |
| thundra_agent_lambda_metric_disable                                      | bool   |    false      |
| thundra_agent_lambda_log_disable                                         | bool   |    false      |
| thundra_agent_lambda_trace_request_skip                                  | bool   |    false      |
| thundra_agent_lambda_trace_response_skip                                 | bool   |    false      |
| thundra_agent_lambda_trace_instrument_disable                            | bool   |    false      |
| thundra_agent_lambda_trace_instrument_traceableConfig                    | string |    empty      |
| thundra_agent_lambda_trace_instrument_file_prefix                        | string |    empty      |
| thundra_agent_lambda_log_loglevel                                        | string |    TRACE      |
| thundra_agent_lambda_integrations                                        | string |    empty      |
| thundra_agent_lambda_debug_enable                                        | bool   |    false      |
| thundra_agent_lambda_trace_instrument_integrations_disable               | array  |    []         |
| thundra_agent_lambda_sampler_timeAware_timeFreq                          | number |    300000     |
| thundra_agent_lambda_sampler_countAware_countFreq                        | number |    10         |
| thundra_agent_lambda_log_console_shim_disable                            | bool   |    false      |
| thundra_agent_trace_instrument_integrations_spanContext_disable          | bool   |    false      |
| thundra_agent_lambda_xray_disable                                        | bool   |    false      |
| thundra_agent_lambda_trace_span_listener                                 | string |    empty      |
| thundra_agent_lambda_sample_timed_out_invocations                        | bool   |    false      |  
| thundra_agent_lambda_trace_integrations_redis_command_mask               | bool   |    false      |
| thundra_agent_lambda_trace_integrations_rdb_statement_mask               | bool   |    false      |
| thundra_agent_lambda_trace_integrations_aws_dynamodb_statement_mask      | bool   |    false      |
| thundra_agent_lambda_trace_integrations_elastic_statement_mask           | bool   |    false      |
| thundra_agent_lambda_trace_kinesis_request_enable                        | bool   |    false      |
| thundra_agent_lambda_trace_firehose_request_enable                       | bool   |    false      |
| thundra_agent_lambda_trace_cloudwatchlog_request_enable                  | bool   |    false      |
| thundra_agent_lambda_trace_integrations_aws_sns_message_mask             | bool   |    false      |
| thundra_agent_lambda_trace_integrations_aws_sqs_message_mask             | bool   |    false      |
| thundra_agent_lambda_trace_integrations_aws_lambda_payload_mask          | bool   |    false      |
| thundra_agent_lambda_trace_integrations_aws_http_body_mask               | bool   |    false      |
| thundra_agent_lambda_report_rest_composite_enabled                       | bool   |    false      |
| thundra_agent_lambda_error_stacktrace_mask                               | bool   |    false      |


#### 2. Module initialization parameters

| Name           | Type   | Default Value |
|:---------------|:------:|:-------------:|
| apiKey         | string |       -       |
| disableThundra |  bool  |     false     |
| plugins        |  array |      [ ]      |


## Async Monitoring with Zero Overhead
By default, Thundra agent reports by making an HTTPS request. This adds an overhead to your lambda function.

Instead, you can [setup async monitoring](https://docs.thundra.io/docs/how-to-setup-async-monitoring) in **2 minutes** and monitor your lambda functions with **zero overhead**!

Check out our async monitoring example at our [example projects](https://github.com/thundra-io/thundra-examples-lambda-nodejs)  for a quick start.


## Log Support
You can monitor your logs using Thundra and enjoy the three pillars of observability in one place!

```js
const thundra = require("@thundra/core");

const logger = thundra.createLogger();

exports.handler = thundra({
    apiKey: "MY_APIKEY",
})((event, context, callback) => {
    logger.info("Hello %s", "Thundra");
    callback(null, "Hello Thundra!");
});
```

You can also set the name of a logger while creating it (default name is `default`):

```js
const logger = thundra.createLogger({loggerName: "Bob"});
```

Logger's name will be visible in Thundra's trace chart.

## How to use Thundra loggers

You can log by two different ways.

### 1. Using `trace`, `debug`, `info`, `warn`, `error`, `fatal` methods

All these methods support `printf`-like format. Same as Node's [`util.format`](https://nodejs.org/api/util.html#util_util_format_format_args).
```js
const thundra = require("@thundra/core");
const logger = thundra.createLogger();

logger.trace("Hey, I %s things", "trace");
logger.debug("Someone is %s %d"," debugging", 2);
logger.info("Get some info","and more");
logger.warn("I am warning you %s", "!!!");
logger.error("Error Error Error...");
logger.fatal("FATALITY");
```

### 2. Using `log` method

Pass an object with `level` and `message` fields:
```js
const thundra = require("@thundra/core");
const logger = thundra.createLogger();

logger.log({
    level: "trace",
    message: "Hey, I am tracing."
});
```

You can also pass `level` as a string, this way you can use `printf`-like formatting:

```js
logger.log("trace", "Hey, I am %s", "tracing.");
```
`level` can be one of the following: `"trace"`, `"debug"`, `"info"`, `"warn"`, `"error"`, `"fatal"`

## Log Levels

In increasing precedence: **`trace`**, **`debug`**, **`info`**, **`warn`**, **`error`**, **`fatal`**.

You can set the log level by setting the environment variable `thundra_log_logLevel` to one of the following:
* `trace`
* `debug`
* `info`
* `warn`
* `error`
* `fatal`
* `none`

For instance, if `thundra_log_logLevel` is:
* `debug`, only `debug` and higher precedence logs will be reported.
* `none`, none of the logs will be reported.

## Warmup Support
You can cut down cold starts easily by deploying our lambda function [`thundra-lambda-warmup`](https://github.com/thundra-io/thundra-lambda-warmup).

Our agent handles warmup requests automatically so you don't need to make any code changes.

You just need to deploy `thundra-lambda-warmup` once, then you can enable warming up for your lambda by 
* setting its environment variable `thundra_agent_lambda_warmup_warmupAware` **true** OR
* adding its name to `thundra-lambda-warmup`'s environment variable `thundra_agent_lambda_warmup_function`.

Check out [this part](https://thundra.readme.io/docs/how-to-warmup) in our docs for more information.

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

## Changelog

Please see the [CHANGELOG](https://github.com/thundra-io/thundra-lambda-agent-nodejs/blob/master/CHANGELOG.md) file.
