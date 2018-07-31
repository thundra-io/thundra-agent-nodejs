const Module = require('module');
const falafel = require('falafel');
const util = require('util');
const path = require('path');

const TRACE_ENTRY = 'var __njsEntryData__ = __njsTraceEntry__({file: %s, name: %s, line: %s, args: %s, argNames:%s});';
// tslint:disable-next-line:max-line-length
const TRACE_EXIT = '__njsTraceExit__({entryData: __njsEntryData__, exception: %s, line: %s, returnValue: %s, exceptionValue:%s});';
const ON_CATCH = 'if (__njsOnCatchClause__) {\n__njsOnCatchClause__({entryData: __njsEntryData__});\n}';

import ThundraTracer from '../Tracer';
import TraceConfig from '../../plugins/config/TraceConfig';
import TraceOption from '../../plugins/config/TraceOption';
import {TRACE_DEF_SEPERATOR, ARGS_TAG_NAME, RETURN_VALUE_TAG_NAME } from '../../Constants';
import Argument from './Argument';
import ReturnValue from './ReturnValue';
import Utils from '../../plugins/Utils';

class ModuleHack {
    tracer: ThundraTracer;
    traceConfig: TraceConfig;

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

    hijackCompile() {
        const origCompile = Module.prototype._compile;
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
                    content = self.injectTracing(filename, content, true, instrumentOption, wrapped);
                    if (Module.wrapper.length === 2) {
                        content = content.substring(Module.wrapper[0].length, content.length - Module.wrapper[1].length);
                    }
                } catch (ex) {
                    console.log(ex);
                }
            }
            origCompile.call(this, content, filename);
        };
    }

    injectTracing(filename: any, code: any, wrapFunctions: any, instrumentOption: TraceOption, wrappedFile: any) {
        let traceExit;
        const self = this;
        const output = falafel(code, { ranges: true, locations: true, ecmaVersion: 8 }, function processASTNode(node: any) {
            const startLine = wrappedFile ? node.loc.start.line - 1 : node.loc.start.line;
            const retLine = wrappedFile ? node.loc.end.line - 1 : node.loc.end.line;
            const name = self.getFunctionName(node);
            if (name && node.body.type === self.syntax.BlockStatement) {
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

                const traceEntry = util.format(TRACE_ENTRY, JSON.stringify(filename), JSON.stringify(name),
                                                startLine, args, argNames);

                traceExit = util.format(TRACE_EXIT, 'false', retLine, 'null', 'null');

                const newFuncBody = '\n' + traceEntry + '\n' + origFuncBody + '\n' + traceExit + '\n';

                if (wrapFunctions) {
                    const traceEX = util.format(TRACE_EXIT, 'true', startLine, 'null',
                                                instrumentOption.traceError ? '__njsEX__' : 'null');

                    // tslint:disable-next-line:max-line-length
                    node.update(funcDec + '{\ntry {' + newFuncBody + '} catch(__njsEX__) {\n' + traceEX + '\nthrow __njsEX__;\n}\n}');
                } else {
                    node.update(funcDec + '{' + newFuncBody + '}');
                }
            } else if (node.type === self.syntax.ReturnStatement) {
                if (node.argument) {
                    const tmpVar = '__njsTmp' + Math.floor(Math.random() * 10000) + '__';
                    traceExit = util.format(TRACE_EXIT, 'false', startLine,
                                instrumentOption.traceReturnValue ? tmpVar : 'null', 'null');

                    // tslint:disable-next-line:max-line-length
                    node.update('{\nvar ' + tmpVar + ' = ' + node.argument.source() + ';\n' + traceExit + '\nreturn ' + tmpVar + ';\n}');
                } else {
                    traceExit = util.format(TRACE_EXIT, 'false', startLine, 'null');
                    node.update('{' + traceExit + node.source() + '}');
                }
            } else if (node.type === self.syntax.CatchClause) {
                let origCatch = node.body.source();
                origCatch = origCatch.slice(1, origCatch.length - 1);
                node.body.update('{\n' + ON_CATCH + '\n' + origCatch + '\n}');
            }
        });

        return output.toString();
    }

    isFunctionNode(node: any) {
        return (node.type === this.syntax.FunctionDeclaration ||
            node.type === this.syntax.FunctionExpression || node.type === this.syntax.ArrowFunctionExpression) && node.range;
    }

    getFunctionName(node: any) {
        if (!this.isFunctionNode(node)) {
            return;
        }
        if (node.id) {
            return node.id.name;
        }

        if (node.type === this.syntax.FunctionDeclaration) {
            return '';
        }

        const parent = node.parent;
        switch (parent.type) {
            case this.syntax.AssignmentExpression:
                if (parent.left.range) {
                    return parent.left.source().replace(/"/g, '\\"');
                }
                break;

            case this.syntax.VariableDeclarator:
                return parent.id.name;

            case this.syntax.CallExpression:
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
        global.__njsTraceEntry__ = function (args: any) {
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

        global.__njsTraceExit__ = function (args: any) {
            try {
                const span = self.tracer.getActiveSpan();
                console.log(args.exceptionValue);
                if (!args.exception) {
                    span.setTag(RETURN_VALUE_TAG_NAME, new ReturnValue(typeof args.returnValue, args.returnValue));
                } else {
                    span.setTag('error', args.exception);
                    span.setTag('error.kind', Utils.parseError(args.exceptionValue).errorType);
                }
                self.tracer.finishSpan();
            } catch (ex) {
                console.log(ex);
            }
        };

        global.__njsOnCatchClause__ = function (args: any) {
            self.tracer.finishSpan();
        };
    }

    // tslint:disable-next-line:member-ordering
    syntax = {
        AssignmentExpression: 'AssignmentExpression',
        AssignmentPattern: 'AssignmentPattern',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        AwaitExpression: 'AwaitExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExportAllDeclaration: 'ExportAllDeclaration',
        ExportDefaultDeclaration: 'ExportDefaultDeclaration',
        ExportNamedDeclaration: 'ExportNamedDeclaration',
        ExportSpecifier: 'ExportSpecifier',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForOfStatement: 'ForOfStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        ImportDefaultSpecifier: 'ImportDefaultSpecifier',
        ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
        ImportSpecifier: 'ImportSpecifier',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MetaProperty: 'MetaProperty',
        MethodDefinition: 'MethodDefinition',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        RestElement: 'RestElement',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        Super: 'Super',
        SwitchCase: 'SwitchCase',
        SwitchStatement: 'SwitchStatement',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression',
    };
}

export default ModuleHack;
