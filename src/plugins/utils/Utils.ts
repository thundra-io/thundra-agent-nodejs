import * as uuidv4 from 'uuid/v4';
import { readFile } from 'fs';
import * as os from 'os';
import {
    DATA_MODEL_VERSION, PROC_IO_PATH, PROC_STAT_PATH,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, envVariableKeys,
    LISTENERS,
} from '../../Constants';
import ThundraSpanContext from '../../opentracing/SpanContext';
import Reference from 'opentracing/lib/reference';
import * as opentracing from 'opentracing';
import MonitorDataType from '../data/base/MonitoringDataType';
import BaseMonitoringData from '../data/base/BaseMonitoringData';
import BuildInfoLoader from '../../BuildInfoLoader';
import MonitoringDataType from '../data/base/MonitoringDataType';
import InvocationData from '../data/invocation/InvocationData';
import MetricData from '../data/metric/MetricData';
import TraceData from '../data/trace/TraceData';
import SpanData from '../data/trace/SpanData';
import LogData from '../data/log/LogData';
import ThundraLogger from '../../ThundraLogger';
import ApplicationSupport from '../support/ApplicationSupport';
import ThundraTracer from '../../opentracing/Tracer';

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

    static getConfiguration(key: string): string {
        return process.env[key];
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
        const error: any = { errorMessage: '', errorType: 'Unknown Error', stack: null, code: 0 };
        if (err instanceof Error) {
            error.errorType = err.name;
            error.errorMessage = err.message;
            error.stack = err.stack;
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
                    ThundraLogger.getInstance().error(`Cannot read ${PROC_STAT_PATH} file. Setting Thread Metrics to 0.`);
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
                    ThundraLogger.getInstance().error(`Cannot read ${PROC_IO_PATH} file. Setting Metrics to 0.`);
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
                    ThundraLogger.getInstance().error(`Expected ${ref} to be an instance of opentracing.Reference`);
                    break;
                }
                const spanContext = ref.referencedContext();

                if (!(spanContext instanceof ThundraSpanContext)) {
                    ThundraLogger.getInstance().error(`Expected ${spanContext} to be an instance of SpanContext`);
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

    static replaceArgs(statement: string, values: any[]): string {
        const args = Array.prototype.slice.call(values);
        const replacer = (value: string) => args[parseInt(value.substr(1), 10) - 1];

        return statement.replace(/(\$\d+)/gm, replacer);
    }

    static getDynamoDBTableName(request: any): string {
        let tableName;

        if (request.params && request.params.TableName) {
            tableName = request.params.TableName;
        }

        if (request.params && request.params.RequestItems) {
            tableName = Object.keys(request.params.RequestItems).join(',');
        }

        return tableName;
    }

    static getQueueName(url: any): string {
        return url ? url.split('/').pop() : null;
    }

    static getTopicName(topicArn: any): string {
        return topicArn ? topicArn.split(':').pop() : '';
    }

    static getServiceName(endpoint: string): string {
        if (!endpoint) {
            return '';
        }
        return endpoint.split('.')[0];
    }

    static initMonitoringData(pluginContext: any, originalContext: any, type: MonitoringDataType): BaseMonitoringData {
        const monitoringData = this.createMonitoringData(type);

        const domainName = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_DOMAIN_NAME);
        const className = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_CLASS_NAME);
        const stage = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_STAGE);
        const applicationId = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_ID);
        const applicationName = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_NAME);
        const applicationVersion = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_VERSION);

        monitoringData.id = Utils.generateId();
        monitoringData.agentVersion = BuildInfoLoader.getAgentVersion();
        monitoringData.dataModelVersion = DATA_MODEL_VERSION;
        monitoringData.applicationId = applicationId ? applicationId : (pluginContext ? pluginContext.applicationId : '');
        monitoringData.applicationDomainName = domainName ? domainName : LAMBDA_APPLICATION_DOMAIN_NAME;
        monitoringData.applicationClassName = className ? className : LAMBDA_APPLICATION_CLASS_NAME;
        monitoringData.applicationName = applicationName ? applicationName :
            (originalContext ? originalContext.functionName : '');
        monitoringData.applicationVersion = applicationVersion ? applicationVersion :
            (pluginContext ? pluginContext.applicationVersion : '');
        monitoringData.applicationStage = stage ? stage : '';
        monitoringData.applicationRuntimeVersion = process.version;

        monitoringData.applicationTags = { ...monitoringData.applicationTags, ...ApplicationSupport.applicationTags };

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
            case MonitorDataType.TRACE:
                monitoringData = new TraceData();
                break;
            case MonitorDataType.SPAN:
                monitoringData = new SpanData();
                break;
            case MonitorDataType.LOG:
                monitoringData = new LogData();
                break;
        }

        return monitoringData;
    }

    static sleep(milliseconds: number): Promise<number> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    static getRandomInt(bound: number): number {
        return 1 + Math.floor(Math.random() * bound);
    }

    static registerSpanListenersFromConfigurations(tracer: ThundraTracer): any {
        const listeners: any[] = [];
        for (const key of Object.keys(process.env)) {
            if (key.startsWith(envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF)) {
                try {
                    const value = process.env[key];
                    const configStartIndex = value.indexOf('[');
                    const configEndIndex = value.lastIndexOf(']');

                    if (configStartIndex > 0 && configEndIndex > 0) {
                        const listenerClassName = value.substring(0, configStartIndex);
                        const configDefs = value.substring(configStartIndex + 1, configEndIndex).split(',');
                        const configs: any = {};
                        for (let configDef of configDefs) {
                            if (!configDef || configDef === '') {
                                continue;
                            }

                            configDef = configDef.trim();
                            const separatorIndex = configDef.indexOf('=');
                            if (separatorIndex < 1) {
                                throw new Error(
                                    'Span listener config definitions must ' +
                                    'be in \'key=value\' format where \'value\' can be empty');
                            }
                            const paramName = configDef.substring(0, separatorIndex);
                            const paramValue = configDef.substring(separatorIndex + 1);
                            configs[paramName.trim()] = paramValue.trim();
                        }

                        const listenerClass = LISTENERS[listenerClassName];
                        if (!listenerClass) {
                            throw new Error('No listener found with name: ' + listenerClassName);
                        }

                        const listener = new listenerClass(configs);
                        tracer.addSpanListener(listener);
                        listeners.push(listener);
                    } else {
                        const listenerClass = LISTENERS[value];
                        if (!listenerClass) {
                            throw new Error('No listener found with name: ' + value);
                        }
                        const listener = new listenerClass({});
                        tracer.addSpanListener(listener);
                        listeners.push(listener);
                    }
                } catch (ex) {
                    ThundraLogger.getInstance().error(
                        `Cannot parse span listener def ${key} with reason: ${ex.message}`);
                }

                return listeners;
            }
        }
    }
}

export default Utils;
