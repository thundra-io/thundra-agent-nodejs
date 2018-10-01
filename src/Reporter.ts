import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { URL, MONITORING_DATA_PATH, envVariableKeys } from './Constants';
import Utils from './plugins/Utils';
import ThundraLogger from './ThundraLogger';

const httpAgent = new http.Agent({
    keepAlive: true,
});
const httpsAgent = new https.Agent({
    maxCachedSessions: 1,
    keepAlive: true,
});

class Reporter {

    private reports: any[];
    private apiKey: string;
    private useHttps: boolean;
    private requestOptions: http.RequestOptions;

    constructor(apiKey: string, u?: url.URL) {
        this.reports = [];
        this.apiKey = apiKey;
        this.useHttps = (u ? u.protocol : URL.protocol) === 'https:';
        this.requestOptions = this.createRequestOptions();
    }

    createRequestOptions(u?: url.URL): http.RequestOptions {
        return {
            method: 'POST',
            hostname: u ? u.hostname : URL.hostname,
            path: (u ? u.pathname : URL.pathname) + MONITORING_DATA_PATH,
            port: parseInt(u ? u.port : URL.port, 0),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'ApiKey ' + this.apiKey,
            },
            agent: this.useHttps ? httpsAgent : httpAgent,
            createConnection: (options: http.ClientRequestArgs, oncreate: (err: Error, socket: net.Socket) => void) => {
                try {
                    const socket: net.Socket = net.createConnection(options.port as number, options.hostname);
                    socket.setNoDelay(true);
                    socket.setKeepAlive(true);
                    oncreate(null, socket);
                    return socket;
                } catch (e) {
                    oncreate(e, null);
                    throw e;
                }
            },
        };
    }

    addReport(report: any): void {
        if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_REPORT_CLOUDWATCH_ENABLE) === 'true') {
            const jsonStringReport = '\n' + JSON.stringify(report).replace(/\r?\n|\r/g, '') + '\n';
            process.stdout.write(jsonStringReport);
        } else {
            this.reports = [...this.reports, report];
        }
    }

    async sendReports(): Promise<void> {
        await this.request()
            .then((response: any) => {
                if (response.status !== 200) {
                    ThundraLogger.getInstance().debug(this.reports);
                }
            })
            .catch((err: any) => {
                ThundraLogger.getInstance().error(err);
            });
    }

    request(): Promise<any> {
        return new Promise((resolve, reject) => {
            let request: http.ClientRequest;
            const responseHandler = (response: http.IncomingMessage) => {
                let responseData = '';
                response.on('data', (chunk: Buffer | string) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    resolve({ status: response.statusCode, data: responseData });
                });
            };

            this.useHttps
                ? request = https.request(this.requestOptions, responseHandler)
                : request = http.request(this.requestOptions, responseHandler);

            request.on('error', (error: any) => {
                reject(error);
            });
            request.write(JSON.stringify(this.reports));
            request.end();
        });
    }

}

export default Reporter;
