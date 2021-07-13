import Integration from './Integration';
import * as opentracing from 'opentracing';
import { HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames, TriggerHeaderTags } from '../Constants';
import Utils from '../utils/Utils';
import ModuleUtils from '../utils/ModuleUtils';
import * as url from 'url';
import ThundraLogger from '../ThundraLogger';
import HttpError from '../error/HttpError';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');
const semver = require('semver');

const thundraCollectorEndpointPattern1 = /^api[-\w]*\.thundra\.io$/;
const thundraCollectorEndpointPattern2 = /^([\w-]+\.)?collector\.thundra\.io$/;

const MODULE_NAME_HTTP2 = 'http2';

class Http2Integration implements Integration {
    
    config: any;
    private instrumentContext: any;
    
    constructor(config: any) {
        ThundraLogger.debug('<HTTP2Integration> Activating HTTP2 integration');
        
        this.config = config || {};
        this.instrumentContext = ModuleUtils.instrument(
            [MODULE_NAME_HTTP2], null,
            (lib: any, cfg: any, moduleName: string) => {
                this.wrap.call(this, lib, cfg, moduleName);
            },
            (lib: any, cfg: any, moduleName: string) => {
                this.doUnwrap.call(this, lib, moduleName);
            },
            this.config);
    }

    static isValidUrl(host: string): boolean {
        if (host.indexOf('amazonaws.com') !== -1) {
            if (host.indexOf('.execute-api.') !== -1
                || host.indexOf('.elb.') !== -1) {
                return true;
            }

            return false;
        }

        if (thundraCollectorEndpointPattern1.test(host) ||
            thundraCollectorEndpointPattern2.test(host) ||
            host === 'serverless.com' ||
            host.indexOf('amazonaws.com') !== -1) {
            return false;
        }

        return true;
    }

    static extractHeaders = (headers: any) => {
        return Object.entries(headers)
            //  disable this filter for :status header 
            // .filter(header => !header[0].startsWith(':')) // Filter out keys that start with ':'
            .reduce((obj: any, header: any) => { 
                const [key, value] = header;
                obj[key] = value; 
                return obj;
            }, {});
    }

