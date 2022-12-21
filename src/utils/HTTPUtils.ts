import ConfigNames from '../config/ConfigNames';
import ConfigProvider from '../config/ConfigProvider';
import {
    THUNDRA_COLLECTOR_ENDPOINT_PATTERNS,
    TESTCONTAINERS_HTTP_PATH_PATTERNS,
    GOOGLE_CLOUD_HTTP_PATTERNS,
    ClassNames,
    TraceHeaderTags,
    TriggerHeaderTags,
    AlreadyTracedHeader,
} from '../Constants';

import http from 'http';

/**
 * Utility class for HTTP instrument related stuff
 */
class HTTPUtils {

    private constructor() {
    }

    static isTestContainersRequest(options: any, host: string): boolean {

        if (!options || !host) {
            return false;
        }

        const {
            path,
            socketPath,
        } = options;

        if (!path || !socketPath) {
            return false;
        }

        if (host !== 'localhost'
            || socketPath !== '/var/run/docker.sock') {
            return false;
        }

        if (TESTCONTAINERS_HTTP_PATH_PATTERNS.PATTERN1.test(path)
            || TESTCONTAINERS_HTTP_PATH_PATTERNS.PATTERN2.test(path)
            || TESTCONTAINERS_HTTP_PATH_PATTERNS.PATTERN3.test(path)
            || TESTCONTAINERS_HTTP_PATH_PATTERNS.PATTERN4.test(path)
        ) {
            return true;
        }

        return false;
    }

    /**
     * Check valid state of passed host url
     * @param {string} host host
     * @return {boolean} {@code true} if the host is valid to be traced,
     *                   {@code false} otherwise
     */
    static isValidUrl(host: string): boolean {
        if (host.indexOf('amazonaws.com') !== -1) {
            if (host.indexOf('.execute-api.') !== -1
                || host.indexOf('.elb.') !== -1
                || host.indexOf('.lambda-url.') !== -1) {
                return true;
            }

            return false;
        }

        if (GOOGLE_CLOUD_HTTP_PATTERNS.PATTERN1.test(host) ||
            GOOGLE_CLOUD_HTTP_PATTERNS.PATTERN2.test(host)) {
            return false;
        }

        if (THUNDRA_COLLECTOR_ENDPOINT_PATTERNS.PATTERN1.test(host) ||
            THUNDRA_COLLECTOR_ENDPOINT_PATTERNS.PATTERN2.test(host) ||
            host === 'serverless.com' ||
            host.indexOf('amazonaws.com') !== -1) {
            return false;
        }

        return true;
    }

    /**
     * Check whether or not the request was already traced
     * @param {any} headers headers
     * @return {boolean} {@code true} if the request was already traced,
     *                   {@code false} otherwise
     */
    static wasAlreadyTraced(headers: any): boolean {
        if (!headers) {
            return false;
        }

        let result = false;
        if (headers[TraceHeaderTags.TRACE_ID]) {
            result = true;
        } else if (headers[AlreadyTracedHeader]) {
            delete headers[AlreadyTracedHeader];
            result = true;
        }

        return result;
    }

    /**
     * Extract headers and create key, value object
     * @param {any} headers headers
     * @return header object
     */
    static extractHeaders = (headers: any) => {
        return Object.entries(headers)
            .filter(([key]) => !key.startsWith('x-thundra'))
            .reduce((obj: any, header: any) => {
                const [key, value] = header;
                obj[key] = value;
                return obj;
            }, {});
    }

    /**
     * Fill span class name and operation name fields
     * @param {any} span span
     * @param {any} headers headers
     */
    static fillOperationAndClassNameToSpan = (
        span: any,
        headers: any,
        host: string,
    ) => {
        if (span && headers) {
            if ('x-amzn-requestid' in headers
                && host.indexOf('.execute-api.') !== -1) {
                span._setClassName(ClassNames.APIGATEWAY);
            }

            if (TriggerHeaderTags.RESOURCE_NAME in headers) {
                const resourceName: string = headers[TriggerHeaderTags.RESOURCE_NAME];
                span._setOperationName(resourceName);
            }
        }
    }

    static isErrorFreeStatusCode(statusCode: number): boolean {
        let result = false;

        const ignoredStatusCodesStr =
            ConfigProvider.get<string>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_IGNORED_STATUS_CODES);

        if (ignoredStatusCodesStr) {
            const ignoredStatusCodes = ignoredStatusCodesStr.replace(/\s/g, '').split(',');

            if (ignoredStatusCodes && ignoredStatusCodes.includes(`${statusCode}`)) {
                result = true;
            }
        }

        return result;
    }

    static parseArgs(a: any, b: any, c: any) {
        let url = a;
        let options = b;
        let callback = c;

        // handling case of got.post(url, options)
        if (a.constructor && a.constructor.name === 'URL' && typeof b === 'object' && !c) {
            url = a;
            url.path = url.pathname;
            options = b;
            callback = undefined;

            return { url, options, callback };
        }

        // Check whether first arg is URL
        if (['string', 'URL'].includes(typeof a)) {
          if (typeof b === 'object' && !c) {
            // handling case of "request(url, options)"
            options = b;
            callback = undefined;
          } else if (typeof b === 'function' && !c) {
            // handling case of "request(url, callback)"
            options = undefined;
            callback = b;
          }
        } else if (typeof a === 'object' && typeof b === 'function' && !c) {
            // handling case of "request(options, callback)"
            url = undefined;
            options = a;
            callback = b;
        }

        return { url, options, callback };
    }

    static buildParams(url: any, options: any, callback: any) {
        if (url && options) {
            // in case of both input and options returning all three
            return [url, options, callback];
        }
        if (url && !options) {
            // in case of missing options returning only url and callback
            return [url, callback];
        }
        // url is missing - returning options and callback
        return [options, callback];
    }

    static obtainIncomingMessageEncoding(incomingMessage: http.IncomingMessage): string {
        if (!incomingMessage || !incomingMessage.headers || !incomingMessage.rawHeaders) {
            return;
        }

        let contentEncoding = incomingMessage.headers 
            && (incomingMessage.headers['content-encoding']);
        if (!contentEncoding) {
            const encodingIndex = incomingMessage.rawHeaders.indexOf('Content-Encoding');
            const candidateIndex = encodingIndex + 1;
            if (encodingIndex && candidateIndex < incomingMessage.rawHeaders.length) {
                contentEncoding = incomingMessage.rawHeaders[candidateIndex];
            }
        }

        return contentEncoding;
    }
}

export default HTTPUtils;
