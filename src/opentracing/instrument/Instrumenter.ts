import TraceConfig from '../../plugins/config/TraceConfig';
import TraceableConfig, { TracableConfigCheckLevel } from '../../plugins/config/TraceableConfig';
import { envVariableKeys, TRACE_DEF_SEPERATOR, Syntax, ARGS_TAG_NAME, RETURN_VALUE_TAG_NAME } from '../../Constants';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import Utils from '../../plugins/utils/Utils';
import ThundraLogger from '../../ThundraLogger';
import ThundraTracer from '../Tracer';
import ThundraSpan from '../Span';

const Module = require('module');
const falafel = require('falafel');
const util = require('util');
const path = require('path');

const TRACE_ENTRY = 'var __thundraEntryData__ = __thundraTraceEntry__({name: %s, path: %s, args: %s, argNames: %s});';
const TRACE_LINE = 'if (typeof __thundraEntryData__ !== \'undefined\') \
                        __thundraTraceLine__({ \
                            entryData: __thundraEntryData__, \
                            line: %d, \
                            source: %s, \
                            localVarNames: %s, \
                            localVarValues: %s, \
                            argNames: %s, \
                            argValues: %s \
                        });';
const TRACE_EXIT = '__thundraTraceExit__({entryData: __thundraEntryData__, exception: %s, returnValue: %s, exceptionValue: %s});';

const ARG_NAMES_POINTER = '/* ___%thundraArgNames%___ */';
const ARG_VALUES_POINTER = '/* ___%thundraArgValues%___ */';

