const Module = require('module');
import Utils from '../../utils/Utils';
import ThundraLogger from '../../ThundraLogger';
import { NodejsModuleTypes } from '../../Constants';
import ConfigNames from '../../config/ConfigNames';
import ConfigProvider from '../../config/ConfigProvider';

export interface RequireTrace {

    readonly id: string;
    readonly parentId: string;
    readonly moduleId: string;
    readonly fileName: string;
    readonly moduleType: string;
    readonly depth: number;
    startTimestamp: number;
    finishTimestamp: number;
    duration: number;
    error: any;
    ignored: boolean;

}

let activated: boolean = false;
let originalRequire: Function;
let activeRequires: RequireTrace[] = [];
let tracedRequires: RequireTrace[] = [];
let minModuleDuration: number;
let maxModuleDepth: number;

function getModuleType(fileName: string): string {
    if (fileName.startsWith('/opt/')) {
        return NodejsModuleTypes.LAYER;
    } else if (fileName.startsWith('/var/runtime/')) {
        return NodejsModuleTypes.RUNTIME;
    } else if (fileName.includes('/')) {
        return NodejsModuleTypes.MODULE;
    } else {
        return NodejsModuleTypes.CORE;
    }
}

const traceRequire = function (moduleId: string): any {
    if (!activated) {
        return originalRequire.call(this, moduleId);
    }

    let originalRequireCalled: boolean = false;
    let res: any;
    try {
        const fileName: string = Module._resolveFilename(moduleId, this);
        if (ThundraLogger.isDebugEnabled()) {
            ThundraLogger.debug(`<ModuleLoadTracer> Loading ${moduleId} from ${fileName} ...`);
        }

        const moduleType: string = getModuleType(fileName);
        const id: string = Utils.generateId();
        const numOfActiveReqs: number = activeRequires.length;
        // Get parent require trace
        const parentReqTrace: RequireTrace | null =
            numOfActiveReqs === 0 ? null : activeRequires[numOfActiveReqs - 1];
        const parentId: string | null = parentReqTrace ? parentReqTrace.id : null;
        const ignored: boolean = parentReqTrace ? parentReqTrace.ignored : false;

        // Create new require trace
        const reqTrace: RequireTrace = {
            id,
            parentId,
            moduleId,
            fileName,
            moduleType,
            depth: numOfActiveReqs,
            ignored,
        } as RequireTrace;

        // Push new require traces onto stack as current require trace
        activeRequires.push(reqTrace);
        // Record current require trace
        tracedRequires.push(reqTrace);
        try {
            // Capture start timestamp of require
            reqTrace.startTimestamp = Date.now();
            originalRequireCalled = true;
            res = originalRequire.call(this, moduleId);
        } catch (err) {
            ThundraLogger.debug(`<ModuleLoadTracer> Error occurred while loading ${moduleId} from ${fileName}`, err);
            // Capture error occurred during require
            reqTrace.error = err;
            throw err;
        } finally {
            // Capture finish timestamp of require
            reqTrace.finishTimestamp = Date.now();
            // Capture duration of require
            reqTrace.duration = reqTrace.finishTimestamp - reqTrace.startTimestamp;
            if (reqTrace.duration < minModuleDuration) {
                reqTrace.ignored = true;
            }
            if (reqTrace.depth > maxModuleDepth) {
                reqTrace.ignored = true;
            }
            // Pop new require trace from stack as it is not current require trace anymore
            activeRequires.pop();
        }

        return res;
    } catch (err) {
        // Check whether there is an internal error from our module load tracer
        if (originalRequireCalled) {
            if (res) {
                ThundraLogger.debug(`<ModuleLoadTracer> Internal error occurred while loading ${moduleId}`, err);
                return res;
            } else {
                throw err;
            }
        } else {
            ThundraLogger.debug(`<ModuleLoadTracer> Internal error occurred while loading ${moduleId}`, err);
            return originalRequire.call(this, moduleId);
        }
    }
};

export function init(): void {
    minModuleDuration =
        ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_TRACE_COLDSTART_MODULE_LOAD_DURATION_MIN);
    maxModuleDepth =
        ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_TRACE_COLDSTART_MODULE_LOAD_DEPTH_MAX);
}

export function activate(): void {
    ThundraLogger.debug(`<ModuleLoadTracer> Activating ...`);

    if (activated) {
        ThundraLogger.debug(`<ModuleLoadTracer> Already activated`);
        return;
    }

    originalRequire = Module.prototype.require;
    Module.prototype.require = traceRequire;
    ThundraLogger.debug(`<ModuleLoadTracer> Patched require`);
    activated = true;

    ThundraLogger.debug(`<ModuleLoadTracer> Activated`);
}

export function reset(): void {
    ThundraLogger.debug(`<ModuleLoadTracer> Resetting ...`);

    tracedRequires = [];
    activeRequires = [];

    ThundraLogger.debug(`<ModuleLoadTracer> Reset`);
}

export function getTracedRequires(): RequireTrace[] {
    return tracedRequires;
}

export function deactivate(): void {
    ThundraLogger.debug(`<ModuleLoadTracer> Deactivating ...`);

    reset();

    if (!activated) {
        ThundraLogger.debug(`<ModuleLoadTracer> Not activated before`);
        return;
    }

    const currentRequire = Module.prototype.require;
    // Check whether another one has not patched require and override ours
    if (currentRequire === traceRequire) {
        Module.prototype.require = originalRequire;
        ThundraLogger.debug(`<ModuleLoadTracer> Switched to original require`);
    }
    activated = false;

    ThundraLogger.debug(`<ModuleLoadTracer> Deactivated`);
}
