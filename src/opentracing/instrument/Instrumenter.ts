import TraceConfig from '../../plugins/config/TraceConfig';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../Span';
import { ThundraSourceCodeInstrumenter } from '@thundra/instrumenter';
import { ARGS_TAG_NAME, RETURN_VALUE_TAG_NAME, LineByLineTags } from '../../Constants';
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

/**
 * Instruments specified/configured modules/method during load time
 */
class Instrumenter {

    private origCompile: any;
    private sourceCodeInstrumenter: ThundraSourceCodeInstrumenter;

    constructor(traceConfig: TraceConfig) {
        const traceableConfigs = get(traceConfig, 'traceableConfigs');
        const traceableConfigPrefix = ConfigProvider.get<string>(ConfigNames.THUNDRA_TRACE_INSTRUMENT_FILE_PREFIX);

        this.sourceCodeInstrumenter = new ThundraSourceCodeInstrumenter(traceableConfigs, traceableConfigPrefix);
    }

    /**
     * Hooks itself into module load cycle to instrument specified/configured modules/methods
     */
    hookModuleCompile() {
        const compile = Module.prototype._compile;

        if (compile._thundra) {
            ThundraLogger.debug('<Instrumenter> Already wrapped, skipped hooking module compile');
            // If already hooked into compile phase, don't hook again
            return;
        }

        ThundraLogger.debug('<Instrumenter> Hooking module compile ...');

        this.origCompile = compile;

        const self = this;
        self.setGlobalFunction();

        const thundraCompile = function (content: any, filename: any) {
            const relPath = path.relative(process.cwd(), filename);
            let relPathWithDots = relPath.replace(/\//g, TRACE_DEF_SEPARATOR);
            relPathWithDots = relPathWithDots.replace('.js', '');

            const sci = self.sourceCodeInstrumenter;

            if (sci.shouldTraceFile(relPathWithDots)) {
                ThundraLogger.debug('<Instrumenter> Instrumenting file', filename, 'at', relPath);
                let wrapped = true;
                if (Module.wrapper.length === 2) {
                    content = Module.wrapper[0] + '\n' + content + Module.wrapper[1];
                } else {
                    wrapped = false;
                }
                try {
                    content = sci.addTraceHooks(content, relPathWithDots, wrapped);
                    if (Module.wrapper.length === 2) {
                        content = content.substring(Module.wrapper[0].length, content.length - Module.wrapper[1].length);
                    }
                    ThundraLogger.debug('<Instrumenter> Instrumented file', filename, 'at', relPath, ':', content);
                } catch (e) {
                    ThundraLogger.error(
                        '<Instrumenter> Error occurred while instrumenting file', filename, 'at', relPath, ':', e);
                }
            }

            self.origCompile.call(this, content, filename);
        };
        Object.defineProperty(thundraCompile, '_thundra', {
            value: true,
            writable: false,
        });
        Module.prototype._compile = thundraCompile;
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
            return value.toString();
        }
        if (value instanceof Map || value instanceof Set) {
            value = [...value];
        }
        if (!this.checkValueSize(value)) {
            return '<skipped: value too big>';
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

    private setGlobalFunction() {
        const me = this;
        global.__thundraTraceEntry__ = function (args: any) {
            const { tracer } = ExecutionContextManager.get();
            if (!tracer) {
                return;
            }
            let methodName = null;
            try {
                methodName = args.path + '.' + args.name;
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

                span.setTag(ARGS_TAG_NAME, spanArguments);
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

        global.__thundraTraceLine__ = function (args: any) {
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

        global.__thundraTraceExit__ = function (args: any) {
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
                        span.setTag(RETURN_VALUE_TAG_NAME, new ReturnValue(returnType, packedReturnValue));
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

}

export default Instrumenter;
