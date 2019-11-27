import { readFile } from 'fs';
import * as os from 'os';
import {
    DATA_MODEL_VERSION, PROC_IO_PATH, PROC_STAT_PATH,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, envVariableKeys,
    LISTENERS, AGENT_VERSION,
} from '../../Constants';
import ThundraSpanContext from '../../opentracing/SpanContext';
import Reference from 'opentracing/lib/reference';
import * as opentracing from 'opentracing';
import MonitorDataType from '../data/base/MonitoringDataType';
import BaseMonitoringData from '../data/base/BaseMonitoringData';
import MonitoringDataType from '../data/base/MonitoringDataType';
import InvocationData from '../data/invocation/InvocationData';
import MetricData from '../data/metric/MetricData';
import SpanData from '../data/trace/SpanData';
import LogData from '../data/log/LogData';
import ThundraLogger from '../../ThundraLogger';
import ApplicationSupport from '../support/ApplicationSupport';
import ThundraTracer from '../../opentracing/Tracer';
import CompositeMonitoringData from '../data/composite/CompositeMonitoringData';
import InvocationSupport from '../support/InvocationSupport';

const parse = require('module-details-from-path');
const uuidv4 = require('uuid/v4');
const zlib = require('zlib');
const koalas = require('koalas');

declare var __non_webpack_require__: any;
const customReq = typeof __non_webpack_require__ !== 'undefined'
                        ?  __non_webpack_require__
                        : require;

class Utils {
    static generateId(): string {
        return uuidv4();
    }

    static generateReport(data: any, apiKey: string) {
        return {
            data,
            type: data.type,
            apiKey,
            dataModelVersion: DATA_MODEL_VERSION,
        };
    }

    static getConfiguration(key: string, defaultValue?: any): any {
        return process.env[key] ? process.env[key] : defaultValue;
    }

    static getNumericConfiguration(key: string, defaultValue?: number): number {
        return koalas(parseInt(Utils.getConfiguration(key, defaultValue), 10));
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

    static isString(value: any): boolean {
        return typeof value === 'string' || value instanceof String;
    }

    static capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
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
        if (!Utils.isString(error.errorMessage)) {
            error.errorMessage = JSON.stringify(error.errorMessage);
        }

        error.stack = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_ERROR_STACK_TRACE) ?  '' :  error.stack;

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

