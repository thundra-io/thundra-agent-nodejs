import TraceConfig from '../../plugins/config/TraceConfig';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../Span';
import {ThundraSourceCodeInstrumenter, TraceableConfig} from '@thundra/instrumenter';
import { MethodTags, LineByLineTags } from '../../Constants';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import Utils from '../../utils/Utils';
import { SpanOptions } from 'opentracing/lib/tracer';

const Module = require('module');
const path = require('path');
const get = require('lodash.get');
const sizeof = require('object-sizeof');
const copy = require('fast-copy');

const TRACE_DEF_SEPARATOR: string = '.';
const MAX_LINES: number = 100;
const MAX_VAR_VALUE_SIZE: number = 8192; // 8KB
const MAX_ELEMENTS: number = 100;
const MAX_PROPS: number = 20;

/**
 * Instruments specified/configured modules/method during load time
 */
class Instrumenter {

    private traceableConfigs: TraceableConfig[];
    private traceableConfigPrefix: string;
    private origCompile: any;
    private sourceCodeInstrumenter: ThundraSourceCodeInstrumenter;

    constructor(traceConfig: TraceConfig) {
        this.traceableConfigs = get(traceConfig, 'traceableConfigs');
        this.traceableConfigPrefix = ConfigProvider.get<string>(ConfigNames.THUNDRA_TRACE_INSTRUMENT_FILE_PREFIX);

        this.sourceCodeInstrumenter = new ThundraSourceCodeInstrumenter(this.traceableConfigs, this.traceableConfigPrefix);
    }

    /**
     * Hooks itself into module load cycle to instrument specified/configured modules/methods
     */
    hookModuleCompile() {
        this.setGlobalFunction();

        const traceableConfigsSpecified: boolean =
            Array.isArray(this.traceableConfigs) && this.traceableConfigs.length > 0;
        if (traceableConfigsSpecified) {
            const compile = Module.prototype._compile;

            if (compile._thundra) {
                ThundraLogger.debug('<Instrumenter> Already wrapped, skipped hooking module compile');
                // If already hooked into compile phase, don't hook again
                return;
            }

            ThundraLogger.debug('<Instrumenter> Hooking module compile ...');

            const self = this;
            this.origCompile = compile;

            const thundraCompile = function (content: any, filename: any) {
                content = self.instrument(filename, content);

                self.origCompile.call(this, content, filename);
            };
            Object.defineProperty(thundraCompile, '_thundra', {
                value: true,
                writable: false,
            });
            Module.prototype._compile = thundraCompile;
        }
    }

