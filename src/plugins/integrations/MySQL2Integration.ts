import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, SQLQueryOperationTypes,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import Utils from '../utils/Utils';

const shimmer = require('shimmer');
const has = require('lodash.has');

const moduleName = 'mysql2';

class MySQL2Integration implements Integration {
    config: any;
    lib: any;
    version: string;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.version = '^1.5';
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
                ThundraLogger.getInstance().error(`Invalid module version for mysql2 integration.
                                            Supported version is ${this.version}`);
                return;
            } else {
                this.config = config;
                this.basedir = basedir;
                this.wrap.call(this, this.lib, config);
            }
        }
    }

    wrap(lib: any, config: any) {
        function wrapper(query: any) {
            let span: ThundraSpan;

            return function queryWrapper(sql: any, values: any, cb: any) {
                try {
                    const tracer = ThundraTracer.getInstance();

                    if (!tracer) {
                        return query.call(this, sql, values, cb);
                    }

                    const me = this;
                    const functionName = InvocationSupport.getFunctionName();
                    const parentSpan = tracer.getActiveSpan();

                    span = tracer._startSpan(this.config.database, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: DBTypes.MYSQL.toUpperCase(),
                        disableActiveStart: true,
                    });

                    span.addTags({
                        [SpanTags.SPAN_TYPE]: SpanTypes.RDB,
                        [DBTags.DB_INSTANCE]: this.config.database,
                        [DBTags.DB_USER]: this.config.user,
                        [DBTags.DB_HOST]: this.config.host,
                        [DBTags.DB_PORT]: this.config.port,
                        [DBTags.DB_TYPE]: DBTypes.MYSQL,
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                        [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                        [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                        [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
                    });

                    const sequence = query.call(this, sql, values, cb);

                    const statement = sequence.sql;

                    if (statement) {
                        const statementType = statement.split(' ')[0].toUpperCase();
                        span.addTags({
                            [DBTags.DB_STATEMENT_TYPE]: statementType,
                            [DBTags.DB_STATEMENT]: config.maskRdbStatement ? undefined : statement,
                            [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[statementType] ?
                                SQLQueryOperationTypes[statementType] : '',
                        });
                    }

                    const originalCallback = sequence.onResult;

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }

                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    if (sequence.onResult) {
                        sequence.onResult = wrappedCallback;
                    } else {
                        sequence.on('end', () => {
                            span.close();
                        });
                    }

                    return sequence;
                } catch (error) {
                    if (span) {
                        span.close();
                    }

                    ThundraLogger.getInstance().error(error);
                    query.call(this, sql, values, cb);
                }
            };
        }

        if (this.wrapped) {
            this.unwrap();
        }

        if (has(lib.prototype, 'query')) {
            shimmer.wrap(lib.prototype, 'query', wrapper);
            this.wrapped = true;
        }
    }

    unwrap() {
        shimmer.unwrap(this.lib.prototype, 'query');
        this.wrapped = false;
    }
}

export default MySQL2Integration;
