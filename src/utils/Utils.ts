import {readFile} from 'fs';
import * as os from 'os';
import {
    DATA_MODEL_VERSION, PROC_IO_PATH, PROC_STAT_PATH,
    EnvVariableKeys,
    LISTENERS, AGENT_VERSION,
} from '../Constants';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import ThundraSpanContext from '../opentracing/SpanContext';
import Reference from 'opentracing/lib/reference';
import * as opentracing from 'opentracing';
import MonitorDataType from '../plugins/data/base/MonitoringDataType';
import BaseMonitoringData from '../plugins/data/base/BaseMonitoringData';
import MonitoringDataType from '../plugins/data/base/MonitoringDataType';
import InvocationData from '../plugins/data/invocation/InvocationData';
import MetricData from '../plugins/data/metric/MetricData';
import SpanData from '../plugins/data/trace/SpanData';
import LogData from '../plugins/data/log/LogData';
import ThundraLogger from '../ThundraLogger';
import CompositeMonitoringData from '../plugins/data/composite/CompositeMonitoringData';
import ModuleVersionValidator from '../plugins/integrations/ModuleVersionValidator';
import {ApplicationManager} from '../application/ApplicationManager';
import { ApplicationInfo } from '../application/ApplicationInfo';

const parse = require('module-details-from-path');
const uuidv4 = require('uuid/v4');
const zlib = require('zlib');
const Hook = require('require-in-the-middle');
const path = require('path');

declare var __non_webpack_require__: any;
const customReq = typeof __non_webpack_require__ !== 'undefined'
    ? __non_webpack_require__
    : require;