    /**
     * Instruments the given JS code.
     *
     * @param filename  name of the file
     * @param code      the code to be instrumented
     * @return {string}the instrumented code
     */
    instrument(filename: string, code: string): string {
        const relPath = path.relative(process.cwd(), filename);
        let relPathWithDots = relPath.replace(/\//g, TRACE_DEF_SEPARATOR);
        relPathWithDots = relPathWithDots.replace('.js', '');
        relPathWithDots = relPathWithDots.replace('.ts', '');

        const sci = this.sourceCodeInstrumenter;

        if (sci.shouldTraceFile(relPathWithDots)) {
            ThundraLogger.debug('<Instrumenter> Instrumenting file', filename, 'at', relPath);
            let wrapped = true;
            if (Module.wrapper.length === 2) {
                code = Module.wrapper[0] + '\n' + code + Module.wrapper[1];
            } else {
                wrapped = false;
            }
            try {
                code = sci.addTraceHooks(code, relPathWithDots, wrapped, filename);
                if (Module.wrapper.length === 2) {
                    code = code.substring(Module.wrapper[0].length, code.length - Module.wrapper[1].length);
                }
                ThundraLogger.debug('<Instrumenter> Instrumented file', filename, 'at', relPath, ':', code);
            } catch (e) {
                ThundraLogger.error(
                    '<Instrumenter> Error occurred while instrumenting file', filename, 'at', relPath, ':', e);
            }
        }

        return code;
    }

    /**
     * Unhooks itself from module load cycle
     */
    unhookModuleCompile() {
        // `origCompile` is set only if it is already wrapped by Thundra compiler.
        // If it is not set, this means that Thundra is not hooked,
        // so there is nothing to do for unhook
        if (this.origCompile) {
            ThundraLogger.debug('<Instrumenter> Unhooking module compile');
            Module.prototype._compile = this.origCompile;
        } else {
            ThundraLogger.debug('<Instrumenter> Not wrapped, skipped unhooking module compile');
        }
    }

    /**
     * Sets the global function
     * @param glob the global
     */
    setGlobalFunction(glob?: NodeJS.Global) {
        const me = this;
        const g = glob || global;
        g.__thundraTraceEntry__ = function (args: any) {
            const { tracer } = ExecutionContextManager.get();
            if (!tracer) {
                return;
            }
            let methodName = null;
            try {
                methodName = args.path + '/' + args.name;
                const span = tracer.startSpan(
                    methodName,
                    {
                        className: 'Method',
                    } as SpanOptions) as ThundraSpan;

                ThundraLogger.debug('<Instrumenter> On trace entry of method', methodName);

                const spanArguments: Argument[] = [];

                if (args.args) {
                    for (let i = 0; i < args.args.length; i++) {
                        const argValue = args.args[i];
                        const argType = typeof argValue;
                        const packedArgValue = me.packValue(argValue);
                        spanArguments.push(new Argument(args.argNames[i], argType, packedArgValue));
                    }
                }

                span.setTag(MethodTags.ARGS, spanArguments);
                span.setTag(LineByLineTags.SOURCE, args.source);
                span.setTag(LineByLineTags.START_LINE, args.startLine);

                return {
                    span,
                };
            } catch (e1) {
                ThundraLogger.error(
                    '<Instrumenter> Error occurred on trace entry of method',
                    methodName, ':', e1);
                try {
                    tracer.finishSpan();
                } catch (e2) {
                    ThundraLogger.error(
                        '<Instrumenter> Unable to finish span on trace entry of method',
                        methodName, 'on error:', e2);
                }
            }
        };

        g.__thundraTraceLine__ = function (args: any) {
            let methodName = null;
            try {
                const entryData = args.entryData;
                const methodSpan = entryData.span;
                const line = args.line;
                const localVars = new Array();
                const varNames = new Array();
                const varValues = new Array();
                const localVarNames = args.localVarNames;
                const localVarValues = args.localVarValues;
                const argNames = args.argNames;
                const argValues = args.argValues;

                methodName = methodSpan.getOperationName();

                ThundraLogger.debug('<Instrumenter> On trace line', line, 'of method', methodName);

                if (argNames) {
                    varNames.push(...argNames);
                }
                if (argValues) {
                    varValues.push(...argValues);
                }
                if (localVarNames) {
                    varNames.push(...localVarNames);
                }
                if (localVarValues) {
                    varValues.push(...localVarValues);
                }

                if (varNames.length === varValues.length) {
                    for (let i = 0; i < varNames.length; i++) {
                        const varName = varNames[i];
                        const varValue = varValues[i];
                        const varType = typeof varValue;
                        const packedVarValue = me.packValue(varValue);
                        const localVar: any = {
                            name: varName,
                            value: packedVarValue,
                            type: varType,
                        };
                        localVars.push(localVar);
                    }
                }

                let error;

                if (args.error) {
                    error = {
                        name: args.error.name,
                        message: args.error.message,
                    };
                }

                const methodLineTag = {
                    line,
                    localVars,
                    error,
                };

                let currentLines: any[] = methodSpan.getTag(LineByLineTags.LINES);
                if (!currentLines) {
                    currentLines = [];
                    methodSpan.setTag(LineByLineTags.LINES, currentLines);
                }
                if (currentLines.length < MAX_LINES) {
                    currentLines.push(methodLineTag);
                } else if (currentLines.length === MAX_LINES) {
                    ThundraLogger.debug(
                        '<Instrumenter> Hit max line count', MAX_LINES, 'on trace line of method', methodName);
                    methodSpan.setTag(LineByLineTags.LINES_OVERFLOW, true);
                }
            } catch (e) {
                ThundraLogger.error(
                    '<Instrumenter> Error occurred on trace line of method', methodName, ':', e);
            }
        };

        g.__thundraTraceExit__ = function (args: any) {
            let methodName = null;
            const { tracer } = ExecutionContextManager.get();
            if (!tracer) {
                return;
            }
            try {
                const entryData = args.entryData;
                if (entryData.latestLineSpan) {
                    if (args.exception) {
                        entryData.latestLineSpan.setErrorTag(args.exceptionValue);
                    }
                    entryData.latestLineSpan.finish();
                }
                const span = (entryData && entryData.span) ? entryData.span : tracer.getActiveSpan();
                methodName = span.getOperationName();

                ThundraLogger.debug('<Instrumenter> On trace exit of method:', methodName);

                if (!args.exception) {
                    if (args.returnValue) {
                        const returnValue = args.returnValue;
                        const returnType = typeof returnValue;
                        const packedReturnValue = me.packValue(returnValue);
                        span.setTag(MethodTags.RETURN_VALUE, new ReturnValue(returnType, packedReturnValue));
                    }
                } else {
                    span.setErrorTag(args.exceptionValue);
                }
                span.finish();
            } catch (e1) {
                ThundraLogger.error(
                    '<Instrumenter> Error occurred on trace exit of method',
                    methodName, ':', e1);
                try {
                    tracer.finishSpan();
                } catch (e2) {
                    ThundraLogger.error(
                        '<Instrumenter> Unable to finish span on trace exit of method',
                        methodName, 'on error:', e2);
                }
            }
        };
    }

    private checkValueSize(value: any): boolean {
        try {
            const valueSize = sizeof(value);
            return valueSize <= MAX_VAR_VALUE_SIZE;
        } catch (e) {
            ThundraLogger.debug('<Instrumenter> Unable to check value size:', e);
            return true;
        }
    }

    private packValue(value: any) {
        // `==` is used on purpose (instead of `===`) as it covers both undefined and null values
        if (value == null) {
            return null;
        }
        const valueType = typeof value;
        if (valueType === 'function') {
            return `function ${value.name}(...) { ... }`;
        }
        if (value instanceof Map || value instanceof Set) {
            value = [...value];
        }
        if (!this.checkValueSize(value)) {
            return this.summarizeValue(value);
        }
        try {
            // Create deep copy to take snapshot of the value.
            // So later modifications on the real value/object
            // will not be reflected to the taken snapshot here.
            return copy(value);
        } catch (e1) {
            ThundraLogger.debug('<Instrumenter> Unable to clone value:', e1);
            try {
                const valueJson = Utils.serializeJSON(value);
                if (valueJson) {
                    if (valueJson.length <= MAX_VAR_VALUE_SIZE) {
                        return valueJson;
                    } else {
                        ThundraLogger.debug('<Instrumenter> Unable to serialize value to JSON as it is too big');
                    }
                } else {
                    ThundraLogger.debug('<Instrumenter> Unable to serialize value to JSON as no JSON could produced');
                }
            } catch (e2) {
                ThundraLogger.debug('<Instrumenter> Unable to serialize value to JSON:', e2);
            }
            try {
                const valueStr = value.toString();
                if (valueStr) {
                    if (valueStr.length <= MAX_VAR_VALUE_SIZE) {
                        return valueStr;
                    } else {
                        ThundraLogger.debug('<Instrumenter> Unable to use "toString()" of value as it is too big');
                    }
                } else {
                    ThundraLogger.debug('<Instrumenter> Unable to use "toString()" of value as no string could be produced');
                }
            } catch (e3) {
                ThundraLogger.debug('<Instrumenter> Unable to use "toString()" of value:', e3);
            }
            return '<unable to serialize value>';
        }
    }

    private summarizeValue(value: any): any {
        if (Array.isArray(value)) {
            return this.summarizeArray(value);
        } else {
            return this.summarizeObject(value);
        }
    }

    private summarizeArray(array: any[]): any[] {
        const summary: any = [];
        const elementCount = Math.min(array.length, MAX_ELEMENTS);
        const maxElementSize = 2 * (MAX_VAR_VALUE_SIZE / elementCount);
        let currentSize: number = 0;
        for (let i = 0; i < elementCount; i++) {
            const element = array[i];
            const elementSize = sizeof(element);
            // Check whether
            // - the element is small enough
            // - the new size will not exceed the max size with the new element
            if ((elementSize <= maxElementSize) && (currentSize + elementSize <= MAX_VAR_VALUE_SIZE)) {
                summary[i] = copy(element);
                currentSize += elementSize;
            } else {
                summary[i] = '<skipped: element too big>';
            }
        }
        return summary;
    }

    private summarizeObject(obj: any): any {
        // First, sort object properties by their sizes
        obj = Object.entries(obj).
                sort((kv1: any[], kv2: any[]) => {
                    const size1 = sizeof(kv1[1]);
                    const size2 = sizeof(kv2[1]);
                    return size1 - size2;
                }).
                reduce((sorted: any, kv: any[]) => {
                    sorted[kv[0]] = kv[1];
                    return sorted;
                }, {});

        // Then shallow copy properties by starting from the smallest one until it reaches to the max limit
        const summary: any = {};
        const keys = Object.keys(obj);
        let currentSize: number = 0;
        for (let i = 0; i < keys.length && i < MAX_PROPS; i++) {
            const key = keys[i];
            const prop = obj[key];
            const propSize = sizeof(prop);
            // Check whether the new size will exceed the max size with the new prop
            if (currentSize + propSize > MAX_VAR_VALUE_SIZE) {
                break;
            }
            summary[key] = copy(prop);
            currentSize += propSize;
        }
        return summary;
    }

}

export default Instrumenter;
