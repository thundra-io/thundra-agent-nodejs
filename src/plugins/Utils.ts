import * as uuidv4 from 'uuid/v4';
import { readFile } from 'fs';
import * as os from 'os';
import { DATA_MODEL_VERSION, PROC_IO_PATH, PROC_STAT_PATH,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME } from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';
import Reference from 'opentracing/lib/reference';
import * as opentracing from 'opentracing';
import MonitorDataType from './data/base/MonitoringDataType';
import BaseMonitoringData from './data/base/BaseMonitoringData';
import BuildInfoLoader from '../BuildInfoLoader';
import MonitoringDataType from './data/base/MonitoringDataType';
import InvocationData from './data/invocation/InvacationData';
import MetricData from './data/metric/MetricData';

const semver = require('semver');

class Utils {
    static generateId(): string {
        return uuidv4();
    }

    static generateReport(data: any, apiKey: String) {
        return {
            data,
            type: data.type,
            apiKey,
            dataModelVersion: DATA_MODEL_VERSION,
        };
    }

    static getCpuUsage() {
        const cpus: os.CpuInfo[] = os.cpus();
        const procCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
        const procCpuUsed = procCpuUsage.user + procCpuUsage.system;
        let sysCpuTotal = 0;
        let sysCpuIdle = 0;

        cpus.forEach((cpu) => {
            sysCpuTotal += (cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq);
            sysCpuIdle += cpu.times.idle;
        });
        const sysCpuUsed = sysCpuTotal - sysCpuIdle;
        return {
            procCpuUsed,
            sysCpuUsed,
            sysCpuTotal,
        };
    }

    static getCpuLoad(start: any, end: any, clockTick: any) {
        const sysCpuTotalDif = (end.sysCpuTotal - start.sysCpuTotal);
        let procCpuLoad = ((end.procCpuUsed - start.procCpuUsed) / clockTick) / sysCpuTotalDif;
        let sysCpuLoad = (end.sysCpuUsed - start.sysCpuUsed) / sysCpuTotalDif;
        procCpuLoad = Number.isNaN(procCpuLoad) ? 0.0 : procCpuLoad;
        sysCpuLoad = Number.isNaN(sysCpuLoad) ? 0.0 : sysCpuLoad;
        return {
            procCpuLoad: Math.min(procCpuLoad, sysCpuLoad),
            sysCpuLoad,
        };
    }

    static parseError(err: any) {
        const error: any = { errorMessage: '', errorType: 'Unknown Error' };
        if (err instanceof Error) {
            error.errorType = err.name;
            error.errorMessage = err.message;
        } else if (typeof err === 'string') {
            error.errorMessage = err.toString();
        } else {
            try {
                error.errorMessage = JSON.stringify(err);
            } catch (e) {
                // the comment below is for ignoring in unit tests, do not remove it
                // istanbul ignore next
                error.errorMessage = '';
            }
        }
        return error;
    }

    static readProcMetricPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_STAT_PATH, (err, file) => {
                const procStatData = {
                    threadCount: 0,
                };

                if (err) {
                    console.error(`Cannot read ${PROC_STAT_PATH} file. Setting Thread Metrics to 0.`);
                } else {
                    const procStatArray = file.toString().split(' ');
                    procStatData.threadCount = parseInt(procStatArray[19], 0);
                }

                return resolve(procStatData);
            });
        });
    }

    static readProcIoPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_IO_PATH, (err, file) => {
                const procIoData = {
                    readBytes: 0,
                    writeBytes: 0,
                };

                if (err) {
                    console.error(`Cannot read ${PROC_IO_PATH} file. Setting IO Metrics to 0.`);
                } else {
                    const procIoArray = file.toString().split('\n');
                    procIoData.readBytes = parseInt(procIoArray[4].substr(procIoArray[4].indexOf(' ') + 1), 0);
                    procIoData.writeBytes = parseInt(procIoArray[5].substr(procIoArray[5].indexOf(' ') + 1), 0);
                }

                return resolve(procIoData);
            });
        });
    }

    static getParentContext(references: any): ThundraSpanContext {
        let parent: ThundraSpanContext = null;
        if (references) {
            for (const ref of references) {
                if (!(ref instanceof Reference)) {
                    console.error(`Expected ${ref} to be an instance of opentracing.Reference`);
                    break;
                }
                const spanContext = ref.referencedContext();

                if (!(spanContext instanceof ThundraSpanContext)) {
                    console.error(`Expected ${spanContext} to be an instance of SpanContext`);
                    break;
                }

                if (ref.type() === opentracing.REFERENCE_CHILD_OF) {
                    parent = ref.referencedContext() as ThundraSpanContext;
                    break;
                } else if (ref.type() === opentracing.REFERENCE_FOLLOWS_FROM) {
                    if (!parent) {
                        parent = ref.referencedContext() as ThundraSpanContext;
                    }
                }
            }
        }

        return parent;
    }

    static validateModuleVersion(basedir: string, versions: string): boolean {
        try {
            if (basedir) {
                const packageJSON = `${basedir}/package.json`;
                const version = require(packageJSON).version;
                return semver.satisfies(version, versions);
            }
            return false;
        } catch (err) {
            return true;
        }
    }

    static replaceArgs(statement: string, values: any[]): string {
        const args = Array.prototype.slice.call(values);
        const replacer = (value: string) => args[parseInt(value.substr(1), 10) - 1];

        return statement.replace(/(\$\d+)/gm, replacer);
    }

    static getDynamoDBTableName(request: any): string {
        let tableName = 'DynamoEngine';
        if (request.params.TableName) {
            tableName = request.params.TableName;
        }
        if (request.params.RequestItems) {
            tableName = Object.keys(request.params.RequestItems).join(',');
        }
        return tableName;
    }

    static getQueueName(url: any): string {
        return url.split('/').pop();
    }

    static getTopicName(topicArn: any): string {
        return topicArn.split(':').pop();
    }

    static getServiceName(endpoint: string): string {
        if (!endpoint) {
          return '';
        }
        return endpoint.split('.')[0];
    }

    static initMonitoringData(pluginContext: any, originalContext: any, type: MonitoringDataType): BaseMonitoringData {
        const monitoringData = this.createMonitoringData(type);

        monitoringData.id = Utils.generateId();
        monitoringData.type = type;
        monitoringData.agentVersion = BuildInfoLoader.getAgentVersion();
        monitoringData.dataModelVersion = DATA_MODEL_VERSION;
        monitoringData.applicationId =  pluginContext.applicationId;
        monitoringData.applicationDomainName = LAMBDA_APPLICATION_DOMAIN_NAME;
        monitoringData.applicationClassName = LAMBDA_APPLICATION_CLASS_NAME;
        monitoringData.applicationName = originalContext.functionName;
        monitoringData.applicationVersion = pluginContext.applicationVersion;
        monitoringData.applicationStage = process.env.thundra_application_stage ? process.env.thundra_application_stage : '';
        monitoringData.applicationRuntimeVersion = process.version;

        return monitoringData;
    }

    static createMonitoringData(type: MonitoringDataType): BaseMonitoringData {
        let monitoringData: BaseMonitoringData;

        switch (type) {
            case MonitorDataType.INVOCATION:
                monitoringData = new InvocationData();
                break;
            case MonitorDataType.METRIC:
                monitoringData = new MetricData();
                break;
            case MonitorDataType.SPAN:
                monitoringData = null;
                break;
        }

        return monitoringData;
    }
}

export default Utils;