const thundraWrapped = '__thundra_wrapped';

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

    static getEnvVar(key: string, defaultValue?: any): any {
        return process.env[key] ? process.env[key] : defaultValue;
    }

    static getNumericEnvVar(key: string, defaultValue?: number): number {
        return parseInt(Utils.getEnvVar(key, defaultValue), 10);
    }

    static setEnvVar(key: string, value: any): void {
        process.env[key] = value;
    }

    static deleteEnvVar(key: string): void {
        delete process.env[key];
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
        const error: any = {errorMessage: '', errorType: 'Unknown Error', stack: null, code: 0};
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

        const maskErrorStackTrace = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_ERROR_STACKTRACE_MASK);
        error.stack = maskErrorStackTrace ? '' : error.stack;

        return error;
    }

    static readProcMetricPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_STAT_PATH, (err, file) => {
                const procStatData = {
                    threadCount: 0,
                };

                if (err) {
                    ThundraLogger.error(`Cannot read ${PROC_STAT_PATH} file. Setting Thread Metrics to 0.`);
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
                    ThundraLogger.error(`Cannot read ${PROC_IO_PATH} file. Setting Metrics to 0.`);
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
                    ThundraLogger.error(`Cannot read ${PROC_IO_PATH} file. Setting Metrics to 0.`);
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
                    ThundraLogger.error(`Expected ${ref} to be an instance of opentracing.Reference`);
                    break;
                }
                const spanContext = ref.referencedContext();

                if (!(spanContext instanceof ThundraSpanContext)) {
                    ThundraLogger.error(`Expected ${spanContext} to be an instance of SpanContext`);
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
            if (paths) {
                resolvedPath = customReq.resolve(name, {paths});
            } else {
                resolvedPath = customReq.resolve(name);
            }
            return customReq(resolvedPath);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }
    }

    static getModuleInfo(name: string, paths?: string[]): any {
        try {
            let modulePath;
            if (paths !== undefined) {
                modulePath = customReq.resolve(name, {paths});
            } else {
                modulePath = customReq.resolve(name);
            }

            return parse(modulePath);
        } catch (err) {
            return {};
        }
    }

    static doInstrument(lib: any, libs: any[], basedir: string, moduleName: string,
                        version: string, wrapper: any, config?: any): any {
        let isValid = false;
        if (version) {
            const moduleValidator = new ModuleVersionValidator();
            const isValidVersion = moduleValidator.validateModuleVersion(basedir, version);
            if (!isValidVersion) {
                ThundraLogger.error(
                    `Invalid module version for ${moduleName} integration. Supported version is ${version}`);
            } else {
                isValid = true;
            }
        } else {
            isValid = true;
        }
        if (isValid) {
            if (!lib[thundraWrapped]) {
                wrapper(lib, config, moduleName);
                lib[thundraWrapped] = true;
                libs.push(lib);
            }
        }
    }

    static instrument(moduleNames: string[], version: string, wrapper: any,
                      unwrapper?: any, config?: any, paths?: string[], fileName?: string): any {
        const libs: any[] = [];
        const hooks: any[] = [];
        for (const moduleName of moduleNames) {
            const requiredLib = Utils.tryRequire(fileName ? path.join(moduleName, fileName) : moduleName, paths);
            if (requiredLib) {
                if (version) {
                    const {basedir} = Utils.getModuleInfo(moduleName);
                    if (!basedir) {
                        ThundraLogger.error(`Base directory is not found for the package ${moduleName}`);
                        return;
                    }
                    Utils.doInstrument(requiredLib, libs, basedir, moduleName, version, wrapper, config);
                } else {
                    Utils.doInstrument(requiredLib, libs, null, moduleName, null, wrapper, config);
                }
            }
            const hook = Hook(moduleName, {internals: true}, (lib: any, name: string, basedir: string) => {
                if (name === moduleName) {
                    Utils.doInstrument(lib, libs, basedir, moduleName, version, wrapper, config);
                }
                return lib;
            });
            hooks.push(hook);
        }
        return {
            uninstrument: () => {
                for (const lib of libs) {
                    if (unwrapper) {
                        unwrapper(lib, config);
                    }
                    delete lib[thundraWrapped];
                }
                for (const hook of hooks) {
                    hook.unhook();
                }
            },
        };
    }

    static initMonitoringData(pluginContext: any, type: MonitoringDataType): BaseMonitoringData {
        const monitoringData = this.createMonitoringData(type);

        const applicationInfo = ApplicationManager.getApplicationInfo();

        monitoringData.id = Utils.generateId();
        monitoringData.agentVersion = AGENT_VERSION;
        monitoringData.dataModelVersion = DATA_MODEL_VERSION;
        monitoringData.applicationInstanceId = applicationInfo.applicationInstanceId;
        monitoringData.applicationId = applicationInfo.applicationId;
        monitoringData.applicationName = applicationInfo.applicationName;
        monitoringData.applicationClassName = applicationInfo.applicationClassName;
        monitoringData.applicationDomainName = applicationInfo.applicationDomainName;
        monitoringData.applicationStage = applicationInfo.applicationStage;
        monitoringData.applicationVersion = applicationInfo.applicationVersion;
        monitoringData.applicationRuntimeVersion = process.version;

        monitoringData.applicationTags = {
            ...monitoringData.applicationTags,
            ...applicationInfo.applicationTags,
        };

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

    static createSpanListeners(): any[] {
        const listeners: any[] = [];
        for (const key of ConfigProvider.names()) {
            if (key.startsWith(ConfigNames.THUNDRA_TRACE_SPAN_LISTENERCONFIG)) {
                try {
                    let value = ConfigProvider.get<string>(key);

                    if (!value.startsWith('{')) {
                        // Span listener config is given encoded
                        value = this.decodeSpanListenerConfig(value);
                    }

                    const listenerDef = JSON.parse(value);
                    const listenerClass = LISTENERS[listenerDef.type];
                    const listenerConfig = listenerDef.config;
                    const listenerInstance = new listenerClass(listenerConfig);

                    listeners.push(listenerInstance);
                } catch (ex) {
                    ThundraLogger.error(
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

    static getXRayTraceInfo() {
        let traceID: string = '';
        let segmentID: string = '';
        const xrayTraceHeader: string = Utils.getEnvVar(EnvVariableKeys._X_AMZN_TRACE_ID);
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

    static normalizeFunctionName(fullName: string) {
        const parts = fullName.split(':');

        if (parts.length === 0 || parts.length === 1) { // funcName
            return {name: fullName};
        } else if (parts.length === 2) { // funcName:qualifier
            return {name: parts[0], qualifier: parts[1]};
        } else if (parts.length === 3) { // accountId:function:funcName
            return {name: parts[2]};
        } else if (parts.length === 4) { // accountId:function:funcName:qualifier
            return {name: parts[2], qualifier: parts[3]};
        } else if (parts.length === 7) { // arn:aws:lambda:region:accountId:function:funcName
            return {name: parts[6]};
        } else if (parts.length === 8) { // arn:aws:lambda:region:accountId:function:funcName:qualifier
            return {name: parts[6], qualifier: parts[7]};
        }
    }

    static isValidHTTPResponse(response: any) {
        if (!response) {
            return false;
        }
        return response.statusCode && typeof response.statusCode === 'number';
    }

    static getApplicationTags(): any {
        const applicationTags: any = {};
        for (const key of ConfigProvider.names()) {
            if (key.startsWith(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX)) {
                try {
                    const propsKey = key.substring(ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX.length);
                    const propsValue = ConfigProvider.get<any>(key);
                    if (isNaN(parseFloat(propsValue))) {
                        if (propsValue === 'true' || propsValue === 'false') {
                            applicationTags[propsKey] = propsValue === 'true' ? true : false;
                        } else {
                            applicationTags[propsKey] = propsValue;
                        }
                    } else {
                        applicationTags[propsKey] = parseFloat(propsValue);
                    }
                } catch (ex) {
                    ThundraLogger.error(`Cannot parse application tag ${key}`);
                }
            }
        }
        return applicationTags;
    }

    static mergeApplicationInfo(updates: any = {}, applicationInfo: ApplicationInfo) {
        const newAppInfo: ApplicationInfo = {...applicationInfo};
        newAppInfo.applicationId = updates.applicationId || applicationInfo.applicationId;
        newAppInfo.applicationInstanceId = updates.applicationInstanceId || applicationInfo.applicationInstanceId;
        newAppInfo.applicationName = updates.applicationName || applicationInfo.applicationName;
        newAppInfo.applicationClassName = updates.applicationClassName || applicationInfo.applicationClassName;
        newAppInfo.applicationDomainName = updates.applicationDomainName || applicationInfo.applicationDomainName;
        newAppInfo.applicationRegion = updates.applicationRegion || applicationInfo.applicationRegion;
        newAppInfo.applicationStage = updates.applicationStage || applicationInfo.applicationStage;
        newAppInfo.applicationVersion = updates.applicationVersion || applicationInfo.applicationVersion;
        newAppInfo.applicationTags = updates.applicationTags || applicationInfo.applicationTags;

        return newAppInfo;
    }

}

export default Utils;
