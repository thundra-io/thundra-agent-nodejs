import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { COMPOSITE_MONITORING_DATA_PATH, getDefaultCollectorEndpoint } from './Constants';
import Utils from './utils/Utils';
import ThundraLogger from './ThundraLogger';
import BaseMonitoringData from './plugins/data/base/BaseMonitoringData';
import MonitoringDataType from './plugins/data/base/MonitoringDataType';
import ConfigNames from './config/ConfigNames';
import ConfigProvider from './config/ConfigProvider';
import CompositeMonitoringData from './plugins/data/composite/CompositeMonitoringData';
import MonitorDataType from './plugins/data/base/MonitoringDataType';

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
        ThundraLogger.debug('<Reporter> Sending reports ... ');
        let batchedReports: any = [];
        try {
            batchedReports = this.getCompositeBatchedReports(reports);
        } catch (err) {
            ThundraLogger.error('<Reporter> Cannot create batch request will send no report:', err);
        }

        return new Promise<void>((resolve, reject) => {
            this.sendBatchedReports(batchedReports)
                .then(() => {
                    ThundraLogger.debug('<Reporter> Sent reports successfully');
                    resolve();
                })
                .catch((err: any) => {
                    if (err.code === 'ECONNRESET') {
                        ThundraLogger.debug('<Reporter> Connection reset by server. Will send monitoring data again.');
                        this.sendBatchedReports(batchedReports)
                            .then(() => {
                                ThundraLogger.debug('<Reporter> Sent reports successfully on retry');
                                resolve();
                            })
                            .catch((err2: any) => {
                                ThundraLogger.debug('<Reporter> Failed to send reports on retry:', err2);
                                reject(err2);
                            });
                    } else {
                        ThundraLogger.debug('<Reporter> Failed to send reports:', err);
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
        ThundraLogger.debug('<Reporter> Generating batched reports ...');
        reports = reports.slice(0);

        const batchedReports: any[] = [];
        const batchCount = Math.ceil(reports.length / this.MAX_MONITOR_DATA_BATCH_SIZE);
        const invocationReport = reports.filter((report) => report.data.type === MonitoringDataType.INVOCATION)[0];
        if (!invocationReport) {
            ThundraLogger.debug('<Reporter> No invocation data could be found in the reports');
            return [];
        }
        const initialCompositeData = this.initCompositeMonitoringData(invocationReport.data);

        for (let i = 0; i < batchCount; i++) {
            const compositeData = this.initCompositeMonitoringData(initialCompositeData);
            const batch: any[] = [];
            for (let j = 1; j < this.MAX_MONITOR_DATA_BATCH_SIZE; j++) {
                const report = reports.shift();
                if (!report) {
                    break;
                }

                batch.push(this.stripCommonFields(report.data as BaseMonitoringData));
            }

            compositeData.allMonitoringData = batch;
            const compositeDataReport = Utils.generateReport(compositeData, this.apiKey);
            batchedReports.push(compositeDataReport);
        }

        return batchedReports;
    }

    private initCompositeMonitoringData(data: BaseMonitoringData): CompositeMonitoringData {
        const monitoringData = Utils.createMonitoringData(MonitorDataType.COMPOSITE);

        monitoringData.id = Utils.generateId();
        monitoringData.agentVersion = data.agentVersion;
        monitoringData.dataModelVersion = data.dataModelVersion;
        monitoringData.applicationId = data.applicationId;
        monitoringData.applicationDomainName = data.applicationDomainName;
        monitoringData.applicationClassName = data.applicationClassName;
        monitoringData.applicationName = data.applicationName;
        monitoringData.applicationVersion = data.applicationVersion;
        monitoringData.applicationStage = data.applicationStage;
        monitoringData.applicationRuntime = data.applicationRuntime;
        monitoringData.applicationRuntimeVersion = data.applicationRuntimeVersion;
        monitoringData.applicationTags = data.applicationTags;

        return monitoringData as CompositeMonitoringData;
    }

    private stripCommonFields(monitoringData: BaseMonitoringData) {
        monitoringData.agentVersion = undefined;
        monitoringData.dataModelVersion = undefined;
        monitoringData.applicationId = undefined;
        monitoringData.applicationClassName = undefined;
        monitoringData.applicationDomainName = undefined;
        monitoringData.applicationName = undefined;
        monitoringData.applicationVersion = undefined;
        monitoringData.applicationStage = undefined;
        monitoringData.applicationRuntime = undefined;
        monitoringData.applicationRuntimeVersion = undefined;
        monitoringData.applicationTags = undefined;

        return monitoringData;
    }

    private sendBatchedReports(batchedReports: any[]) {
        ThundraLogger.debug('<Reporter> Sending batched reports ...');
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
                    ThundraLogger.debug('<Reporter> Skipped sending monitoring data temporarily as it hits the limit');
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
                    ThundraLogger.debug(
                        `<Reporter> Received response from collector (status code: ${response.statusCode}): \
                            ${responseData}`);
                    if (response.statusCode === 429) {
                        this.latestReportingLimitedMinute = Math.floor(Date.now() / 1000);
                    }
                    if (response.statusCode !== 200) {
                        // Unauthorized request (for ex. API key is not present or invalid)
                        if (response.statusCode === 401) {
                            let responseMessage = null;
                            try {
                                const responseJson = JSON.parse(responseData);
                                responseMessage = responseJson.message;
                            } catch (e) {
                                // Ignore
                            }
                            if (!responseMessage) {
                                responseMessage = 'No API key is present or invalid API key';
                            }
                            ThundraLogger.error(
                                `<Reporter> Unable to report because of unauthorized request: ${responseMessage}`);
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
                ThundraLogger.debug('<Reporter> Request sent to collector has failed:', error);
                return reject(error);
            });
            try {
                const json = Utils.serializeJSON(batch);
                ThundraLogger.debug(`<Reporter> Sending data to collector at ${this.requestOptions.hostname}: ${json}`);
                request.write(json);
                request.end();
            } catch (error) {
                ThundraLogger.error('<Reporter> Cannot serialize report data:', error);
            }
        });
    }

    private writeBatchToCW(batch: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const json = Utils.serializeJSON(batch);
                ThundraLogger.debug(`<Reporter> Writing data to CloudWatch: ${json}`);
                const jsonStringReport = '\n' + json.replace(/\r?\n|\r/g, '') + '\n';
                process.stdout.write(jsonStringReport);
                return resolve();
            } catch (error) {
                ThundraLogger.debug('<Reporter> Cannot write report data to CloudWatch:', error);
                return reject(error);
            }
        });
    }

}

export default Reporter;
