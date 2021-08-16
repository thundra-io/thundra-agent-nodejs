import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import {
    COMPOSITE_MONITORING_DATA_PATH,
    getDefaultCollectorEndpoint,
    LOCAL_COLLECTOR_ENDPOINT,
    SPAN_TAGS_TO_TRIM_1,
    SPAN_TAGS_TO_TRIM_2,
    REPORTER_HTTP_TIMEOUT,
} from './Constants';
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

    private useHttps: boolean;
    private requestOptions: http.RequestOptions;
    private latestReportingLimitedMinute: number;
    private url: url.UrlWithStringQuery;
    private apiKey: string;
    private async: boolean;
    private trimmers: Trimmer[];
    private maxReportSize: number;

    constructor(apiKey: string, opt: any = {}) {
        this.url = url.parse(opt.url || Reporter.getCollectorURL());
        this.apiKey = apiKey;
        this.async = opt.async || ConfigProvider.get<boolean>(ConfigNames.THUNDRA_REPORT_CLOUDWATCH_ENABLE);
        this.useHttps = (opt.protocol || this.url.protocol) === 'https:';
        this.requestOptions = this.createRequestOptions();
        this.latestReportingLimitedMinute = -1;
        this.trimmers =
            opt.trimmers ||
            [
                new LogAndMetricTrimmer(),
                new SpanTagTrimmer(SPAN_TAGS_TO_TRIM_1),
                new SpanTagTrimmer(SPAN_TAGS_TO_TRIM_2),
                new NonInvocationTrimmer(),
            ];
        this.maxReportSize = opt.maxReportSize || ConfigProvider.get<boolean>(ConfigNames.THUNDRA_REPORT_MAX_SIZE);
    }

    private static getCollectorURL(): string {
        const useLocalCollector: boolean = ConfigProvider.get(ConfigNames.THUNDRA_REPORT_REST_LOCAL);
        if (useLocalCollector) {
            return 'http://' + LOCAL_COLLECTOR_ENDPOINT + '/v1';
        }
        return ConfigProvider.get<string>(
            ConfigNames.THUNDRA_REPORT_REST_BASEURL,
            'https://' + getDefaultCollectorEndpoint() + '/v1');
    }

    /**
     * Reports given data
     * @param reports data to be reported
     * @return {Promise} the promise to track the result of reporting
     */
    sendReports(reports: any[]): Promise<void> {
        ThundraLogger.debug('<Reporter> Sending reports ... ');
        let compositeReport: any;
        try {
            compositeReport = this.getCompositeReport(reports);
        } catch (err) {
            ThundraLogger.error('<Reporter> Cannot create batch request will send no report:', err);
        }

        return new Promise<void>((resolve, reject) => {
            try {
                const reportJson: string = this.serializeReport(compositeReport);
                this.doReport(reportJson)
                    .then((res: any) => {
                        ThundraLogger.debug('<Reporter> Sent reports successfully');
                        resolve(res);
                    })
                    .catch((err: any) => {
                        if (err.code === 'ECONNRESET') {
                            ThundraLogger.debug('<Reporter> Connection reset by server. Will send monitoring data again.');
                            this.doReport(reportJson)
                                .then((res: any) => {
                                    ThundraLogger.debug('<Reporter> Sent reports successfully on retry');
                                    resolve(res);
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
            } catch (err) {
                ThundraLogger.debug('<Reporter> Failed to serialize and send reports:', err);
                reject(err);
            }
        });
    }

    private createRequestOptions(u?: url.URL): http.RequestOptions {
        const path = COMPOSITE_MONITORING_DATA_PATH;

        return {
            timeout: REPORTER_HTTP_TIMEOUT,
            method: 'POST',
            hostname: u ? u.hostname : this.url.hostname,
            path: (u ? u.pathname : this.url.pathname) + path,
            port: parseInt(u ? u.port : this.url.port, 0),
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

                    socket.setTimeout(REPORTER_HTTP_TIMEOUT, () => {
                        ThundraLogger.debug('<Reporter> Reporter socket timeout');
                    });

                    oncreate(null, socket);
                    return socket;
                } catch (e) {
                    oncreate(e, null);
                    throw e;
                }
            },
        };
    }

    private getCompositeReport(reports: any[]): any {
        ThundraLogger.debug('<Reporter> Generating composite report ...');

        const compositeData = this.initCompositeMonitoringData();
        const batch: any[] = [];
        for (const report of reports) {
            batch.push(this.stripCommonFields(report.data as BaseMonitoringData));
        }
        compositeData.allMonitoringData = batch;

        return Utils.generateReport(compositeData, this.apiKey);
    }

    private initCompositeMonitoringData(): CompositeMonitoringData {
        const monitoringData = Utils.createMonitoringData(MonitorDataType.COMPOSITE);

        monitoringData.id = Utils.generateId();
        Utils.injectCommonApplicationProperties(monitoringData);

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

    private doReport(reportJson: string) {
        ThundraLogger.debug('<Reporter> Reporting ...');

        const reportPromises: any[] = [];
        const currentMinute = Math.floor(Date.now() / 1000);
        if (this.async) {
            reportPromises.push(this.writeToCW(reportJson));
        } else {
            if (currentMinute > this.latestReportingLimitedMinute) {
                reportPromises.push(this.sendToCollector(reportJson));
            } else {
                ThundraLogger.debug('<Reporter> Skipped sending monitoring data temporarily as it hits the limit');
            }
        }

        return Promise.all(reportPromises);
    }

    private sendToCollector(reportJson: string): Promise<any> {
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

            request.setTimeout(REPORTER_HTTP_TIMEOUT, () => {
                ThundraLogger.debug('<Reporter> Reporter request timeout');
                return reject({});
            });

            request.on('error', (error: any) => {
                ThundraLogger.debug('<Reporter> Request sent to collector has failed:', error);
                return reject(error);
            });
            try {
                ThundraLogger.debug(
                    `<Reporter> Sending data to collector at ${this.requestOptions.hostname}: ${reportJson}`);
                request.write(reportJson);
                request.end();
            } catch (error) {
                ThundraLogger.error('<Reporter> Cannot serialize report data:', error);
            }
        });
    }

    private writeToCW(reportJson: string): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                ThundraLogger.debug(`<Reporter> Writing data to CloudWatch: ${reportJson}`);
                const jsonStringReport = '\n' + reportJson.replace(/\r?\n|\r/g, '') + '\n';
                process.stdout.write(jsonStringReport);
                return resolve();
            } catch (error) {
                ThundraLogger.debug('<Reporter> Cannot write report data to CloudWatch:', error);
                return reject(error);
            }
        });
    }

    private serializeReport(batch: any): string {
        let json: string = Utils.serializeJSON(batch);
        if (json.length < this.maxReportSize) {
            return json;
        }
        for (const trimmer of this.trimmers) {
            const trimResult: TrimResult = trimmer.trim(batch.data.allMonitoringData);
            batch.data.allMonitoringData = trimResult.monitoringDataList;
            if (!trimResult.mutated) {
                continue;
            }
            json = Utils.serializeJSON(batch);
            if (json.length < this.maxReportSize) {
                return json;
            }
        }
        return Utils.serializeJSON(batch);
    }

}

