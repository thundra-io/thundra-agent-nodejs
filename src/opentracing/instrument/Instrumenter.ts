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

const Module = require('module');
const path = require('path');
const get = require('lodash.get');
const stringify = require('json-stringify-safe');

const TRACE_DEF_SEPARATOR: string = '.';
const MAX_LINES: number = 100;

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
            // If already hooked into compile phase, don't hook again
            return;
        }

        this.origCompile = compile;

        const self = this;
        self.setGlobalFunction();

        const thundraCompile = function (content: any, filename: any) {
            const relPath = path.relative(process.cwd(), filename);
            let relPathWithDots = relPath.replace(/\//g, TRACE_DEF_SEPARATOR);
            relPathWithDots = relPathWithDots.replace('.js', '');

            const sci = self.sourceCodeInstrumenter;

            if (sci.shouldTraceFile(relPathWithDots)) {
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
                } catch (ex) {
                    ThundraLogger.error(ex);
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
            Module.prototype._compile = this.origCompile;
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
        let valueJson = null;
        try {
            valueJson = stringify(value);
            return JSON.parse(valueJson);
        } catch (e1) {
            if (ThundraLogger.isDebugEnabled()) {
                ThundraLogger.debug('Unable to clone value');
                ThundraLogger.debug(e1);
            }
            if (valueJson) {
                return valueJson;
            }
            try {
                return value.toString();
            } catch (e2) {
                if (ThundraLogger.isDebugEnabled()) {
                    ThundraLogger.debug('Unable to call "toString()" of value');
                    ThundraLogger.debug(e2);
                }
                return '<unable to serialize value>';
            }
        }
    }

    private setGlobalFunction() {
        const me = this;
        global.__thundraTraceEntry__ = function (args: any) {
            const { tracer } = ExecutionContextManager.get();
            if (!tracer) {
                return;
            }
            try {
                const span = tracer.startSpan(args.path + '.' + args.name) as ThundraSpan;
                const spanArguments: Argument[] = [];

                if (args.args) {
                    for (let i = 0; i < args.args.length; i++) {
                        const argValue = args.args[i];
                        const argType = typeof argValue;
                        const packedArgValue = me.packValue(argValue);
                        spanArguments.push(new Argument(args.argNames[i], argType, packedArgValue));
                    }
                }

                span.className = 'Method';
                span.setTag(ARGS_TAG_NAME, spanArguments);
                span.setTag(LineByLineTags.SOURCE, args.source);
                span.setTag(LineByLineTags.START_LINE, args.startLine);

                return {
                    span,
                };
            } catch (ex) {
                ThundraLogger.error(ex);
                try {
                    tracer.finishSpan();
                } catch (ex2) {
                    // Ignore
                }
            }
        };

        global.__thundraTraceLine__ = function (args: any) {
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
                    methodSpan.setTag(LineByLineTags.LINES_OVERFLOW, true);
                }
            } catch (ex) {
                ThundraLogger.error(ex);
            }
        };

        global.__thundraTraceExit__ = function (args: any) {
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
            } catch (ex) {
                ThundraLogger.error(ex);
                try {
                    tracer.finishSpan();
                } catch (ex2) {
                    // Ignore
                }
            }
        };
    }

}

export default Instrumenter;
