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
            this.config);
    }

    private static _parseQueryArgs(arg1: any, arg2: any): any {
        const paramNotSet = (arg2 === undefined && arg1 instanceof Function);
        const callback = (paramNotSet) ? arg1 : arg2;
        const params = (paramNotSet) ? [] : arg1;

        return { params, callback };
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        ThundraLogger.debug('<MySQL2Integration> Wrap');

        function wrapper(query: any) {
            return function queryWrapper(sql: any, arg1: any, arg2: any) {
                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<MySQL2Integration> Tracing MySQL query:', sql);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<MySQL2Integration> Skipped tracing query as no tracer is available');
                        return query.call(this, sql, arg1, arg2);
                    }

                    // Find query, params and callback

                    let queryString: string;
                    let params: any;
                    let callback: any;
                    let overrideInnerCallback = false;

                    if (typeof sql !== 'string') {
                        queryString = sql.sql;
                    } else {
                        queryString = sql;
                    }
                    if (sql.onResult) {
                        params = sql.values;
                        callback = sql.onResult;
                    } else {
                        ({ params, callback } = MySQL2Integration._parseQueryArgs(arg1, arg2));
                    }
                    if (callback === undefined && sql._callback) {
                        // In pool connection, no callback passed, but _callback is being used.
                        callback = sql._callback;
                        overrideInnerCallback = true;
                    }

                    const originalCallback = callback;

                    // Start trace

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
                    if (queryString) {
                        const statementType = queryString.split(' ')[0].toUpperCase();
                        span.addTags({
                            [DBTags.DB_STATEMENT_TYPE]: statementType,
                            [DBTags.DB_STATEMENT]: config.maskRdbStatement ? undefined : queryString,
                            [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[statementType]
                                ? SQLQueryOperationTypes[statementType]
                                : '',
                        });
                    }

                    span._initialized();

                    // Wrap the query and then let it execute

                    const wrappedCallback = (err: any, res: any, fields: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }
                        ThundraLogger.debug(`<MySQL2Integration> Closing MySQL span with name ${span.getOperationName()}`);
                        span.closeWithCallback(this, originalCallback, [err, res, fields]);
                    };

                    if (sql.onResult) {
                        sql.onResult = wrappedCallback;
                    } else {
                        callback = wrappedCallback;
                    }
                    if (overrideInnerCallback) {
                        sql._callback = wrappedCallback;
                    }

                    return query.call(this, sql, params, callback);
                } catch (error) {
                    ThundraLogger.error('<MySQL2Integration> Error occurred while tracing MySQL query:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<MySQL2Integration> Because of error, closing MySQL span with name ${span.getOperationName()}`);

                        span.setErrorTag(error);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return query.call(this, sql, arg1, arg2);
                    }
                }
            };
        }

        if (has(lib, 'Connection.prototype.query')) {
            ThundraLogger.debug('<MySQL2Integration> Wrapping "mysql2.query"');

            shimmer.wrap(lib.Connection.prototype, 'query', wrapper);
        }

        if (has(lib, 'Connection.prototype.execute')) {
            ThundraLogger.debug('<MySQL2Integration> Wrapping "mysql2.execute"');

            shimmer.wrap(lib.Connection.prototype, 'execute', wrapper);
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