    wrap(lib: any, config: any, moduleName: string): void {
        ThundraLogger.debug('<HTTP2Integration> Wrap');

        const http2Wrapper = (request: any, authority: any) => {
            return function (headers: any, options: any) {

                let span: ThundraSpan;

                try {

                    ThundraLogger.debug('<HTTP2Integration> Tracing HTTP2 request:', headers);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<HTTP2Integration> Skipped tracing request as no tracer is available');
                        return request.apply(this, [headers, options]);
                    }

                    const method = (headers[':method'] || 'GET').toUpperCase();
                    headers = typeof headers === 'string' ? url.parse(headers) : headers;
                    const host = authority || 'localhost';
                    let path = headers[':path'] || '/';
                    const fullURL = host + path;
                    const splittedPath = path.split('?');
                    const queryParams = splittedPath.length > 1 ? splittedPath[1] : '';

                    // todo: will be add to span tags ?
                    // const requesyHeaders = Http2Integration.extractHeaders(options);

                    path = splittedPath[0];

                    if (!Http2Integration.isValidUrl(host)) {
                        ThundraLogger.debug(
                            `<HTTP2Integration> Skipped tracing request as target host is blacklisted: ${host}`);
                        return request.apply(this, [headers, options]);
                    }

                    const parentSpan = tracer.getActiveSpan();
                    const operationName = host + Utils.getNormalizedPath(path, config.httpPathDepth);

                    ThundraLogger.debug(`<HTTP2Integration> Starting HTTP span with name ${operationName}`);

                    span = tracer._startSpan(operationName, {
                        childOf: parentSpan,
                        domainName: DomainNames.API,
                        className: ClassNames.HTTP2,
                        disableActiveStart: true,
                    });

                    // todo: should be verify x-thundra-resource-name 
                    if (!config.httpTraceInjectionDisabled) {
                        const tempHeaders = headers ? headers : {};
                        tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, tempHeaders);
                        tempHeaders[TriggerHeaderTags.RESOURCE_NAME] = operationName;
                        headers = tempHeaders;
                    }
                    
                    span.addTags({
                        [SpanTags.OPERATION_TYPE]: method,
                        [SpanTags.SPAN_TYPE]: SpanTypes.HTTP2,
                        [HttpTags.HTTP_METHOD]: method,
                        [HttpTags.HTTP_HOST]: host,
                        [HttpTags.HTTP_PATH]: path,
                        [HttpTags.HTTP_URL]: fullURL,
                        [HttpTags.QUERY_PARAMS]: queryParams,
                        [SpanTags.TRACE_LINKS]: [span.spanContext.spanId],
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                    });

                    const me = this;

                    span._initialized();

                    let clientRequest = request.apply(this, [headers, options]);

                    const chunks: any = [];
                    let responseHeaders: any;

                    clientRequest.once('data', (chunk: any) => {
                        if (!chunk) {
                            return;
                        }

                        const totalSize = chunks.reduce((total: any, item: any) => item.length + total, 0);
                        if (totalSize + chunk.length <= 10 * 1024) {
                            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                        }
                    });

                    clientRequest.once('response', (res: any) => {
                        responseHeaders = Http2Integration.extractHeaders(res); 

                        ThundraLogger.debug(`<HTTP2Integration> On response of HTTP span with name ${operationName}`);
                    });

                    clientRequest.once('end', () => {
                        const payload = JSON.parse(chunks);
       
                        if (span) {
                            const statusCode = responseHeaders[':status'] || 200;
                            if (!config.disableHttp5xxError && `${statusCode}`.startsWith('5')) {
                                span.setErrorTag(new HttpError(statusCode));
                            }
                            if (!config.disableHttp4xxError && `${statusCode}`.startsWith('4')) {
                                span.setErrorTag(new HttpError(statusCode));
                            }

                            span.setTag(HttpTags.HTTP_STATUS, statusCode);

                            ThundraLogger.debug(`<HTTP2Integration> Closing HTTP2 span with name ${operationName}`);
                            span.closeWithCallback(me, options, [{}, payload]);
                        }                 
                    });

                    // todo: compare end & close events for choose usage
                    // clientRequest.once('close', (data: any) => {    
                    //  ....
                    //  clientRequest.close();        
                    // });

                    return clientRequest;

                }catch (error) {
                    ThundraLogger.error('<HTTP2Integration> Error occurred while tracing HTTP2 request:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<HTTP2Integration> Because of error, closing HTTP2 span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return request.apply(this, [headers, options]);
                    }
                }
            }
        }

        const wrapHttp2Connect = (connectFunction: any) => {
            return (authority: any, options: any, listener: any) => {
                const clientSession = connectFunction.apply(this, [authority, options, listener]);

                try {
                    shimmer.wrap(clientSession, 'request', (wrappedFunction: any) => http2Wrapper(wrappedFunction, authority));
                } catch (error) {
                    ThundraLogger.error('<HTTP2Integration> Error occurred while wrapping HTTP2 request:', error);
                }

                return clientSession;
            };
        }

        if (moduleName === MODULE_NAME_HTTP2){
            shimmer.wrap(lib, 'connect', wrapHttp2Connect);      
        }
    }

    doUnwrap(lib: any, moduleName: string) {
        ThundraLogger.debug('<HTTP2Integration> Do unwrap');

        const nodeVersion = process.version;

        if (moduleName === MODULE_NAME_HTTP2) {
            if (has(lib, 'request')) {
                ThundraLogger.debug('<HTTP2Integration> Unwrapping "http.request"');
                shimmer.unwrap(lib, 'request');

                // todo: ask, why we are use this ?
                if (semver.satisfies(nodeVersion, '>=8') && has(lib, 'get')) {
                    ThundraLogger.debug('<HTTP2Integration> Unwrapping "http.get"');
                    shimmer.unwrap(lib, 'get');
                }
            }
        } 
    }

    unwrap(): void {
        ThundraLogger.debug('<HTTP2Integration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default Http2Integration;
