import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { URL, MONITORING_DATA_PATH, envVariableKeys, COMPOSITE_MONITORING_DATA_PATH } from './Constants';
import Utils from './plugins/utils/Utils';
import ThundraLogger from './ThundraLogger';
import ThundraConfig from './plugins/config/ThundraConfig';
import BaseMonitoringData from './plugins/data/base/BaseMonitoringData';
import MonitoringDataType from './plugins/data/base/MonitoringDataType';

const httpAgent = new http.Agent({
    keepAlive: true,
});
const httpsAgent = new https.Agent({
    maxCachedSessions: 1,
    keepAlive: true,
});

class Reporter {
    private readonly MAX_MONITOR_DATA_BATCH_SIZE: number = 100;
    private reports: any[];
    private config: ThundraConfig;
    private useHttps: boolean;
    private requestOptions: http.RequestOptions;
    private connectionRetryCount: number;
    private latestReportingLimitedMinute: number;

    constructor(config: ThundraConfig, u?: url.URL) {
        this.reports = [];
        this.config = config ? config : new ThundraConfig({});
        this.useHttps = (u ? u.protocol : URL.protocol) === 'https:';
        this.requestOptions = this.createRequestOptions();
        this.connectionRetryCount = 0;
        this.latestReportingLimitedMinute = -1;
    }

    createRequestOptions(u?: url.URL): http.RequestOptions {
        const path = this.config.enableCompositeData ?
            COMPOSITE_MONITORING_DATA_PATH : MONITORING_DATA_PATH;

        return {
            method: 'POST',
            hostname: u ? u.hostname : URL.hostname,
            path: (u ? u.pathname : URL.pathname) + path,
            port: parseInt(u ? u.port : URL.port, 0),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'ApiKey ' + this.config.apiKey,
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
        this.reports = [...this.reports, report];
    }

    getCompositeBatchedReports(): any[] {
        const batchedReports: any[] = [];
        const reports = this.reports.slice(0);
        const batchCount = Math.ceil(reports.length / this.MAX_MONITOR_DATA_BATCH_SIZE);
        const invocationReport =
            this.reports.filter((report) => report.data.type === MonitoringDataType.INVOCATION)[0];
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
            const compositeDataReport = Utils.generateReport(compositeData, this.config.apiKey);
            batchedReports.push(compositeDataReport);
        }

        return batchedReports;
    }

    getBatchedReports(): any[] {
        const batchedReports: any[] = [];
        const reports = this.reports.slice(0);
        const batchCount = Math.ceil(reports.length / this.MAX_MONITOR_DATA_BATCH_SIZE);

        for (let i = 0; i < batchCount; i++) {
            const batch: any[] = [];
            for (let j = 1; j < this.MAX_MONITOR_DATA_BATCH_SIZE; j++) {
                const report = reports.shift();
                if (!report) {
                    break;
                }
                batch.push(report);
            }
            batchedReports.push(batch);
        }

        return batchedReports;
    }

    async sendReports(): Promise<void> {
        let batchedReports = [];
        const isComposite = this.config.enableCompositeData;
        try {
            batchedReports = isComposite ? this.getCompositeBatchedReports() : this.getBatchedReports();
        } catch (err) {
            ThundraLogger.getInstance().error(`Cannot create batch request will send no report. ${err}`);
        }

        const isAsync = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_REPORT_CLOUDWATCH_ENABLE) === 'true';

        const reportPromises: any[] = [];
        const currentMinute = Date.now() / 1000;
        batchedReports.forEach((batch: any) => {
            if (isAsync) {
                reportPromises.push(this.writeBatchToCW(batch, isComposite));
            } else {
                if (currentMinute > this.latestReportingLimitedMinute) {
                    reportPromises.push(this.request(batch));
                } else {
                    ThundraLogger.getInstance().error(`Skipped sending monitoring data temporarily as it hits the limit`);
                }
            }
        });

        await Promise.all(reportPromises).catch(async (err) => {
            if (this.connectionRetryCount === 0 && err.code === 'ECONNRESET') {
                ThundraLogger.getInstance().debug(
                    'Keep Alive connection reset by server. Will send monitoring data again.');

                this.connectionRetryCount++;

                await this.sendReports();
                this.connectionRetryCount = 0;
                return;
            }

            ThundraLogger.getInstance().error(err);
        });

        this.connectionRetryCount = 0;
    }

    request(batch: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            let request: http.ClientRequest;
            const responseHandler = (response: http.IncomingMessage) => {
                let responseData = '';
                response.on('data', (chunk: Buffer | string) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    if (response.statusCode === 429) {
                        this.latestReportingLimitedMinute = Date.now() / 1000;
                    }
                    if (response.statusCode !== 200) {
                        ThundraLogger.getInstance().debug(JSON.stringify(this.reports));
                        return reject({ status: response.statusCode, data: responseData });
                    }
                    return resolve({ status: response.statusCode, data: responseData });
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
                ThundraLogger.getInstance().error('Cannot serialize report data. ' + error);
            }
        });
    }

    writeBatchToCW(batch: any[], isComposite: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (isComposite) {
                    const jsonStringReport = '\n' + JSON.stringify(batch).replace(/\r?\n|\r/g, '') + '\n';
                    process.stdout.write(jsonStringReport);
                } else {
                    for (const report of batch) {
                        const jsonStringReport = '\n' + JSON.stringify(report).replace(/\r?\n|\r/g, '') + '\n';
                        process.stdout.write(jsonStringReport);
                    }
                }
                return resolve();
            } catch (error) {
                ThundraLogger.getInstance().error('Cannot write report data to CW. ' + error);
                return reject(error);
            }
        });
    }
}

export default Reporter;
