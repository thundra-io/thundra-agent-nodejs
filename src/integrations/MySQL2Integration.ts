import Integration from './Integration';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, SQLQueryOperationTypes, ClassNames, INTEGRATIONS,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');

const FILE_NAME = 'lib/connection';
const INTEGRATION_NAME = 'mysql2';

/**
 * {@link Integration} implementation for MySQL integration
 * through {@code mysql2} library
 */
class MySQL2Integration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<MySQL2Integration> Activating MySQL2 integration');

        this.config = config || {};
        const mysql2Integration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            mysql2Integration.moduleNames, mysql2Integration.moduleVersion,
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
        ThundraLogger.debug('<MySQL2Integration> Wrap');

        function wrapper(query: any) {
            let span: ThundraSpan;

            return function queryWrapper(sql: any, values: any, cb: any) {
                try {
                    ThundraLogger.debug('<MySQL2Integration> Tracing MySQL query:', sql);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<MySQL2Integration> Skipped tracing query as no tracer is available');
                        return query.call(this, sql, values, cb);
                    }

                    const me = this;
                    const parentSpan = tracer.getActiveSpan();

                    ThundraLogger.debug(`<MySQL2Integration> Starting MySQL span with name ${this.config.database}`);

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

                    span._initialized();

                    const originalCallback = sequence.onResult;

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }
                        ThundraLogger.debug(`<MySQL2Integration> Closing MySQL span with name ${span.getOperationName()}`);
                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    if (sequence.onResult) {
                        sequence.onResult = wrappedCallback;
                    } else {
                        sequence.on('end', () => {
                            ThundraLogger.debug(`<MySQL2Integration> Closing MySQL span with name ${span.getOperationName()}`);
                            span.close();
                        });
                    }

                    return sequence;
                } catch (error) {
                    ThundraLogger.error('<MySQL2Integration> Error occurred while tracing MySQL query:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<MySQL2Integration> Because of error, closing MySQL span with name ${span.getOperationName()}`);
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
            ThundraLogger.debug('<MySQL2Integration> Wrapping "mysql2.query"');

            shimmer.wrap(lib.prototype, 'query', wrapper);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<MySQL2Integration> Do unwrap');

        ThundraLogger.debug('<MySQL2Integration> Unwrapping "mysql2.query"');

        shimmer.unwrap(lib.prototype, 'query');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<MySQL2Integration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

}

export default MySQL2Integration;
