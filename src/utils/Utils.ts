import { readFile } from 'fs';
import * as os from 'os';
import {
    DATA_MODEL_VERSION,
    PROC_IO_PATH,
    PROC_STAT_PATH,
    EnvVariableKeys,
    LISTENERS, AGENT_VERSION,
    AGENT_UUID_CONST,
    DEFAULT_APPLICATION_NAME,
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
import { ApplicationManager } from '../application/ApplicationManager';
import { ApplicationInfo } from '../application/ApplicationInfo';
import ThundraSpanListener from '../listeners/ThundraSpanListener';
import PluginContext from '../plugins/PluginContext';

import { v4 as uuidv4 } from 'uuid';
import { v5 as uuidv5 } from 'uuid';
const zlib = require('zlib');

const globalAppID = uuidv4();

/**
 * Common/global utilities
 */
class Utils {

    private constructor() {
    }

    /**
     * Generates id in UUID format.
     * @return {string} generated id
     */
    static generateId(): string {
        return uuidv4();
    }

    /**
     * Generates id in UUID format with given value
     * @param value value
     */
    static generareIdFrom(value: string): string {
        return uuidv5(value, AGENT_UUID_CONST);
    }

    /**
     * Generates short id in UUID format.
     * @return {string} generated short id
     */
    static generateShortUuid(): string {
        return Utils.generateId().substring(0, 8);
    }

    /**
     * Generates monitoring data
     * @param data the monitoring data itself
     * @param {string} apiKey the Thundra API key
     */
    static generateReport(data: any, apiKey: string) {
        return {
            data,
            type: data.type,
            apiKey,
            dataModelVersion: DATA_MODEL_VERSION,
        };
    }

    /**
     * Gets the environment variable
     * @param {string} name the name of the environment variable
     * @param defaultValue default value for the environment variable
     */
    static getEnvVar(name: string, defaultValue?: any): any {
        return process.env[name] ? process.env[name] : defaultValue;
    }

    /**
     * Gets the environment variable as number
     * @param {string} name the name of the environment variable
     * @param defaultValue default value for the environment variable
     */
    static getNumericEnvVar(name: string, defaultValue?: number): number {
        return parseInt(Utils.getEnvVar(name, defaultValue), 10);
    }

    /**
     * Sets the environment variable
     * @param {string} name the name of the environment variable
     * @param value the value of the environment variable
     */
    static setEnvVar(name: string, value: any): void {
        process.env[name] = value;
    }

    /**
     * Deletes/removes the environment variable
     * @param name the name of the environment variable
     */
    static deleteEnvVar(name: string): void {
        delete process.env[name];
    }

    /**
     * Measures and gets the CPU usage metrics
     * @return the CPU usage metrics
     */
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

    /**
     * Measures and gets the CPU load metrics
     * @param start CPU usage metrics on start
     * @param end CPU usage metrics on end
     * @param {number} clockTick the number of CPU clock ticks per second
     * @return the CPU load metrics
     */
    static getCpuLoad(start: any, end: any, clockTick: number) {
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

    /**
     * Reads metrics of current process metrics
     * @return {Promise} the {@link Promise} to get metrics of current process
     */
    static readProcMetricPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_STAT_PATH, (err, file) => {
                const procStatData = {
                    threadCount: 0,
                };

                if (err) {
                    ThundraLogger.error(
                        `<Utils> Cannot read ${PROC_STAT_PATH} file. Setting Thread Metrics to 0:`, err);
                } else {
                    const procStatArray = file.toString().split(' ');
                    procStatData.threadCount = parseInt(procStatArray[19], 0);
                }

                return resolve(procStatData);
            });
        });
    }

    /**
     * Reads IO metrics of current process
     * @return {Promise} the {@link Promise} to get IO metrics of current process
     */
    static readProcIoPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_IO_PATH, (err, file) => {
                const procIoData = {
                    readBytes: 0,
                    writeBytes: 0,
                };

                if (err) {
                    ThundraLogger.error(`<Utils> Cannot read ${PROC_IO_PATH} file. Setting Metrics to 0:`, err);
                } else {
                    const procIoArray = file.toString().split('\n');
                    procIoData.readBytes = parseInt(procIoArray[4].substr(procIoArray[4].indexOf(' ') + 1), 0);
                    procIoData.writeBytes = parseInt(procIoArray[5].substr(procIoArray[5].indexOf(' ') + 1), 0);
                }

                return resolve(procIoData);
            });
        });
    }

    /**
     * Checks whether the given value is {@link string} or not
     * @param value the value to be checked
     * @return {@code true} if the given value is {@link string}, {@code false} otherwise
     */
    static isString(value: any): boolean {
        return typeof value === 'string' || value instanceof String;
    }

    /**
     * To make lower case the given {@link string} value
     * @param {string} value the {@link string} value to be lower case
     * @return {string} the lower cased {@link string} value
     */
    static makeLowerCase(value: string): string {
        return value.charAt(0).toLowerCase() + value.slice(1);
    }

    /**
     * Capitalizes the given {@link string} value
     * @param {string} value the {@link string} value to be capitalized
     * @return {string} the capitalized {@link string} value
     */
    static capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    /**
     * Check parameter is error
     * @param err the error to be checked
     * @return parameter is error
     */
    static isError(err: any): boolean {
        return err && err.stack && err.message;
    }

    /**
     * Parses/processes given error to generate new error
     * @param err the error to be parsed
     * @return the generated error
     */
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

        const maskErrorStackTrace = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_ERROR_STACKTRACE_MASK);
        error.stack = maskErrorStackTrace ? '' : error.stack;

        return error;
    }

    /**
     * Builds {@link Error} from given error
     * @param err the error to be used for building {@link Error}
     * @return the built {@link Error}
     */
    static buildError(err: any): Error {
        if (err instanceof Error) {
            return err;
        }
        if (typeof err === 'string') {
            return new Error(err.toString());
        } else {
            const e = new Error(err.message);
            if (err.name) {
                e.name = err.name;
            }
            if (err.stack) {
                e.stack = err.stack;
            }
            return e;
        }
    }

    /**
     * Gets parent {@link ThundraSpanContext} by following given references
     * @param references the references to follow
     * @return {ThundraSpanContext} the parent {@link ThundraSpanContext}
     */
    static getParentContext(references: any): ThundraSpanContext {
        let parent: ThundraSpanContext = null;
        if (references) {
            for (const ref of references) {
                if (!(ref instanceof Reference)) {
                    ThundraLogger.error(`<Utils> Expected ${ref} to be an instance of opentracing.Reference`);
                    break;
                }
                const spanContext = ref.referencedContext();

                if (!(spanContext instanceof ThundraSpanContext)) {
                    ThundraLogger.error(`<Utils> Expected ${spanContext} to be an instance of ThundraSpanContext`);
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

    /**
     * Creates and initializes monitoring data according to given {@link MonitoringDataType}
     * @param {PluginContext} pluginContext the {@link PluginContext} to be used for initializing monitoring data
     * @param {MonitoringDataType} type the type of the monitoring data
     * @return {BaseMonitoringData} the created and initialized monitoring data
     */
    static initMonitoringData(pluginContext: PluginContext, type: MonitoringDataType): BaseMonitoringData {
        const monitoringData: BaseMonitoringData = this.createMonitoringData(type);

        monitoringData.id = Utils.generateId();
        Utils.injectCommonApplicationProperties(monitoringData);

        return monitoringData;
    }

    /**
     * Injects common application properties into given {@link BaseMonitoringData} monitoring data
     * @param {BaseMonitoringData} monitoringData the @link BaseMonitoringData} monitoring data
     *        in which common application properties will be injected to
     */
    static injectCommonApplicationProperties(monitoringData: BaseMonitoringData) {
        const applicationInfo = ApplicationManager.getApplicationInfo();

        monitoringData.agentVersion = AGENT_VERSION;
        monitoringData.dataModelVersion = DATA_MODEL_VERSION;
        monitoringData.applicationRuntimeVersion = process.version;
        if (applicationInfo) {
            monitoringData.applicationInstanceId = applicationInfo.applicationInstanceId;
            monitoringData.applicationId = applicationInfo.applicationId;
            monitoringData.applicationName = applicationInfo.applicationName;
            monitoringData.applicationClassName = applicationInfo.applicationClassName;
            monitoringData.applicationDomainName = applicationInfo.applicationDomainName;
            monitoringData.applicationStage = applicationInfo.applicationStage;
            monitoringData.applicationVersion = applicationInfo.applicationVersion;
            monitoringData.applicationTags = {
                ...monitoringData.applicationTags,
                ...applicationInfo.applicationTags,
            };
        }
    }

    /**
     * Creates monitoring data according to given {@link MonitoringDataType}
     * @param {MonitoringDataType} type the type of the monitoring data
     * @return {BaseMonitoringData} the created monitoring data
     */
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

    /**
     * Returns {@link Promise} to sleep as given time
     * @param {number} milliseconds the duration in milliseconds to sleep
     * @return {Promise} the {@link Promise} to await for sleeping as given time
     */
    static sleep(milliseconds: number): Promise<number> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    /**
     * Generates random number
     * @param {number} bound upper bound for generated number
     * @return {number} the generated random number
     */
    static getRandomNumber(bound: number): number {
        return 1 + Math.floor(Math.random() * bound);
    }

    /**
     * Detects and creates {@link ThundraSpanListener}s from configurations
     * @return {ThundraSpanListener[]} the {@link ThundraSpanListener}s
     */
    static createSpanListeners(): any[] {
        const listeners: ThundraSpanListener[] = [];
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
                } catch (e) {
                    ThundraLogger.error(`<Utils> Cannot parse span listener definition of ${key}:`, e);
                }
            }
        }

        return listeners;
    }

    /**
     * Gets the AWS X-Ray trace info
     * @return the AWS X-Ray trace info
     */
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

    /**
     * Checks whether the given response is a valid HTTP response
     * @param response the response to be checked
     * @return {boolean} {@code true} if the given response is a valid HTTP response, {@code false} otherwise
     */
    static isValidHTTPResponse(response: any) {
        if (!response) {
            return false;
        }
        return response.statusCode && typeof response.statusCode === 'number';
    }

    /**
     * Detects and gets application tags from configurations
     * @return the application tags
     */
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
                } catch (e) {
                    ThundraLogger.error(`<Utils> Cannot parse application tag ${key}:`, e);
                }
            }
        }
        return applicationTags;
    }

    static getAppInfoFromConfig(): ApplicationInfo {
        const applicationId = ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_ID);
        const applicationClassName = ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_CLASS_NAME);
        const applicationDomainName = ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_DOMAIN_NAME);
        const applicationRegion = ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_REGION);
        const applicationVersion = ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_VERSION);
        const applicationStage = ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_STAGE);

        return {
            ...(applicationId ? { applicationId } : undefined),
            applicationInstanceId: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_INSTANCE_ID) || globalAppID,
            applicationName: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_NAME) || DEFAULT_APPLICATION_NAME,
            ...(applicationClassName ? { applicationClassName } : undefined),
            ...(applicationDomainName ? { applicationDomainName } : undefined),
            ...(applicationRegion ? { applicationRegion } : undefined),
            ...(applicationVersion ? { applicationVersion } : undefined),
            ...(applicationStage ? { applicationStage } : undefined),
            applicationTags: Utils.getApplicationTags(),
        };
    }

    /**
     * Merges given updates into given {@link ApplicationInfo}
     * @param updates the updates to merge into given {@link ApplicationInfo}
     * @param {ApplicationInfo} applicationInfo the {@link ApplicationInfo} to be merged into
     * @return {ApplicationInfo} the final {@link ApplicationInfo} after merge
     */
    static mergeApplicationInfo(updates: any = {}, applicationInfo: ApplicationInfo) {
        const newAppInfo: ApplicationInfo = { ...applicationInfo };
        newAppInfo.applicationInstanceId = updates.applicationInstanceId || applicationInfo.applicationInstanceId || globalAppID;
        newAppInfo.applicationName = updates.applicationName || applicationInfo.applicationName || DEFAULT_APPLICATION_NAME;
        newAppInfo.applicationClassName = updates.applicationClassName || applicationInfo.applicationClassName || '';
        newAppInfo.applicationDomainName = updates.applicationDomainName || applicationInfo.applicationDomainName || '';
        newAppInfo.applicationRegion = updates.applicationRegion || applicationInfo.applicationRegion || '';
        newAppInfo.applicationStage = updates.applicationStage || applicationInfo.applicationStage || '';
        newAppInfo.applicationVersion = updates.applicationVersion || applicationInfo.applicationVersion || '';
        newAppInfo.applicationTags = updates.applicationTags || applicationInfo.applicationTags;
        newAppInfo.applicationId = updates.applicationId || applicationInfo.applicationId;

        return newAppInfo;
    }

    static copyProperties(src: any, srcProps: any[], dest: any, destProps: any[]) {
        if (!src || !dest || typeof src !== 'object') {
            return;
        }

        if (srcProps.length !== destProps.length) {
            return;
        }

        for (let i = 0; i < srcProps.length; i++) {
            const srcProp = srcProps[i];
            const destProp = destProps[i];

            dest[destProp] = src[srcProp];
        }
    }

    /**
     * Serializes given data as JSON
     * @param data the data to be serialized as JSON
     * @return {string} the generated JSON
     */
    static serializeJSON(data: any): string {
        return JSON.stringify(data, Utils.getCircularReplacer());
    }

    static getNormalizedPath(pathStr: string, depth: number): string {
        try {
            if (!pathStr || pathStr === '' || depth <= 0) {
                return '';
            }
            const normalizedPath = '/' + pathStr.split('/').filter((c) => c !== '').slice(0, depth).join('/');
            return normalizedPath;
        } catch (error) {
            ThundraLogger.error(`Couldn't normalize the given path: ${pathStr}, for depth value: ${depth}`);
            return pathStr;
        }
    }

    private static decodeSpanListenerConfig(encoded: string) {
        const buffer = Buffer.from(encoded, 'base64');
        const spanListenerConfig = zlib.unzipSync(buffer).toString();

        return spanListenerConfig;
    }

    private static getCircularReplacer(): (key: string, value: any) => any {
        const seen: WeakSet<any> = new WeakSet<any>();
        return (key: string, value: any) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    }
}

export default Utils;