    static readProcNetworkIoSync(procId: number) {
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

    static tryRequire(name: string, paths?: string[]): any {
        try {
            let resolvedPath;
            if (paths !== undefined) {
                resolvedPath = customReq.resolve(name, { paths });
            } else {
                resolvedPath = customReq.resolve(name);
            }
            return customReq(resolvedPath);
        // tslint:disable-next-line:no-empty
        } catch (err) {}
    }

    static getModuleInfo(name: string, paths?: string[]): any {
        try {
            let modulePath;
            if (paths !== undefined) {
                modulePath = customReq.resolve(name, { paths });
            } else {
                modulePath = customReq.resolve(name);
            }

            return parse(modulePath);
        } catch (err) {
            return {};
        }
    }

    static initMonitoringData(pluginContext: any, type: MonitoringDataType): BaseMonitoringData {
        const monitoringData = this.createMonitoringData(type);

        const domainName = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_DOMAIN_NAME);
        const className = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_CLASS_NAME);
        const stage = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_STAGE);
        const applicationId = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_ID);
        const applicationName = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_NAME);
        const applicationVersion = Utils.getConfiguration(envVariableKeys.THUNDRA_APPLICATION_VERSION);

        monitoringData.id = Utils.generateId();
        monitoringData.agentVersion = AGENT_VERSION;
        monitoringData.dataModelVersion = DATA_MODEL_VERSION;
        monitoringData.applicationInstanceId = pluginContext ? pluginContext.applicationInstanceId : '';
        monitoringData.applicationId = applicationId ? applicationId : (pluginContext ? pluginContext.applicationId : '');
        monitoringData.applicationDomainName = domainName ? domainName : LAMBDA_APPLICATION_DOMAIN_NAME;
        monitoringData.applicationClassName = className ? className : LAMBDA_APPLICATION_CLASS_NAME;
        monitoringData.applicationName = applicationName ? applicationName :
            (InvocationSupport.getFunctionName() ? InvocationSupport.getFunctionName() : '');
        monitoringData.applicationVersion = applicationVersion ? applicationVersion :
            (pluginContext ? pluginContext.applicationVersion : '');
        monitoringData.applicationStage = stage ? stage : '';
        monitoringData.applicationRuntimeVersion = process.version;

        monitoringData.applicationTags = { ...monitoringData.applicationTags, ...ApplicationSupport.applicationTags };

        return monitoringData;
    }

    static initCompositeMonitoringData(data: BaseMonitoringData): CompositeMonitoringData {
        const monitoringData = this.createMonitoringData(MonitorDataType.COMPOSITE);

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
                monitoringData = new SpanData();
                break;
            case MonitorDataType.LOG:
                monitoringData = new LogData();
                break;
            case MonitorDataType.COMPOSITE:
                monitoringData = new CompositeMonitoringData();
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
                    let value = process.env[key];

                    if (!value.startsWith('{')) {
                        // Span listener config is given encoded
                        value = this.decodeSpanListenerConfig(value);
                    }

                    const listenerDef = JSON.parse(value);
                    const listenerClass = LISTENERS[listenerDef.type];
                    const listenerConfig = listenerDef.config;

                    const listenerInstance = new listenerClass(listenerConfig);

                    tracer.addSpanListener(listenerInstance);
                    listeners.push(listenerInstance);
                } catch (ex) {
                    ThundraLogger.getInstance().error(
                        `Cannot parse span listener def ${key} with reason: ${ex.message}`);
                }
            }
        }

        return listeners;
    }

    static decodeSpanListenerConfig(encoded: string) {
        const buffer = Buffer.from(encoded, 'base64');
        const spanListenerConfig = zlib.unzipSync(buffer).toString();

        return spanListenerConfig;
    }

    static stripCommonFields(monitoringData: BaseMonitoringData) {
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

    static getAWSAccountNo(arn: string) {
        return Utils.getARNPart(arn, 4);
    }

    static getAWSRegion(arn: string) {
        return Utils.getARNPart(arn, 3);
    }

    static getAccountNo(arn: string, pluginContext: any) {
        if (Utils.getIfSAMLocalDebugging()) {
            return 'sam_local';
        } else if (Utils.getIfSLSLocalDebugging()) {
            return 'sls_local';
        } else {
            return (Utils.getAWSAccountNo(arn)
                || pluginContext.apiKey
                || 'guest');
        }
    }

    static getApplicationId(originalContext: any, pluginContext: any) {
        const arn = originalContext.invokedFunctionArn;
        const region = Utils.getConfiguration(envVariableKeys.AWS_REGION)
            || 'local';
        const accountNo = Utils.getAccountNo(arn, pluginContext);
        const functionName = originalContext.functionName
            || Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_FUNCTION_NAME)
            || 'lambda-app';

        return `aws:lambda:${region}:${accountNo}:${functionName}`;
    }

    static getARNPart(arn: string, index: number) {
        try {
            return arn.split(':')[index];
        } catch (error) {
            return '';
        }
    }

    static getIfSAMLocalDebugging() {
        return Utils.getConfiguration(envVariableKeys.AWS_SAM_LOCAL) === 'true';
    }

    static getIfSLSLocalDebugging() {
        return Utils.getConfiguration(envVariableKeys.SLS_LOCAL) === 'true';
    }

    static getXRayTraceInfo() {
        let traceID: string = '';
        let segmentID: string = '';
        const xrayTraceHeader: string = Utils.getConfiguration(envVariableKeys._X_AMZN_TRACE_ID);
        if (xrayTraceHeader) {
            for (const traceHeaderPart of xrayTraceHeader.split(';')) {
                const traceInfo = traceHeaderPart.split('=');
                if (traceInfo.length !== 2) {
                    continue;
                }
                const [traceInfoKey, traceInfoVal] = traceInfo;

                if (traceInfoKey === 'Root') {
                    traceID = traceInfoVal;
                } else if (traceInfoKey === 'Parent') {
                    segmentID = traceInfoVal;
                }
            }
        }

        return {
            traceID,
            segmentID,
        };
    }
}

export default Utils;
