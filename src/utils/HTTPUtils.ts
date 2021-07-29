import {
    THUNDRA_COLLECTOR_ENDPOINT_PATTERNS,
    ClassNames,
    TraceHeaderTags,
    TriggerHeaderTags,
} from '../Constants';

/**
 * Utility class for HTTP instrument related stuff
 */
class HTTPUtils {

    private constructor() {
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
                || host.indexOf('.elb.') !== -1) {
                return true;
            }

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
        if (headers && headers[TraceHeaderTags.TRACE_ID]) {
            return true;
        }

        return false;
    }

    /**
     * Extract headers and create key, value object
     * @param {any} headers headers
     * @return header object
     */
    static extractHeaders = (headers: any) => {
        return Object.entries(headers)
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
    ) => {
        if (span && headers) {
            if ('x-amzn-requestid' in headers) {
                span._setClassName(ClassNames.APIGATEWAY);
            }

            if (TriggerHeaderTags.RESOURCE_NAME in headers) {
                const resourceName: string = headers[TriggerHeaderTags.RESOURCE_NAME];
                span._setOperationName(resourceName);
            }
        }
    }
}

export default HTTPUtils;
