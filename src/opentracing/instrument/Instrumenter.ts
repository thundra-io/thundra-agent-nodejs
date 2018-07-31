const Module = require('module');
const falafel = require('falafel');
const util = require('util');
const path = require('path');

const TRACE_ENTRY = 'var __thundraEntryData__ = __thundraTraceEntry__({name: %s, args: %s, argNames:%s});';
const TRACE_EXIT = '__thundraTraceExit__({entryData: __thundraEntryData__, exception: %s,returnValue: %s, exceptionValue:%s});';
const ON_CATCH = 'if (__thundraOnCatchClause__) {\n__thundraOnCatchClause__({entryData: __thundraEntryData__});\n}';

import ThundraTracer from '../Tracer';
import TraceConfig from '../../plugins/config/TraceConfig';
import TraceOption from '../../plugins/config/TraceOption';
import {TRACE_DEF_SEPERATOR, ARGS_TAG_NAME, RETURN_VALUE_TAG_NAME, Syntax } from '../../Constants';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import Utils from '../../plugins/Utils';

class Instrumenter {
    tracer: ThundraTracer;
    traceConfig: TraceConfig;
    origCompile: any;

    constructor(tracer: ThundraTracer, traceConfig: TraceConfig) {
        this.tracer = tracer;
        this.traceConfig = traceConfig;
    }

    shouldTrace(relPath: string): TraceOption {
        try {
            if (relPath.includes('node_modules')) {
                return null;
            }
            for (const traceOption of this.traceConfig.traceDef) {
                const patterns = traceOption.pattern.split(TRACE_DEF_SEPERATOR);
                const regStr = patterns.slice(0, patterns.length - 1).join().replace(TRACE_DEF_SEPERATOR, '/');
                const regExp = new RegExp(regStr);
                if (regExp.test(relPath)) {
                    return traceOption;
                }
            }
        } catch (ex) {
            return null;
        }
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
            const instrumentOption = self.shouldTrace(relPath);

            if (instrumentOption) {
                let wrapped = true;
                if (Module.wrapper.length === 2) {
                    content = Module.wrapper[0] + '\n' + content + Module.wrapper[1];
                } else {
                    wrapped = false;
                }

                try {
                    content = self.addTraceHooks(content, true, instrumentOption, wrapped);
                    if (Module.wrapper.length === 2) {
                        content = content.substring(Module.wrapper[0].length, content.length - Module.wrapper[1].length);
                    }
                } catch (ex) {
                    console.log(ex);
                }
            }

            self.origCompile.call(this, content, filename);
        };
    }

    addTraceHooks(code: any, wrapFunctions: any, instrumentOption: TraceOption, wrappedFile: any) {
        let traceExit;
        const self = this;
        const patterns = instrumentOption.pattern.split(TRACE_DEF_SEPERATOR);
        const regStr = patterns[patterns.length - 1];
        const regExp = new RegExp(regStr);

        const output = falafel(code, { ranges: true, locations: true, ecmaVersion: 8 }, function processASTNode(node: any) {
            const startLine = wrappedFile ? node.loc.start.line - 1 : node.loc.start.line;
            const name = self.getFunctionName(node);

            if (name && node.body.type === Syntax.BlockStatement) {
                if (!regExp.test(name)) {
                    return;
                }

                const funcDec = node.source().slice(0, node.body.range[0] - node.range[0]);
                let origFuncBody = node.body.source();
                origFuncBody = origFuncBody.slice(1, origFuncBody.length - 1);

                if (wrappedFile && node.loc.start.line === 1) { return; }

                let args = 'null';
                let argNames = 'null';
                if (instrumentOption.traceArgs) {
                    args = '[' + node.params.map((p: any) => p.name).join(',') + ']';
                    argNames = '[' + node.params.map((p: any) => '\'' + p.name + '\'').join(',') + ']';
                }

                const traceEntry = util.format(TRACE_ENTRY, JSON.stringify(name), args, argNames);
                traceExit = util.format(TRACE_EXIT, 'false', 'null', 'null');

                const newFuncBody = '\n' + traceEntry + '\n' + origFuncBody + '\n' + traceExit + '\n';

                if (wrapFunctions) {
                    const traceEX = util.format(TRACE_EXIT, 'true', startLine, 'null',
                                                instrumentOption.traceError ? '__thundraEX__' : 'null');

                    node.update(funcDec + '{\ntry {' + newFuncBody + '} catch(__thundraEX__) {\n' +
                                traceEX + '\nthrow __thundraEX__;\n}\n}');

                } else {
                    node.update(funcDec + '{' + newFuncBody + '}');
                }
            } else if (node.type === Syntax.ReturnStatement) {
                const functionName = node.parent.parent.id.name;
                if (!regExp.test(functionName)) {
                    return;
                }
                if (node.argument) {
                    const tmpVar = '__thundraTmp' + Math.floor(Math.random() * 10000) + '__';
                    traceExit = util.format(TRACE_EXIT, 'false', instrumentOption.traceReturnValue ? tmpVar : 'null', 'null');

                    node.update('{\nvar ' + tmpVar + ' = ' + node.argument.source() + ';\n' +
                                traceExit + '\nreturn ' + tmpVar + ';\n}');
                } else {
                    traceExit = util.format(TRACE_EXIT, 'false', startLine, 'null');
                    node.update('{' + traceExit + node.source() + '}');
                }
            } else if (node.type === Syntax.CatchClause) {
                let origCatch = node.body.source();
                origCatch = origCatch.slice(1, origCatch.length - 1);
                node.body.update('{\n' + ON_CATCH + '\n' + origCatch + '\n}');
            }
        });

        return output.toString();
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

    setGlobalFunction() {
        const self: any = this;
        global.__thundraTraceEntry__ = function (args: any) {
            try {
                const span = self.tracer.startSpan(args.name);
                const spanArguments: Argument[] = [];
                if (args.args) {
                    for (let i = 0; i < args.args.length; i++) {
                        spanArguments.push(new Argument(args.argNames[i], typeof args.args[i], args.args[i]));
                    }
                }
                span.setTag(ARGS_TAG_NAME, spanArguments);
                return { name: args.name, file: args.file, fnLine: args.line, ts: Date.now()};
            } catch (ex) {
                console.log(ex);
            }
        };

        global.__thundraTraceExit__ = function (args: any) {
            try {
                const span = self.tracer.getActiveSpan();
                if (!args.exception && args.returnValue) {
                    span.setTag(RETURN_VALUE_TAG_NAME, new ReturnValue(typeof args.returnValue, args.returnValue));
                } else {
                    const err = Utils.parseError(args.exceptionValue);
                    span.setTag('error', true);
                    span.setTag('error.kind', err.errorType);
                    span.setTag('error.message', err.errorMessage);
                }
                self.tracer.finishSpan();
            } catch (ex) {
                console.log(ex);
            }
        };

        global.__thundraOnCatchClause__ = function (args: any) {
            self.tracer.finishSpan();
        };
    }
}

export default Instrumenter;
