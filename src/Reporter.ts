import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import {COMPOSITE_MONITORING_DATA_PATH, getDefaultCollectorEndpoint} from './Constants';
import Utils from './utils/Utils';
import ThundraLogger from './ThundraLogger';
import BaseMonitoringData from './plugins/data/base/BaseMonitoringData';
import MonitoringDataType from './plugins/data/base/MonitoringDataType';
import ConfigNames from './config/ConfigNames';
import ConfigProvider from './config/ConfigProvider';

const httpAgent = new http.Agent({
    keepAlive: true,
});
const httpsAgent = new https.Agent({
    maxCachedSessions: 1,
    keepAlive: true,
});

/**
 * Reports given telemetry data to given/configured Thundra collector endpoint
 */
class Reporter {

    private readonly MAX_MONITOR_DATA_BATCH_SIZE: number = 100;

    private useHttps: boolean;
    private requestOptions: http.RequestOptions;
    private latestReportingLimitedMinute: number;
    private URL: url.UrlWithStringQuery;
    private apiKey: string;

    constructor(apiKey: string, u?: url.URL) {
        this.URL = url.parse(ConfigProvider.get<string>(
            ConfigNames.THUNDRA_REPORT_REST_BASEURL,
            'https://' + getDefaultCollectorEndpoint() + '/v1'));
        this.apiKey = apiKey;
        this.useHttps = (u ? u.protocol : this.URL.protocol) === 'https:';
        this.requestOptions = this.createRequestOptions();
        this.latestReportingLimitedMinute = -1;
    }

    /**
     * Reports given data
     * @param reports data to be reported
     * @return {Promise} the promise to track the result of reporting
     */
    sendReports(reports: any[]): Promise<void> {
        let batchedReports: any = [];
        try {
            batchedReports = this.getCompositeBatchedReports(reports);
        } catch (err) {
            ThundraLogger.error(`Cannot create batch request will send no report. ${err}`);
        }

        return new Promise<void>((resolve, reject) => {
            this.sendBatchedReports(batchedReports)
                .then(() => {
                    resolve();
                })
                .catch((err: any) => {
                    if (err.code === 'ECONNRESET') {
                        ThundraLogger.debug('Connection reset by server. Will send monitoring data again.');
                        this.sendBatchedReports(batchedReports)
                            .then(() => {
                                resolve();
                            })
                            .catch((err2: any) => {
                                reject(err2);
                            });
                    } else {
                        ThundraLogger.error(err);
                        reject(err);
                    }
                });
        });
    }

    private createRequestOptions(u?: url.URL): http.RequestOptions {
        const path = COMPOSITE_MONITORING_DATA_PATH;

        return {
            method: 'POST',
            hostname: u ? u.hostname : this.URL.hostname,
            path: (u ? u.pathname : this.URL.pathname) + path,
            port: parseInt(u ? u.port : this.URL.port, 0),
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

    private getCompositeBatchedReports(reports: any[]): any[] {
        reports = reports.slice(0);

        const batchedReports: any[] = [];
        const batchCount = Math.ceil(reports.length / this.MAX_MONITOR_DATA_BATCH_SIZE);
        const invocationReport = reports.filter((report) => report.data.type === MonitoringDataType.INVOCATION)[0];
        if (!invocationReport) {
            return [];
        }
        const initialCompositeData = Utils.initCompositeMonitoringData(invocationReport.data);

        for (let i = 0; i < batchCount; i++) {
            const compositeData = Utils.initCompositeMonitoringData(initialCompositeData);
            const batch: any[] = [];
            for (let j = 1; j < this.MAX_MONITOR_DATA_BATCH_SIZE; j++) {
                const report = reports.shift();
                if (!report) {
                    break;
                }

                batch.push(Utils.stripCommonFields(report.data as BaseMonitoringData));
            }

            compositeData.allMonitoringData = batch;
            const compositeDataReport = Utils.generateReport(compositeData, this.apiKey);
            batchedReports.push(compositeDataReport);
        }

        return batchedReports;
    }

    private sendBatchedReports(batchedReports: any[]) {
        const isAsync = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_REPORT_CLOUDWATCH_ENABLE);

        const reportPromises: any[] = [];
        const currentMinute = Math.floor(Date.now() / 1000);
        batchedReports.forEach((batch: any) => {
            if (isAsync) {
                reportPromises.push(this.writeBatchToCW(batch));
            } else {
                if (currentMinute > this.latestReportingLimitedMinute) {
                    reportPromises.push(this.request(batch));
                } else {
                    ThundraLogger.error(`Skipped sending monitoring data temporarily as it hits the limit`);
                }
            }
        });

        return Promise.all(reportPromises);
    }

    private request(batch: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            let request: http.ClientRequest;
            const responseHandler = (response: http.IncomingMessage) => {
                let responseData = '';
                response.on('data', (chunk: Buffer | string) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    if (response.statusCode === 429) {
                        this.latestReportingLimitedMinute = Math.floor(Date.now() / 1000);
                    }
                    if (response.statusCode !== 200) {
                        // First, check whether or debug is enabled.
                        // If not no need to convert reports into JSON string to pass to "debug" function
                        // because "JSON.stringify" is not cheap operation.
                        if (ThundraLogger.isDebugEnabled()) {
                            ThundraLogger.debug(JSON.stringify(batch));
                        }
                        return reject({
                            status: response.statusCode,
                            data: responseData,
                        });
                    }
                    return resolve({
                        status: response.statusCode,
                        data: responseData,
                    });
                });
            };

            this.useHttps
                ? request = https.request(this.requestOptions, responseHandler)
                : request = http.request(this.requestOptions, responseHandler);

            request.on('error', (error: any) => {
                return reject(error);
            });
            try {
                request.write(JSON.stringify(batch));
                request.end();
            } catch (error) {
                ThundraLogger.error('Cannot serialize report data. ' + error);
            }
        });
    }

    private writeBatchToCW(batch: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const jsonStringReport = '\n' + JSON.stringify(batch).replace(/\r?\n|\r/g, '') + '\n';
                process.stdout.write(jsonStringReport);
                return resolve();
            } catch (error) {
                ThundraLogger.error('Cannot write report data to CW. ' + error);
                return reject(error);
            }
        });
    }

}

export default Reporter;