export class TrimResult {

    readonly monitoringDataList: any[];
    readonly mutated: boolean;

    constructor(monitoringDataList: any[], mutated: boolean) {
        this.monitoringDataList = monitoringDataList;
        this.mutated = mutated;
    }

}

export interface Trimmer {

    trim(monitoringDataList: any[]): TrimResult;

}

export class LogAndMetricTrimmer implements Trimmer {

    trim(monitoringDataList: any[]): TrimResult {
        const trimmedMonitoringDataList: any[] = [];
        for (const monitoringData of monitoringDataList) {
            if (monitoringData.type !== MonitoringDataType.LOG &&
                    monitoringData.type !== MonitoringDataType.METRIC) {
                trimmedMonitoringDataList.push(monitoringData);
            }
        }
        if (monitoringDataList.length !== trimmedMonitoringDataList.length) {
            ThundraLogger.debug(`<LogAndMetricTrimmer> Trimmed logs and metrics`);
        }
        return new TrimResult(
            trimmedMonitoringDataList,
            monitoringDataList.length !== trimmedMonitoringDataList.length,
        );
    }

}

export class SpanTagTrimmer implements Trimmer {

    private readonly tagsToTrim: string[];

    constructor(tagsToTrim: string[]) {
        this.tagsToTrim = tagsToTrim;
    }

    trim(monitoringDataList: any[]): TrimResult {
        let trimmed: boolean = false;
        for (const monitoringData of monitoringDataList) {
            if (monitoringData.type === MonitoringDataType.SPAN) {
                if (monitoringData.tags) {
                    for (const spanTagToTrim of this.tagsToTrim) {
                        if (monitoringData.tags[spanTagToTrim]) {
                            delete monitoringData.tags[spanTagToTrim];
                            ThundraLogger.debug(`<SpanTagTrimmer> Trimmed ${spanTagToTrim}`);
                            trimmed = true;
                        }
                    }
                }
            }
        }
        return new TrimResult(
            monitoringDataList,
            trimmed,
        );
    }

}

export class NonInvocationTrimmer implements Trimmer {

    trim(monitoringDataList: any[]): TrimResult {
        const trimmedMonitoringDataList: any[] = [];
        for (const monitoringData of monitoringDataList) {
            if (monitoringData.type === MonitoringDataType.INVOCATION) {
                trimmedMonitoringDataList.push(monitoringData);
                break;
            }
        }
        if (monitoringDataList.length !== trimmedMonitoringDataList.length) {
            ThundraLogger.debug(`<NonInvocationTrimmer> Trimmed non-invocation data`);
        }
        return new TrimResult(
            trimmedMonitoringDataList,
            monitoringDataList.length !== trimmedMonitoringDataList.length,
        );
    }

}

export default Reporter;
