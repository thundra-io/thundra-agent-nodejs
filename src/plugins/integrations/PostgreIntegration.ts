import Integration from './Integration';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes,
    SQLQueryOperationTypes, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import Utils from '../utils/Utils';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import ThundraChaosError from '../error/ThundraChaosError';

const shimmer = require('shimmer');
const has = require('lodash.has');

const moduleName = 'pg';

class PostgreIntegration implements Integration {
    config: any;
    lib: any;
    version: string;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.version = '6.x || 7.x';
        this.wrapped = false;
        this.lib = Utils.tryRequire(moduleName);

        if (this.lib) {
            const { basedir } = Utils.getModuleInfo(moduleName);
            if (!basedir) {
                ThundraLogger.getInstance().error(`Base directory is not found for the package ${moduleName}`);
                return;
            }
            const moduleValidator = new ModuleVersionValidator();
            const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
            if (!isValidVersion) {
                ThundraLogger.getInstance().error(`Invalid module version. for ${moduleName} integration.
                                            Supported version is ${this.version}`);
                return;
            } else {
                this.config = config;
                this.basedir = basedir;
                this.wrap.call(this, this.lib, config);
            }
        }
    }

    getStatement(args: any[]) {
        let text;
        let values;

        if (typeof args[0] === 'string') {
            text = args[0];
        } else if (typeof args[0] === 'object') {
            text = args[0].text;
        }

        if (args[1] instanceof Array) {
            values = args[1];
        } else if (typeof args[0] === 'object') {
            values = args[0].values;
        }

        if (values) {
            text = Utils.replaceArgs(text, values);
        }

        return text;
    }

    wrap(lib: any, config: any) {
        const integration = this;
        function wrapper(query: any, args: any) {
            return function queryWrapper() {
                let span: ThundraSpan;
                try {
                    const tracer = integration.config.tracer;

                    if (!tracer) {
                        return query.apply(this, arguments);
                    }

                    const functionName = InvocationSupport.getFunctionName();
                    const parentSpan = tracer.getActiveSpan();

                    const params = this.connectionParameters;
                    const me = this;

                    span = tracer._startSpan(params.database, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: DBTypes.PG.toUpperCase(),
                        disableActiveStart: true,
                    });

                    if (params) {
                        span.addTags({
                            [SpanTags.SPAN_TYPE]: SpanTypes.RDB,
                            [DBTags.DB_INSTANCE]: params.database,
                            [DBTags.DB_USER]: params.user,
                            [DBTags.DB_HOST]: params.host,
                            [DBTags.DB_PORT]: params.port,
                            [DBTags.DB_TYPE]: DBTypes.PG,
                            [SpanTags.TOPOLOGY_VERTEX]: true,
                            [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                            [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                            [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
                        });
                    }

                    const newArgs = [...arguments];
                    const hasCallback = newArgs.length > 0 && typeof newArgs[newArgs.length - 1] === 'function';
                    let originalCallback = () => {
                        // empty callback
                    };

                    if (hasCallback) {
                        originalCallback = newArgs.pop();
                    }

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }

                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    newArgs.push(wrappedCallback);

                    const originalRes = query.apply(this, newArgs);

                    const statement = integration.getStatement(newArgs);

                    if (statement) {
                        const statementType = statement.split(' ')[0].toUpperCase();
                        span.addTags({
                            [DBTags.DB_STATEMENT_TYPE]: statementType,
                            [DBTags.DB_STATEMENT]: config.maskRdbStatement ? undefined : statement,
                            [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[statementType] ?
                                SQLQueryOperationTypes[statementType] : '',
                        });
                    }

                    span._initialized();

                    return originalRes;
                } catch (error) {
                    if (span) {
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        ThundraLogger.getInstance().error(error);
                        query.apply(this, arguments);
                    }
                }
            };
        }

        if (this.wrapped) {
            this.unwrap();
        }

        if (has(lib, 'Client.prototype.query')) {
            shimmer.wrap(lib.Client.prototype, 'query', wrapper);
            this.wrapped = true;
        }
    }

    unwrap() {
        shimmer.unwrap(this.lib.Client.prototype, 'query');
        this.wrapped = false;
    }
}

export default PostgreIntegration;
