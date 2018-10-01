import ThundraTracer from '../Tracer';
import TraceConfig from '../../plugins/config/TraceConfig';
import TraceDef, { TraceDefCheckLevel } from '../../plugins/config/TraceDef';
import { envVariableKeys, TRACE_DEF_SEPERATOR, Syntax, ARGS_TAG_NAME, RETURN_VALUE_TAG_NAME } from '../../Constants';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import Utils from '../../plugins/Utils';
import Stack from './Stack';
import NodeWrapper from './NodeWrapper';
import ThundraLogger from '../../ThundraLogger';

const Module = require('module');
const falafel = require('falafel');
const util = require('util');
const path = require('path');

const TRACE_ENTRY = 'var __thundraEntryData__ = __thundraTraceEntry__({name: %s, path: %s, args: %s, argNames:%s});';
const TRACE_EXIT = '__thundraTraceExit__({entryData: __thundraEntryData__, exception: %s,returnValue: %s, exceptionValue:%s});';

/*
    Most of the code is derived from njsTrace : https://github.com/ValYouW/njsTrace
*/
class Instrumenter {
    tracer: ThundraTracer;
    traceConfig: TraceConfig;
    origCompile: any;
    stack: Stack<NodeWrapper>;

    constructor(tracer: ThundraTracer, traceConfig: TraceConfig) {
        this.tracer = tracer;
        this.traceConfig = traceConfig;
        this.stack = new Stack<NodeWrapper>();
    }

    shouldTraceFile(relPath: string): boolean {
        return this.getThundraTraceDef(relPath + '.*', TraceDefCheckLevel.FILE) !== null;
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
        const self = this;

        const output = falafel(code, { ranges: true, locations: true, ecmaVersion: 8 }, function processASTNode(node: any) {
            const startLine = wrappedFile ? node.loc.start.line - 1 : node.loc.start.line;
            const name = self.getFunctionName(node);

            if (name && node.body.type === Syntax.BlockStatement) {
                const instrumentOption = self.getThundraTraceDef(relPath + '.' + name, TraceDefCheckLevel.FUNCTION);
                if (instrumentOption === null) {
                    self.stack.store = [];
                    return;
                }

                while (self.stack.store.length !== 0) {
                    const wrapper: NodeWrapper = self.stack.pop();
                    wrapper.instrumentFunction.call(self, instrumentOption, wrapper.node);
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

                const traceEntry = util.format(TRACE_ENTRY, JSON.stringify(name), JSON.stringify(relPath), args, argNames);
                const traceExit = util.format(TRACE_EXIT, 'false', 'null', 'null');

                const newFuncBody = '\n' + traceEntry + '\n' + origFuncBody + '\n' + traceExit + '\n';

                if (wrapFunctions) {
                    const traceEX = util.format(TRACE_EXIT, 'true', 'null',
                        instrumentOption.traceError ? '__thundraEX__' : 'null');

                    node.update(funcDec + '{\ntry {' + newFuncBody + '} catch(__thundraEX__) {\n' +
                        traceEX + '\nthrow __thundraEX__;\n}\n}');

                } else {
                    node.update(funcDec + '{' + newFuncBody + '}');
                }

            } else if (node.type === Syntax.ReturnStatement) {

                const wrapper: NodeWrapper = new NodeWrapper(node, (traceDef: TraceDef, sourceNode: any) => {
                    if (sourceNode.argument) {
                        const tmpVar = '__thundraTmp' + Math.floor(Math.random() * 10000) + '__';

                        const traceExit = util.format(TRACE_EXIT, 'false',
                            traceDef.traceReturnValue ? tmpVar : 'null', 'null');

                        sourceNode.update('{\nvar ' + tmpVar + ' = ' + sourceNode.argument.source() + ';\n' +
                            traceExit + '\nreturn ' + tmpVar + ';\n}');
                    } else {
                        const traceExit = util.format(TRACE_EXIT, 'false', startLine, 'null');
                        sourceNode.update('{' + traceExit + sourceNode.source() + '}');
                    }
                });

                self.stack.push(wrapper);

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

    getThundraTraceDef(traceDefStr: string, checkLevel: TraceDefCheckLevel): TraceDef {
        try {
            if (traceDefStr.includes('node_modules') || !this.traceConfig || !this.traceConfig.traceDefs) {
                return null;
            }

            const traceDefPrefix = Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_TRACE_TRACE_DEF_FILE_PREFIX);
            if (traceDefPrefix && TraceDefCheckLevel.FILE) {
                const prefixes = traceDefPrefix.split(',');
                for (const prefix of prefixes) {
                    if (traceDefStr.startsWith(prefix)) {
                        return new TraceDef(traceDefPrefix);
                    }
                }
            }

            for (const traceDef of this.traceConfig.traceDefs) {
                if (checkLevel === TraceDefCheckLevel.FILE) {
                    if (traceDef.shouldTraceFile(traceDefStr)) {
                        return traceDef;
                    }
                } else {
                    if (traceDef.shouldTraceFunction(traceDefStr)) {
                        return traceDef;
                    }
                }
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    setGlobalFunction() {
        const self: any = this;
        global.__thundraTraceEntry__ = function (args: any) {
            try {
                const span = self.tracer.startSpan(args.path + '.' + args.name);
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
                return {};
            } catch (ex) {
                self.tracer.finishSpan();
            }
        };

        global.__thundraTraceExit__ = function (args: any) {
            try {
                const span = self.tracer.getActiveSpan();
                if (!args.exception) {
                    if (args.returnValue) {
                        span.setTag(RETURN_VALUE_TAG_NAME, new ReturnValue(typeof args.returnValue, args.returnValue));
                    }
                } else {
                    const err = Utils.parseError(args.exceptionValue);
                    span.setTag('error', true);
                    span.setTag('error.kind', err.errorType);
                    span.setTag('error.message', err.errorMessage);
                    if (err.code) {
                        this.invocationData.tags['error.code'] = err.code;
                    }
                    if (err.stack) {
                        this.invocationData.tags['error.stack'] = err.stack;
                    }
                }
                span.finish();
            } catch (ex) {
                self.tracer.finishSpan();
            }
        };
    }
}

export default Instrumenter;
