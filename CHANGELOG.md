# Changelog
All notable changes to this project will be documented in this file.
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



