# Thundra Node.js Agent

[![OpenTracing Badge](https://img.shields.io/badge/OpenTracing-enabled-blue.svg)](http://opentracing.io)
[![Coverage Status](https://coveralls.io/repos/github/thundra-io/thundra-agent-nodejs/badge.svg?branch=master)](https://coveralls.io/github/thundra-io/thundra-agent-nodejs?branch=master)
[![CircleCI](https://circleci.com/gh/thundra-io/thundra-agent-nodejs.svg?style=svg)](https://circleci.com/gh/thundra-io/thundra-agent-nodejs)

Trace your marvelous nodejs projects with async monitoring by [Thundra](https://start.thundra.io/)!

Check out [example projects](https://github.com/thundra-io/thundra-examples-lambda-nodejs) for a quick start and [Thundra docs](https://apm.docs.thundra.io) for more information.

## Contents

- [Thundra Node.js Agent](#thundra-nodejs-agent)
  - [Contents](#contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
      - [1. Most Useful Environment variables](#1-most-useful-environment-variables)
  - [Usage](#usage)
    - [Integration Options for Containers and VMs](#integration-options-for-containers-and-vms)
      - [Express](#express)
      - [Hapi](#hapi)
      - [Koa](#koa)
      - [Google PubSub](#google-pubsub)
    - [Integration Options for AWS Lambda](#integration-options-for-aws-lambda)
      - [Using Layers](#using-layers)
      - [Without Layers](#without-layers)
  - [Frameworks](#frameworks)
  - [Integrations](#integrations)
  - [Async Monitoring with Zero Overhead](#async-monitoring-with-zero-overhead)
  - [Log Support](#log-support)
    - [How to use Thundra loggers](#how-to-use-thundra-loggers)
      - [1. Using `trace`, `debug`, `info`, `warn`, `error`, `fatal` methods](#1-using-trace-debug-info-warn-error-fatal-methods)
      - [2. Using `log` method](#2-using-log-method)
    - [Log Levels](#log-levels)
  - [Warmup Support](#warmup-support)
  - [All Environment Variables](#all-environment-variables)
    - [Module initialization parameters](#module-initialization-parameters)
  - [How to build](#how-to-build)
  - [How to test](#how-to-test)
  - [Changelog](#changelog)
  
## Installation

```bash
npm install @thundra/core --save
```

## Configuration

You can configure Thundra using **environment variables** or **module initialization parameters**.

Environment variables have **higher precedence** over initialization parameters.

Check out the [configuration part](https://apm.docs.thundra.io/node.js/nodejs-configuration-options/agent-configurations) of our docs for more detailed information.

#### 1. Most Useful Environment variables

| Name                                   |  Type  |          Default Value          |
|:---------------------------------------|:------:|:-------------------------------:|
| THUNDRA_APIKEY                         | string |                -                |
| THUNDRA_AGENT_APPLICATION_NAME         | string |                -                |
| THUNDRA_AGENT_APPLICATION_STAGE        | string |                -                |
| THUNDRA_AGENT_TRACE_DISABLE            |  bool  |              false              |
| THUNDRA_AGENT_METRIC_DISABLE           |  bool  |              true               |
| THUNDRA_AGENT_LOG_DISABLE              |  bool  |              true               |
| THUNDRA_AGENT_TRACE_REQUEST_SKIP       |  bool  |              false              |
| THUNDRA_AGENT_TRACE_RESPONSE_SKIP      |  bool  |              false              |
| THUNDRA_AGENT_LAMBDA_TIMEOUT_MARGIN    | number |                -                |
| THUNDRA_AGENT_REPORT_REST_BASEURL      | string | https://collector.thundra.io/v1 |
| THUNDRA_AGENT_REPORT_CLOUDWATCH_ENABLE |  bool  |              false              |

## Usage

### Integration Options for Containers and VMs  

```shell
export THUNDRA_APIKEY=<YOUR-THUNDRA-API-KEY>
export THUNDRA_AGENT_APPLICATION_NAME=<YOUR-APP-NAME>
```

For `Dockerfile`, you just replace `export` with `ENV`.

For more information see the  [doc](https://apm.docs.thundra.io/node.js/integration-options-for-containers-and-vms)

#### Express

```js
const thundra = require("@thundra/core");
const express = require('express');

const app = express();

app.get('/', function (req,res) {
   res.send("Response")
});
app.listen(3000);
```

#### Hapi

```js
const thundra = require("@thundra/core");
const Hapi = require('@hapi/hapi');

thundra.init();

const startServer = async () => {
    const server = Hapi.server({
        ...
    });

    server.route([{
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'Response';
        }
    }]);
    
    await server.start();
}

startServer();
```

#### Koa

```js
const thundra = require("@thundra/core");
const Koa = require('koa');

thundra.init();
const app = new Koa();

app.use(async (ctx, next) => {
  await next();
  ctx.body = 'Hello Thundra!';
});
app.listen(3000)
```

#### Google Pubsub

##### Publish

```js
const { PubSub } = require('@google-cloud/pubsub');

const projectId = 'your_google_cloud_project_id';
const topicName = 'your_google_cloud_pubsub_topic';

const pubsub = new PubSub({ projectId });

/* 
* if topic allready exists 
* const topic = await pubsub.topic(topicName)
**/
const topic = await pubsub.createTopic(topicName);

const date = new Date().toString();
const dataBuffer = Buffer.from(JSON.stringify({date}));

const result = await topic.publishMessage({ data: dataBuffer });
```
##### Subscription

##### Asynchronous Pull

```js
const thundra = require("@thundra/core");
thundra.init();

const { PubSub, Subscription } = require('@google-cloud/pubsub');

const projectId = 'your_google_cloud_project_id';
const topicName = 'your_google_cloud_pubsub_topic';
const subscriptionName = 'your_google_cloud_pubsup_subscription_name';

const pubsub = new PubSub({ projectId });

(async() => {
    
    /* 
    * if subscription allready exists 
    * const subscription = pubsub.subscription(subscriptionName);
    **/
    const [subscription] = await pubsub.topic(topicName).createSubscription(subscriptionName);
    
    const messageHandler = message => {
      try {
        ...
        message.ack();
      } catch (err) {
        ...
        message.nack();
      }
    };
    
    subscription.on(`message`, messageHandler);
})().catch(error => console.log(error));
```

##### Synchronous Pull

```js
const { v1 } = require('@google-cloud/pubsub');

const subClient = new v1.SubscriberClient();

const projectId = 'your_google_cloud_project_id';
const subscriptionName = 'your_google_cloud_pubsup_subscription_name';

const formattedSubscription = subClient.subscriptionPath(
  projectId,
  subscriptionName
);

const request = {
  subscription: formattedSubscription,
  maxMessages: 10,
};

...

const result = await subClient.pull(request);
const [response] = result;

const ackIds = [];
for (const message of response.receivedMessages) {
  ...
  ackIds.push(message.ackId);
}

if (ackIds.length !== 0) {
  const ackRequest = {
    subscription: formattedSubscription,
    ackIds: ackIds,
  };

  await subClient.acknowledge(ackRequest);
}
...

```

### Integration Options for AWS Lambda

#### Using Layers

Integrating Thundra using AWS Lambda Layers is the recommended (and easier) way to get started with Thundra. For latest layer version(layer arn) and details of the integration see the [doc](https://apm.docs.thundra.io/node.js/nodejs-integration-options) 

#### Without Layers 

Just require this module, pass your api key to it and wrap your handler:

```js
const thundra = require("@thundra/core")({ apiKey: "<YOUR-THUNDRA-API-KEY>" });

exports.handler = thundra((event, context,callback) => {
    callback(null, "Hello Thundra!");
});
```

Thundra will monitor your AWS lambda function and report automatically!

`context.done`, `context.succeed` and `context.fail` are also supported:

```js
const thundra = require("@thundra/core")({ apiKey: "<YOUR-THUNDRA-API-KEY>" });

exports.handler = thundra((event, context) => {
    context.succeed("Hello Thundra!");
});
```

### NOTES

- In order to activate *AWS Step Functions* trace, `THUNDRA_AGENT_LAMBDA_AWS_STEPFUNCTIONS` environment variable should be set `true`.
- In order to activate *AWS AppSync* trace, `THUNDRA_AGENT_LAMBDA_AWS_APPSYNC` environment variable should be set `true`.
- For other integrations' configuration, please take a look environment variables table at the end.

## Frameworks

The following frameworks are supported by Thundra:

|Framework                               |Supported Version          |Auto-tracing Supported                               |
|----------------------------------------|---------------------------|-----------------------------------------------------|
|[AWS Lambda](#aws-lambda)               |All                        |<ul><li>- [x] </li></ul>                             |
|[Express](https://expressjs.com/)       |`>=3.0.0`                  |<ul><li>- [x] </li></ul>                             |
|[Hapi](https://hapi.dev/)               |`>=16.0.0`                 |<ul><li>- [✓] </li></ul>                             |
|[Koa](https://koajs.com/)               |`>=2.0.0`                   |<ul><li>- [✓] </li></ul>                             |

## Integrations

Thundra provides out-of-the-box instrumentation (tracing) for following libraries.

|Library                 |Supported Version          |
|------------------------|---------------------------|
|logging                 |Fully supported            |
|aws-sdk                 |`>=2.0.0`                  |
|elasticsearch           |`>=10.5.0`                 |
|http                    |Fully supported            |
|https                   |Fully supported            |
|http2                   |Fully supported            |
|ioredis                 |`>=2.0.0`                  |
|redis                   |`>=2.6.0`                  |
|mongodb                 |`>=1.0.0`                  |
|mysql                   |`>=2.0.0`                  |
|mysql2                  |`>=1.5.0`                  |
|pg                      |`>=6.0.0`                  |
|amqp 0.9.1              |`>=0.5.0`                  |
|@google-cloud/pubsub    |`>=1.2`                    |
|@google-cloud/bigquery  |`>=5.0`                    |

## Async Monitoring with Zero Overhead

By default, Thundra agent reports by making an HTTPS request. This adds an overhead to your lambda function.

Instead, you can [setup async monitoring](https://apm.docs.thundra.io/performance/zero-overhead-with-asynchronous-monitoring) in **2 minutes** and monitor your lambda functions with **zero overhead**!

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

### How to use Thundra loggers

You can log by two different ways.

#### 1. Using `trace`, `debug`, `info`, `warn`, `error`, `fatal` methods

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

#### 2. Using `log` method

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

### Log Levels

In increasing precedence: **`trace`**, **`debug`**, **`info`**, **`warn`**, **`error`**, **`fatal`**.

You can set the log level by setting the environment variable `THUNDRA_AGENT_LOG_LOGLEVEL` to one of the following:
* `trace`
* `debug`
* `info`
* `warn`
* `error`
* `fatal`
* `none`

For instance, if `THUNDRA_AGENT_LOG_LOGLEVEL` is:
* `debug`, only `debug` and higher precedence logs will be reported.
* `none`, none of the logs will be reported.

## Mask Sensitive Data

You can specify the keys to be masked in the trace by passing the key names 
(separated by comma (`,`) if there are multiple) through the `THUNDRA_AGENT_REPORT_MASKED_KEYS` environment variable.
Here, key names can be string for exact match or [regexp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) pattern.

For example, 
```
THUNDRA_AGENT_REPORT_MASKED_KEYS=password
```
masks all the keys/properties whose names **exactly** match to `password`.

As another example,
```
THUNDRA_AGENT_REPORT_MASKED_KEYS=/.*password.*/
```
masks all the keys/properties whose names **contain** (partially match) `password`.

If there are multiple key names or patterns you want to specify, you can separate them by comma (`,`).
```
THUNDRA_AGENT_REPORT_MASKED_KEYS=/.*password.*/,/.*secret.*/
```

By default, masked data is replaced with `*****`.
But if you want to remove the masked data completely, you can set `THUNDRA_AGENT_REPORT_HIDE` environment variable to `true`.

## Warmup Support

You can cut down cold starts easily by deploying our lambda function [`thundra-lambda-warmup`](https://github.com/thundra-io/thundra-lambda-warmup).

By default, Thundra agent doesn't recognize warmup requests by default, but you can enable it 
by setting `THUNDRA_AGENT_LAMBDA_WARMUP_WARMUPAWARE` environment variable to `true`

Check out [this part](https://apm.docs.thundra.io/performance/dealing-with-cold-starts) in our docs for more information.

## All Environment Variables

| Name                                                                |  Type  |          Default Value          | Description                                                                       |
|:--------------------------------------------------------------------|:------:|:-------------------------------:|:----------------------------------------------------------------------------------|
| THUNDRA_APIKEY                                                      | string |                -                |                                                                                   |
| THUNDRA_AGENT_DISABLE                                               |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_DEBUG_ENABLE                                          |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_DISABLE                                         |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_METRIC_DISABLE                                        |  bool  |              true               |                                                                                   |
| THUNDRA_AGENT_LOG_DISABLE                                           |  bool  |              true               |                                                                                   |
| THUNDRA_AGENT_REPORT_REST_BASEURL                                   | string | https://collector.thundra.io/v1 |                                                                                   |
| THUNDRA_AGENT_REPORT_REST_TRUSTALLCERTIFICATES                      |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_REPORT_REST_LOCAL                                     |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_REPORT_CLOUDWATCH_ENABLE                              |  bool  |              false              |                                                                                   | 
| THUNDRA_AGENT_REPORT_SIZE_MAX                                       | number |        32 * 1024 (32 KB)        |                                                                                   |
| THUNDRA_AGENT_REPORT_MASKED_KEYS                                    | string |                -                | Comma (,) separated key names (can be string or regexp) to be masked in the trace | 
| THUNDRA_AGENT_REPORT_HIDE                                           |  bool  |              false              | Hides masked keys instead of masking them                                         | 
| THUNDRA_AGENT_LAMBDA_HANDLER                                        | string |                -                |                                                                                   | 
| THUNDRA_AGENT_LAMBDA_WARMUP_WARMUPAWARE                             |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_TIMEOUT_MARGIN                                 | number |                -                |                                                                                   |
| THUNDRA_AGENT_LAMBDA_ERROR_STACKTRACE_MASK                          |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_REQUEST_SKIP                                    |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_RESPONSE_SKIP                                   |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE                   |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE                  |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE             |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_AWS_STEPFUNCTIONS                              |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_AWS_APPSYNC                                    |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_APPLICATION_ID                                        | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_INSTANCEID                                | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_REGION                                    | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_NAME                                      | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_STAGE                                     | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_DOMAINNAME                                | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_CLASSNAME                                 | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_VERSION                                   | string |                -                |                                                                                   |
| THUNDRA_AGENT_APPLICATION_TAG                                       |  any   |                -                |                                                                                   |
| THUNDRA_AGENT_INVOCATION_SAMPLE_ONERROR                             |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_INVOCATION_REQUEST_TAGS                               | string |                -                |                                                                                   |
| THUNDRA_AGENT_INVOCATION_RESPONSE_TAGS                              | string |                -                |                                                                                   |
| THUNDRA_AGENT_TRACE_INSTRUMENT_DISABLE                              |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INSTRUMENT_TRACEABLECONFIG                      | string |                -                |                                                                                   |
| THUNDRA_AGENT_TRACE_INSTRUMENT_FILE_PREFIX                          | string |                -                |                                                                                   |
| THUNDRA_AGENT_TRACE_SPAN_LISTENERCONFIG                             | string |                -                |                                                                                   |
| THUNDRA_AGENT_TRACE_SPAN_COUNT_MAX                                  | number |               200               |                                                                                   |
| THUNDRA_AGENT_SAMPLER_TIMEAWARE_TIMEFREQ                            | number |             300000              |                                                                                   |
| THUNDRA_AGENT_SAMPLER_COUNTAWARE_COUNTFREQ                          | number |               100               |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_DISABLE                            |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_INSTRUMENT_ONLOAD              |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_SNS_MESSAGE_MASK               |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_SNS_TRACEINJECTION_DISABLE     |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_SQS_MESSAGE_MASK               |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_SQS_TRACEINJECTION_DISABLE     |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_LAMBDA_PAYLOAD_MASK            |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_LAMBDA_TRACEINJECTION_DISABLE  |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_DYNAMODB_STATEMENT_MASK        |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_DYNAMODB_TRACEINJECTION_ENABLE |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_ATHENA_STATEMENT_MASK          |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_BODY_MASK                     |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_BODY_SIZE_MAX                 | number |        10 * 1024 (10 KB)        |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_HEADERS_MASK                  |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_RESPONSE_BODY_MASK            |  bool  |              true               |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_RESPONSE_BODY_SIZE_MAX        | number |        10 * 1024 (10 KB)        |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_RESPONSE_HEADERS_MASK         |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_URL_DEPTH                     | number |                1                |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_TRACEINJECTION_DISABLE        |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_ERROR_ON4XX_DISABLE           |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HTTP_ERROR_ON5XX_DISABLE           |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_REDIS_COMMAND_MASK                 |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_RDB_STATEMENT_MASK                 |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_RDB_RESULT_MASK                    |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_ELASTICSEARCH_BODY_MASK            |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_ELASTICSEARCH_PATH_DEPTH           | number |                1                |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_MONGODB_COMMAND_MASK               |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_EVENTBRIDGE_DETAIL_MASK        |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_SES_MAIL_MASK                  |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_AWS_SES_MAIL_DESTINATION_MASK      |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_RABBITMQ_MESSAGE_MASK              |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_GOOGLE_PUBSUB_MESSAGE_MASK         |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_GOOGLE_BIGQUERY_RESPONSE_SIZE_MAX  | number |         1 * 1024 (1 KB)         |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_GOOGLE_BIGQUERY_QUERY_MASK         |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_GOOGLE_BIGQUERY_RESPONSE_MASK      |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LOG_CONSOLE_DISABLE                                   |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LOG_LOGLEVEL                                          | string |              TRACE              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_ENABLE                                |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_PORT                                  | number |              1111               |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_LOGS_ENABLE                           |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_WAIT_MAX                              | number |              60000              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_IO_WAIT                               | number |              60000              |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_BROKER_PORT                           | number |               444               |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_BROKER_HOST                           | string |        debug.thundra.io         |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_SESSION_NAME                          | string |             default             |                                                                                   |
| THUNDRA_AGENT_LAMBDA_DEBUGGER_AUTH_TOKEN                            | string |                -                |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_HAPI_DISABLE                       |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_KOA_DISABLE                        |  bool  |              false              |                                                                                   |
| THUNDRA_AGENT_TRACE_INTEGRATIONS_GOOGLE_PUBSUB_DISABLE              |  bool  |              false              |                                                                                   |

### Module initialization parameters

| Name           | Type   | Default Value |
|:---------------|:------:|:-------------:|
| apiKey         | string |       -       |
| disableThundra |  bool  |     false     |
| plugins        |  array |      [ ]      |

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

Please see the [CHANGELOG](https://github.com/thundra-io/thundra-agent-nodejs/blob/master/CHANGELOG.md) file.