const ARG_NAMES_PATTERN = new RegExp(ARG_NAMES_POINTER.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
const ARG_VALUES_PATTERN = new RegExp(ARG_VALUES_POINTER.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');

const NODE_TYPES_FOR_LINE_TRACING = [
    'ExpressionStatement',
    'BreakStatement',
    'ContinueStatement',
    'VariableDeclaration',
    'ReturnStatement',
    'ThrowStatement',
    'TryStatement',
    'FunctionDeclaration',
    'IfStatement',
    'WhileStatement',
    'DoWhileStatement',
    'ForStatement',
    'ForInStatement',
    'SwitchStatement',
    'WithStatement',
];

// To keep line numbers sync between the original and instrumented code,
// it is better to keep injected code at the same line with the original code
const TRACE_INJECTION_SEPARATOR = ' ';
const DEBUG_INSTRUMENTATION = false;

/*
    Most of the code is derived from njsTrace : https://github.com/ValYouW/njsTrace
*/
class Instrumenter {

    traceConfig: TraceConfig;
    origCompile: any;
    updates: Map<string, string> = new Map();
    tracer: ThundraTracer;

    constructor(traceConfig: TraceConfig) {
        this.traceConfig = traceConfig;
        if (traceConfig) {
            this.tracer = traceConfig.tracer;
        }
    }

    shouldTraceFile(relPath: string): boolean {
        return this.getThundraTraceableConfig(relPath + '.*', TracableConfigCheckLevel.FILE) !== null;
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

            if (self.shouldTraceFile(relPathWithDots)) {
                let wrapped = true;
                if (Module.wrapper.length === 2) {
                    content = Module.wrapper[0] + '\n' + content + Module.wrapper[1];
                } else {
                    wrapped = false;
                }
                try {
                    content = self.addTraceHooks(content, true, relPathWithDots, wrapped);
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

    addTraceHooks(code: any, wrapFunctions: any, relPath: string, wrappedFile: any) {
        try {
            const codeLines = code.split('\n');
            const self = this;
            const tracedLines = new Set();
            const localVars = new Map();
            const output = falafel(code, {
                ranges: true,
                locations: true,
                ecmaVersion: 8,
            }, function processASTNode(node: any) {
                const startLine = wrappedFile ? node.loc.start.line - 1 : node.loc.start.line;
                const name = self.getFunctionName(node);

                const instrumentOption = self.getThundraTraceableConfig(relPath + '.' + name, TracableConfigCheckLevel.FUNCTION);

                if (name && node.body.type === Syntax.BlockStatement) {
                    if (instrumentOption === null) {
                        self.updates.clear();
                        return;
                    }

                    const funcDec = node.source().slice(0, node.body.range[0] - node.range[0]);
                    let origFuncBody = node.body.source();
                    origFuncBody = origFuncBody.slice(1, origFuncBody.length - 1);

                    if (wrappedFile && node.loc.start.line === 1) {
                        return;
                    }

                    const aNames = node.params.map((p: any) => '\'' + p.name + '\'').join(',');
                    const aValues = node.params.map((p: any) => p.name).join(',');

                    let args = 'null';
                    let argNames = 'null';
                    if (instrumentOption.traceArgs) {
                        args = '[' + aValues + ']';
                        argNames = '[' + aNames + ']';
                    }

                    const traceEntry = util.format(TRACE_ENTRY, JSON.stringify(name), JSON.stringify(relPath), args, argNames);
                    const traceExit = util.format(TRACE_EXIT, 'false', 'null', 'null');

                    const newFuncBody =
                        TRACE_INJECTION_SEPARATOR + traceEntry +
                        TRACE_INJECTION_SEPARATOR + origFuncBody +
                        TRACE_INJECTION_SEPARATOR + traceExit +
                        TRACE_INJECTION_SEPARATOR;

                    if (wrapFunctions) {
                        const traceEX = util.format(TRACE_EXIT, 'true', 'null',
                            instrumentOption.traceError ? '__thundraEX__' : 'null');
                        let funcCode =
                            funcDec +
                            '{' +
                                TRACE_INJECTION_SEPARATOR +
                                'try {' +
                                    newFuncBody +
                                '} catch(__thundraEX__) {' + TRACE_INJECTION_SEPARATOR +
                                    traceEX + TRACE_INJECTION_SEPARATOR +
                                    'throw __thundraEX__;' + TRACE_INJECTION_SEPARATOR +
                                '}' +
                                TRACE_INJECTION_SEPARATOR +
                            '}';

                        for (const e of self.updates.entries()) {
                            const pointer = e[0];
                            const update = e[1];
                            if (funcCode.includes(pointer)) {
                                funcCode = funcCode.replace(pointer, update);
                                self.updates.delete(pointer);
                            }
                        }

                        funcCode = funcCode.replace(ARG_NAMES_PATTERN, aNames);
                        funcCode = funcCode.replace(ARG_VALUES_PATTERN, aValues);

                        node.update(funcCode);
                    } else {
                        const funcCode =
                            funcDec +
                            '{' +
                                newFuncBody +
                            '}';
                        node.update(funcCode);
                    }
                } else if (node.type === Syntax.ReturnStatement) {
                    const traceLine =
                        self.checkTraceLine(node, instrumentOption, tracedLines, localVars, wrappedFile, codeLines);
                    const id = Math.floor(Math.random() * 10000);
                    const returnPointer = '/* __%thundraReturn@' + id + '%__ */';
                    if (node.argument) {
                        const tmpVar = '__thundraTmp' + id + '__';
                        const traceExit = util.format(TRACE_EXIT, 'false',
                            instrumentOption.traceReturnValue ? tmpVar : 'null', 'null');
                        const traceReturn =
                            (traceLine ? traceLine : '') +
                            '{' +
                                TRACE_INJECTION_SEPARATOR + 'var ' + tmpVar + ' = ' + node.argument.source() + ';' +
                                TRACE_INJECTION_SEPARATOR + traceExit +
                                TRACE_INJECTION_SEPARATOR + 'return ' + tmpVar + ';' +
                                TRACE_INJECTION_SEPARATOR +
                            '}';
                        node.update(returnPointer);
                        self.updates.set(returnPointer, traceReturn);
                    } else {
                        const traceExit = util.format(TRACE_EXIT, 'false', startLine, 'null');
                        const traceReturn =
                            (traceLine ? traceLine : '') +
                            '{' +
                                traceExit + ' ' + node.source() +
                            '}';
                        node.update(returnPointer);
                        self.updates.set(returnPointer, traceReturn);
                    }
                } else {
                    const traceLine =
                        self.checkTraceLine(node, instrumentOption, tracedLines, localVars, wrappedFile, codeLines);
                    if (traceLine) {
                        const line = wrappedFile ? node.loc.start.line - 1 : node.loc.start.line;
                        const linePointer = '/* ___%thundraLine@' + line + '%___ */';
                        node.update(linePointer + ' ' + node.source());
                        self.updates.set(linePointer, traceLine);
                    }
                }
            });
            const instrumentedCode = output.toString();
            if (DEBUG_INSTRUMENTATION) {
                console.log('==================================================');
                console.log('File: ' + relPath);
                console.log('Original code: ' + code);
                console.log('Instrumented code: ' + instrumentedCode);
                console.log('==================================================');
            }
            return instrumentedCode;
        } catch (e) {
            console.log(e);
        }
    }

    checkTraceLine(node: any, instrumentOption: any,
                   tracedLines: Set<number>,
                   localVars: Map<string, number>,
                   wrappedFile: boolean,
                   codeLines: string[]) {
        if (node.type === Syntax.BlockStatement) {
            if (instrumentOption && instrumentOption.traceLocalVariables) {
                // Remove local variables which are out of scope anymore
                for (const e of localVars.entries()) {
                    const localVarName = e[0];
                    const localVarDefPos = e[1];
                    if (localVarDefPos >= node.start && localVarDefPos <= node.end) {
                        localVars.delete(localVarName);
                    }
                }
            }
            return null;
        } else {
            let traceLine = null;
            if (instrumentOption && instrumentOption.traceLineByLine && node.loc && node.loc.start) {
                const line = wrappedFile ? node.loc.start.line - 1 : node.loc.start.line;
                if (NODE_TYPES_FOR_LINE_TRACING.indexOf(node.type) > -1 && node.parent.type === Syntax.BlockStatement) {
                    if (!tracedLines.has(line)) {
                        let lineSource = 'null';
                        if (instrumentOption.traceLinesWithSource) {
                            lineSource = codeLines[line].trim();
                        }
                        let localVarValues = 'null';
                        let localVarNames = 'null';
                        if (instrumentOption.traceLocalVariables) {
                            localVarValues = '[';
                            localVarNames = '[';
                            let added = false;
                            for (const e of localVars.entries()) {
                                const localVarName = e[0];
                                const localVarPos = e[1];
                                if (!this.shouldTraceLocalVariable(localVarPos, node, wrappedFile)) {
                                    continue;
                                }
                                if (added) {
                                    localVarValues += ', ';
                                    localVarNames += ', ';
                                }
                                // If somehow, variable is out of scope (maybe because of a bug in our parser)
                                // add check to understand whether or not it is undefined in current scope
                                localVarValues +=
                                    'typeof ' + localVarName + ' !== \'undefined\'' +
                                        ' ? ' + localVarName +
                                        ' : undefined';
                                localVarNames += '\'' + localVarName + '\'';
                                added = true;
                            }
                            localVarValues += ']';
                            localVarNames += ']';
                        }
                        traceLine =
                            util.format(
                                TRACE_LINE,
                                line,
                                JSON.stringify(lineSource),
                                localVarNames,
                                localVarValues,
                                '[' + ARG_NAMES_POINTER + ']',
                                '[' + ARG_VALUES_POINTER + ']',
                            );
                        tracedLines.add(line);
                    }
                }
                if (instrumentOption.traceLocalVariables
                    && node.type === Syntax.VariableDeclaration
                    && node.declarations) {
                    for (const d of node.declarations) {
                        if (d.init &&
                            (d.init.type === Syntax.FunctionExpression
                                || d.init.type === Syntax.ArrowFunctionExpression)) {
                            continue;
                        }
                        if (d.id && d.id.name) {
                            localVars.set(d.id.name, node.start);
                        }
                    }
                }
            }
            return traceLine;
        }
    }

    shouldTraceLocalVariable(localVarPos: number, node: any, wrappedFile: boolean) {
        if (localVarPos < node.start) {
            let n = this.getParentBlock(node);
            let n2 = this.getParentBlock(n);
            while (n) {
                if (wrappedFile && !n2) {
                    break;
                }
                if (localVarPos >= n.start && localVarPos <= n.end) {
                    return true;
                }
                n = this.getParentBlock(n);
                n2 = this.getParentBlock(n);
            }
        }
        return false;
    }

    getParentBlock(node: any) {
        let n = node.parent;
        while (n) {
            if (n && n.type === Syntax.BlockStatement) {
                return n;
            }
            n = n.parent;
        }
        return null;
    }

    isFunctionNode(node: any) {
        return (node.type === Syntax.FunctionDeclaration ||
            node.type === Syntax.FunctionExpression || node.type === Syntax.ArrowFunctionExpression) && node.range;
    }

    getFunctionName(node: any) {
        if (!this.isFunctionNode(node)) {
            return;
        }
        if (node.id) {
            return node.id.name;
        }

        if (node.type === Syntax.FunctionDeclaration) {
            return '';
        }

        const parent = node.parent;
        switch (parent.type) {
            case Syntax.AssignmentExpression:
                if (parent.left.range) {
                    return parent.left.source().replace(/"/g, '\\"');
                }
                break;

            case Syntax.VariableDeclarator:
                return parent.id.name;

            case Syntax.CallExpression:
                return parent.callee.id ? parent.callee.id.name : '[Anonymous]';
            default:
                if (typeof parent.length === 'number') {
                    return parent.id ? parent.id.name : '[Anonymous]';
                } else if (parent.key && parent.key.type === 'Identifier' &&
                    parent.value === node && parent.key.name) {
                    return parent.key.name;
                }
        }
        return '[Anonymous]';
    }

    getThundraTraceableConfig(traceableConfigStr: string, checkLevel: TracableConfigCheckLevel): TraceableConfig {
        try {
            if (traceableConfigStr.includes('node_modules') || !this.traceConfig || !this.traceConfig.traceableConfigs) {
                return null;
            }

            const traceableConfigPrefix = Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_FILE_PREFIX);
            if (traceableConfigPrefix && TracableConfigCheckLevel.FILE) {
                const prefixes = traceableConfigPrefix.split(',');
                for (const prefix of prefixes) {
                    if (traceableConfigPrefix.startsWith(prefix)) {
                        return new TraceableConfig(traceableConfigPrefix);
                    }
                }
            }

            for (const traceableConfig of this.traceConfig.traceableConfigs) {
                if (checkLevel === TracableConfigCheckLevel.FILE) {
                    if (traceableConfig.shouldTraceFile(traceableConfigStr)) {
                        return traceableConfig;
                    }
                } else {
                    if (traceableConfig.shouldTraceFunction(traceableConfigStr)) {
                        return traceableConfig;
                    }
                }
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    setGlobalFunction() {
        const tracer = this.tracer;
        global.__thundraTraceEntry__ = function (args: any) {
            try {
                const span = tracer.startSpan(args.path + '.' + args.name) as ThundraSpan;
                span.className = 'Method';

                const spanArguments: Argument[] = [];
                if (args.args) {
                    for (let i = 0; i < args.args.length; i++) {
                        const argType = typeof args.args[i];
                        let argValue = args.args[i];
                        if (argType === 'function') {
                            argValue = argValue.toString();
                        }
                        spanArguments.push(new Argument(args.argNames[i], argType, argValue));
                    }
                }
                span.setTag(ARGS_TAG_NAME, spanArguments);
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
                if (entryData.latestLineSpan) {
                    entryData.latestLineSpan.finish();
                }

                const line = args.line;
                const source = args.source;
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
                            processedVarValue = JSON.stringify(varValue);
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
                    source,
                    localVars,
                };

                const span = tracer.startSpan('@' + args.line) as ThundraSpan;
                span.className = 'Line';
                span.setTag('method.lines', [methodLineTag]);

                entryData.latestLineSpan = span;
            } catch (ex) {
                tracer.finishSpan();
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
                        span.setTag(RETURN_VALUE_TAG_NAME, new ReturnValue(typeof args.returnValue, args.returnValue));
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
