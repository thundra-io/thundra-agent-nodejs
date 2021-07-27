import { THUNDRA_COLLECTOR_ENDPOINT_PATTERNS } from '../Constants';

class HTTPUtils {

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

    static extractHeaders = (headers: any) => {
        return Object.entries(headers)
            .reduce((obj: any, header: any) => {
                const [key, value] = header;
                obj[key] = value;
                return obj;
            }, {});
    }
}

export default HTTPUtils;
