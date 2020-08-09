import Integration from './Integration';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, SQLQueryOperationTypes, ClassNames,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import Utils from '../utils/Utils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');

const MODULE_NAME = 'mysql';
const FILE_NAME = 'lib/Connection';
const MODULE_VERSION = '>=2';

/**
 * {@link Integration} implementation for MySQL integration
 * through {@code mysql} library
 */
class MySQLIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<MySQLIntegration> Activating MySQL integration');

        this.config = config || {};
        this.instrumentContext = Utils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config,
            null,
            FILE_NAME);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        ThundraLogger.debug('<MySQLIntegration> Wrap');

        function wrapper(query: any) {
            let span: ThundraSpan;

            return function queryWrapper(sql: any, values: any, cb: any) {
                try {
                    ThundraLogger.debug('<MySQLIntegration> Tracing MySQL request:', sql);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<MySQLIntegration> Skipped tracing request as no tracer is available');
                        return query.call(this, sql, values, cb);
                    }

                    const me = this;
                    const parentSpan = tracer.getActiveSpan();

                    ThundraLogger.debug(`<MySQLIntegration> Starting MySQL span with name ${this.config.database}`);

                    span = tracer._startSpan(this.config.database, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: ClassNames.MYSQL,
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
                    });

                    const statement = sql;

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

                    const sequence = query.call(this, sql, values, cb);

                    const originalCallback = sequence.onResult;

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }
                        ThundraLogger.debug(`<MySQLIntegration> Closing MySQL span with name ${span.getOperationName()}`);
                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    if (sequence.onResult) {
                        sequence.onResult = wrappedCallback;
                    } else {
                        sequence.on('end', () => {
                            ThundraLogger.debug(`<MySQLIntegration> Closing MySQL span with name ${span.getOperationName()}`);
                            span.close();
                        });
                    }

                    return sequence;
                } catch (error) {
                    ThundraLogger.error('<MySQLIntegration> Error occurred while tracing MySQL query:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<MySQLIntegration> Because of error, closing MySQL span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        query.call(this, sql, values, cb);
                    }
                }
            };
        }

        if (has(lib, 'prototype.query')) {
            ThundraLogger.debug('<MySQLIntegration> Wrapping "mysql.query"');

            shimmer.wrap(lib.prototype, 'query', wrapper);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<MySQLIntegration> Do unwrap');

        ThundraLogger.debug('<MySQLIntegration> Unwrapping "mysql.query"');

        shimmer.unwrap(lib.prototype, 'query');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<MySQLIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

}

export default MySQLIntegration;
