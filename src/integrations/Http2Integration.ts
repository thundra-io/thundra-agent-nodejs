import Integration from './Integration';
import * as opentracing from 'opentracing';
import {
    HttpTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    ClassNames,
    TriggerHeaderTags,
    MAX_HTTP_VALUE_SIZE, INTEGRATIONS,
} from '../Constants';
import Utils from '../utils/Utils';
import ModuleUtils from '../utils/ModuleUtils';
import * as url from 'url';
import ThundraLogger from '../ThundraLogger';
import HttpError from '../error/HttpError';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

import HTTPUtils from '../utils/HTTPUtils';

const shimmer = require('shimmer');
const has = require('lodash.has');

const MODULE_NAME_HTTP2 = 'http2';
const INTEGRATION_NAME = 'http2';

/**
 * {@link Integration} implementation for HTTP2 integration
 * through {@code http2} module
 */
class Http2Integration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<HTTP2Integration> Activating HTTP2 integration');

        this.config = config || {};
        const http2Integration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            http2Integration.moduleNames, http2Integration.moduleVersion,
            (lib: any, cfg: any, moduleName: string) => {
                this.wrap.call(this, lib, cfg, moduleName);
            },
            (lib: any, cfg: any, moduleName: string) => {
                this.doUnwrap.call(this, lib, moduleName);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
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

                    const requestUrl = new url.URL(authority);

                    const host = authority ? requestUrl.hostname : 'localhost';

                    const path = (headers[':path'] && headers[':path'] !== '/')
                        ? headers[':path'] : (requestUrl.pathname ? requestUrl.pathname : '/');

                    const fullURL = host + path;
                    const queryParams = requestUrl.search || '';

                    if (!HTTPUtils.isValidUrl(host)) {
                        ThundraLogger.debug(
                            `<HTTP2Integration> Skipped tracing request as target host is blacklisted: ${host}`);
                        return request.apply(this, [headers, options]);
                    }

                    const parentSpan = tracer.getActiveSpan();
                    const operationName = host + Utils.getNormalizedPath(path, config.httpPathDepth);

                    ThundraLogger.debug(`<HTTP2Integration> Starting HTTP2 span with name ${operationName}`);

                    span = tracer._startSpan(operationName, {
                        childOf: parentSpan,
                        domainName: DomainNames.API,
                        className: ClassNames.HTTP,
                        disableActiveStart: true,
                    });

                    if (!config.httpTraceInjectionDisabled) {
                        const tempHeaders = headers ? headers : {};
                        tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, tempHeaders);
                        tempHeaders[TriggerHeaderTags.RESOURCE_NAME] = operationName;
                        headers = tempHeaders;
                    }

                    span.addTags({
                        [SpanTags.OPERATION_TYPE]: method,
                        [SpanTags.SPAN_TYPE]: SpanTypes.HTTP,
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

                    const clientRequest = request.apply(this, [headers, options]);

                    const chunks: any = [];
                    let responseHeaders: any;

                    clientRequest.once('data', (chunk: any) => {
                        if (config.maskHttpBody || !chunk) {
                            return;
                        }

                        const totalSize = chunks.reduce((total: any, item: any) => item.length + total, 0);
                        if (totalSize + chunk.length <= MAX_HTTP_VALUE_SIZE) {
                            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                        }
                    });

                    clientRequest.once('response', (res: any) => {
                        responseHeaders = HTTPUtils.extractHeaders(res);

                        ThundraLogger.debug(`<HTTP2Integration> On response of HTTP2 span with name ${operationName}`);
                    });

                    clientRequest.once('end', () => {

                        if (span) {

                            let payload;
                            if (chunks && chunks.length) {
                                try {
                                    payload = JSON.parse(chunks);
                                } catch (error) {
                                    ThundraLogger.debug('<HTTP2Integration> Response is not valid JSON:', payload);
                                    payload = chunks.toString();
                                }
                            }

                            HTTPUtils.fillOperationAndClassNameToSpan(span, responseHeaders);

                            const statusCode = responseHeaders[':status'] || 200;
                            if (!config.disableHttp5xxError && `${statusCode}`.startsWith('5')) {
                                span.setErrorTag(new HttpError(statusCode));
                            }

                            if (!config.disableHttp4xxError && `${statusCode}`.startsWith('4')) {
                                span.setErrorTag(new HttpError(statusCode));
                            }

                            span.setTag(HttpTags.HTTP_STATUS, statusCode);

                            if (!config.maskHttpBody && payload) {
                                try {

                                    span.setTag(HttpTags.BODY, payload);
                                } catch (error) {
                                    ThundraLogger.error(
                                        `<HTTP2Integration> Unable to get body of HTTP2 span with name ${operationName}:`,
                                        error);
                                }
                            }

                            ThundraLogger.debug(`<HTTP2Integration> Closing HTTP2 span with name ${operationName}`);
                            span.close();
                        }
                    });

                    clientRequest.once('error', (error: any) => {
                        if (span) {
                            span.setErrorTag(error);
                        }

                        if (clientRequest.listenerCount('error') === 0) {
                            ThundraLogger.error('<HTTP2Integration> No error listener, we should explode:', error);
                        }
                    });

                    return clientRequest;

                } catch (error) {
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
            };
        };

        const wrapHttp2Connect = (connectFunction: any) => {
            return (authority: any, options: any, listener: any) => {
                const clientSession = connectFunction.apply(this, [authority, options, listener]);

                try {
                    shimmer.wrap(clientSession, 'request', (wrappedFunction: any) => http2Wrapper(wrappedFunction, authority));
                    ThundraLogger.debug('<HTTP2Integration> Wrapping "clientSession.request"');
                } catch (error) {
                    ThundraLogger.error('<HTTP2Integration> Error occurred while wrapping HTTP2 request:', error);
                }

                return clientSession;
            };
        };

        if (moduleName === MODULE_NAME_HTTP2) {
            shimmer.wrap(lib, 'connect', wrapHttp2Connect);
            ThundraLogger.debug('<HTTP2Integration> Wrapping "http2.connect"');
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     * @param moduleName the moduleName
     */
    doUnwrap(lib: any, moduleName: string) {
        ThundraLogger.debug('<HTTP2Integration> Do unwrap');

        if (moduleName === MODULE_NAME_HTTP2) {
            if (has(lib, 'connect')) {
                ThundraLogger.debug('<HTTP2Integration> Unwrapping "http2.connect"');
                shimmer.unwrap(lib, 'connect');
            }
        }
    }

    /**
     * @inheritDoc
     */
    unwrap(): void {
        ThundraLogger.debug('<HTTP2Integration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default Http2Integration;
