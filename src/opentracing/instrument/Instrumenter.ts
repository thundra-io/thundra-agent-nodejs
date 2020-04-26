import TraceConfig from '../../plugins/config/TraceConfig';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import Utils from '../../plugins/utils/Utils';
import ThundraLogger from '../../ThundraLogger';
import ThundraTracer from '../Tracer';
import ThundraSpan from '../Span';
import { ThundraSourceCodeInstrumenter } from '@thundra/instrumenter';
import { ARGS_TAG_NAME, RETURN_VALUE_TAG_NAME, LineByLineTags } from '../../Constants';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

const Module = require('module');
const path = require('path');
const get = require('lodash.get');
const stringify = require('json-stringify-safe');

const TRACE_DEF_SEPERATOR: string = '.';

/*
    Most of the code is derived from njsTrace : https://github.com/ValYouW/njsTrace
*/
class Instrumenter {
    origCompile: any;
    tracer: ThundraTracer;
    sourceCodeInstrumenter: ThundraSourceCodeInstrumenter;

    constructor(traceConfig: TraceConfig) {
        const traceableConfigs = get(traceConfig, 'traceableConfigs');
        const traceableConfigPrefix = ConfigProvider.get<string>(ConfigNames.THUNDRA_TRACE_INSTRUMENT_FILE_PREFIX);

        this.sourceCodeInstrumenter = new ThundraSourceCodeInstrumenter(traceableConfigs, traceableConfigPrefix);
        this.tracer = get(traceConfig, 'tracer');
    }

    unhookModuleCompile() {
        Module.prototype._compile = this.origCompile;
    }

    hookModuleCompile() {
        this.origCompile = Module.prototype._compile;

        const self = this;
        self.setGlobalFunction();

        Module.prototype._compile = function (content: any, filename: any) {
            const relPath = path.relative(process.cwd(), filename);
            let relPathWithDots = relPath.replace(/\//g, TRACE_DEF_SEPERATOR);
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
                    ThundraLogger.getInstance().debug(ex);
                }
            }
            self.origCompile.call(this, content, filename);
        };
    }

    setGlobalFunction() {
        const tracer = this.tracer;
        global.__thundraTraceEntry__ = function (args: any) {
            try {
                const span = tracer.startSpan(args.path + '.' + args.name) as ThundraSpan;
                const spanArguments: Argument[] = [];

                if (args.args) {
                    for (let i = 0; i < args.args.length; i++) {
                        const argType = typeof args.args[i];
                        let argValue = JSON.parse(stringify(args.args[i]));
                        if (argType === 'function') {
                            argValue = argValue.toString();
                        }
                        spanArguments.push(new Argument(args.argNames[i], argType, argValue));
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
                tracer.finishSpan();
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
                        let processedVarValue = varValue ? varValue.toString() : null;
                        try {
                            // Cycle aware stringify operation
                            processedVarValue = stringify(varValue);
                            try {
                                processedVarValue = JSON.parse(processedVarValue);
                            } catch (e) {
                                // Ignore
                            }
                        } catch (e) {
                            // Ignore
                        }
                        const localVar: any = {
                            name: varName,
                            value: processedVarValue,
                            type: typeof varValue,
                        };
                        localVars.push(localVar);
                    }
                }

                const methodLineTag = {
                    line,
                    localVars,
                };

                let currentLines = methodSpan.getTag(LineByLineTags.LINES);
                if (!currentLines) {
                    currentLines = [];
                }

                methodSpan.setTag(LineByLineTags.LINES, [...currentLines, methodLineTag]);
            } catch (ex) {
                // Ignore
            }
        };

        global.__thundraTraceExit__ = function (args: any) {
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
                        const returnValue = JSON.parse(stringify(args.returnValue));
                        span.setTag(RETURN_VALUE_TAG_NAME, new ReturnValue(typeof args.returnValue, returnValue));
                    }
                } else {
                    span.setErrorTag(args.exceptionValue);
                }
                span.finish();
            } catch (ex) {
                tracer.finishSpan();
            }
        };
    }
}

export default Instrumenter;
