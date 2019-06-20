# Changelog
All notable changes to this project will be documented in this file.

## 2.4.1 - May 29, 2019
#### Added
- MongoDB integration
- New and improved sampling api
- Mask error stack traces
#### Fixed
- Fixed https://github.com/thundra-io/thundra-lambda-agent-nodejs/issues/54
- Fixed https://github.com/thundra-io/thundra-lambda-agent-nodejs/issues/52 
- Fixed `Log Level filtering does not work with console.log integration`
- Fixed `Send data of SNS, SQS, Lambda and HTTP operations with masking capability`
- Fixed `Don't send Kinesis, Firehose and CloudWatch log event data`
- Fixed  `Nodejs agent composite data model support over CW logs`
- Fixed  `error.message tag must be string type`
- Fixed  `Do not send trace data with trace plugin`
- Fixed  `Use generated transaction id instead of request id`
- Fixed  `Introduce `ThundraChaosError` propagate it correctly with AWS SDK`

## 2.3.0 - April 25, 2019
#### Added
- Distributed tracing support

## 2.2.3 - March 19, 2019
#### Added
- Ability to apply custom span sampler to all spans
#### Fixed
- Agent version is set to wrong value
- Wrapped context does not override callbackWaitsForEmptyEventLoop correctly

## 2.2.1 - March 13, 2019
#### Added
- Ability to mask db statements in integrations
- Send resource infromation in invocation data
- Composite data model and batch reporting support
#### Fixed
- Elasticsearch fix getting host when multiple host is configured
- Root span and invocation duration are compatible

## 2.2.0 - March 6, 2019
#### Added
- Implement `ErrorInjectorSpanListener`,  `FilteringSpanListener` and `LatencyInjectorSpanListener`
- Implement ES and MySQL V1 integrations
- Implement sampling only Timed  out Invocations
#### Fixed
- Fixes #47 
- Use InvocationSupport to pass functionName to Integrations
- Fix lambda timing out when used with https://www.npmjs.com/package/serverless-mysql

## 2.0.9 - February 13, 2019
- Trace HTTPS calls
- Bug fix in in TraceConfig programmatic config

## 2.0.8 - January 30, 2019
- Bug fixes in AWS Integrations
- Enable default sampling for Metric Plugin

## 2.0.7 - December 20, 2018
- Integrated Thundra Log Plugin with NodeJS console
- Warmup plugin is disabled by default
- Added trigger tags for AWS Event
- Implemented trace propagation with opentracing

## 2.0.6 - November 27, 2018
#### Added
- Aws XRay Integration
- Tag support
- Sampling support
#### Fixed
- Add missing tags data to integrations for better ui integration

## 2.0.5 - November 6, 2018
#### Added
- Enable integrations by default
#### Fixed
- Propagated span from trace entry to exit through entry data

## 2.0.4 - October 26, 2018
#### Fixed
- Cleanup LogManager after each invocation
## 2.0.3 - October 24, 2018
#### Fixed
- AWS and HTTP integrations spans were not closed correctly fixed now. Removed HTTPS integration, it is not needed `https` module is using `http` underneath.

## 2.0.2 - October 23, 2018
#### Fixed
- Enable log plugin to be used before initialising Thundra Agent
## 2.0.1 - October 22, 2018
#### Added
- Migration to new data model 
- Async support
- Region adaptable timeout margin
- Enable `keepAlive` in http connections
- Automatic instrumentation integrations with `pg`, `mysql`, `redis`, `aws`
- Enable debug mode with environment variables

#### Fixed
- Fix errors when running with serverless offline plugin

## 1.6.0 - August 16, 2018
#### Added
- Manual instrumentation support with OpenTracing API
- Automatic instrumentation support
- Mask trace of request and response of Lambda Invocation
#### Fixed
- Fix crash if env variable `process.env.AWS_LAMBDA_LOG_STREAM_NAME ` not set

## 1.5.4 - July 23, 2018
#### Added
- `timeout` field is added to trace properites

## 1.5.3 - July 13, 2018
#### Added
- `functionARN`,`logGroupName`,`logStreamName`,`requestId` fields are added to trace properites
#### Fixed
- Trace data should show response if error type is HTTP error

## 1.5.2 - July 11, 2018
#### Added
- Timeout detection support
- Parse Lambda Proxy Integration response for error detection for 5xx and 4xx responses

## 1.5.0 - May 18, 2018
#### Added
- Disable request/response via environment variables
- Invocation plugin and data type
#### Fixed
- Response is set wrong when there is an error

## 1.4.1 - May 10, 2018
#### Fixed
- A bug related to wrong usage of Node's URL module

## 1.4.0 - May 10, 2018
#### Added
- URL configuration via `thundra_lambda_publish_rest_baseUrl` environment variable

## 1.3.1 - April 17, 2018
#### Added
- Timestamp support

## 1.3.0 - April 13, 2018
#### Added
- Warmup support

## 1.2.0 - April 3, 2018
#### Added
- Log plugin support

## 1.1.2 - March 23, 2018
#### Changed
- `thundra_lambda_publish_cloudwatch_enable` environment variable check

## 1.1.1 - March 23, 2018
#### Fixed
- `thundra_lambda_publish_cloudwatch_enable` environment variable check

## 1.1.0 - March 23, 2018
#### Added
- Metric support

## 1.0.1 - March 14, 2018
#### Added
- Support for passing API key as an environment variable

## 1.0.0 - March 13, 2018
#### Added
- Initial agent with tracing support



