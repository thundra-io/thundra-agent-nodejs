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

    constructor(config: ThundraConfig, u?: url.URL) {
        this.reports = [];
        this.config = config ? config : new ThundraConfig({});
        this.useHttps = (u ? u.protocol : URL.protocol) === 'https:';
        this.requestOptions = this.createRequestOptions();
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
        if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_REPORT_CLOUDWATCH_ENABLE) === 'true') {
            const jsonStringReport = '\n' + JSON.stringify(report).replace(/\r?\n|\r/g, '') + '\n';
            process.stdout.write(jsonStringReport);
        } else {
            this.reports = [...this.reports, report];
        }
    }

    getCompositeBatchedReports(): any[] {
        const batchedReports: any[] = [];
        const batchCount = Math.ceil(this.reports.length / this.MAX_MONITOR_DATA_BATCH_SIZE);
        const invocationReport =
            this.reports.filter((report) => report.data.type === MonitoringDataType.INVOCATION)[0];

        for (let i = 0; i < batchCount; i++) {
            const compositeData = Utils.initCompositeMonitoringData(invocationReport.data);
            const batch: any[] = [];
            for (let j = 1; j < this.MAX_MONITOR_DATA_BATCH_SIZE; j++) {
                const report = this.reports.shift();
                if (!report) {
                    break;
                }

                batch.push(Utils.stripCommonFields(report.data  as BaseMonitoringData));
            }

            compositeData.allMonitoringData = batch;
            const compositeDataReport = Utils.generateReport(compositeData, this.config.apiKey);
            batchedReports.push(compositeDataReport);
        }

        return batchedReports;
    }

    getBatchedReports(): any[] {
        const batchedReports: any[] = [];
        const batchCount = Math.ceil(this.reports.length / this.MAX_MONITOR_DATA_BATCH_SIZE);

        for (let i = 0; i < batchCount; i++) {
            const batch: any[] = [];
            for (let j = 1; j < this.MAX_MONITOR_DATA_BATCH_SIZE; j++) {
                const report = this.reports.shift();
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

        try {
            batchedReports = this.config.enableCompositeData ?
                this.getCompositeBatchedReports() : this.getBatchedReports();
        } catch (err) {
            ThundraLogger.getInstance().error(`Cannot create batch request will send no report. ${err}`);
        }

        const requestPromises: any[] = [];
        batchedReports.forEach((batch: any) => {
            requestPromises.push(this.request(batch));
        });

        await Promise.all(requestPromises).catch((err) => {
            ThundraLogger.getInstance().error(err);
        });
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

}

export default Reporter;
