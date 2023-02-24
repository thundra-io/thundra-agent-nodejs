import Integration from './Integration';
import {
    DBTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    DBTypes,
    SQLQueryOperationTypes,
    ClassNames,
    INTEGRATIONS,
    MAX_DB_RESULT_COUNT,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');

const FILE_NAME = 'lib/Connection';
const INTEGRATION_NAME = 'mysql';

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
        const mysqlIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            mysqlIntegration.moduleNames, mysqlIntegration.moduleVersion,
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
        ThundraLogger.debug('<MySQLIntegration> Wrap');

        function wrapper(query: any) {
            return function queryWrapper(sql: any, arg1: any, arg2: any) {
                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<MySQLIntegration> Tracing MySQL query:', sql);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<MySQLIntegration> Skipped tracing query as no tracer is available');
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
                        ({ params, callback } = MySQLIntegration._parseQueryArgs(arg1, arg2));
                    }
                    if (callback === undefined && sql._callback) {
                        // In pool connection, no callback passed, but _callback is being used.
                        callback = sql._callback;
                        overrideInnerCallback = true;
                    }

                    const originalCallback = callback;

                    // Start trace

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
                        } else {
                            try {
                                let { rowCount, rows } = res;
                                if (!rowCount && res instanceof Array) {
                                    rowCount = res.length;
                                    rows = res;
                                }
                                span.setTag(DBTags.DB_RESULT_COUNT, rowCount);
                                if (!config.maskRdbResult && Array.isArray(rows) && rows.length) {
                                    span.setTag(
                                        DBTags.DB_RESULTS,
                                        rows.length > MAX_DB_RESULT_COUNT
                                            ? rows.slice(0, MAX_DB_RESULT_COUNT)
                                            : rows);
                                }
                            } catch (e) {
                                ThundraLogger.debug(`<MySQLIntegration> Unable to capture DB results`, e);
                            }
                        }
                        ThundraLogger.debug(`<MySQLIntegration> Closing MySQL span with name ${span.getOperationName()}`);
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
                    ThundraLogger.error('<MySQLIntegration> Error occurred while tracing MySQL query:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<MySQLIntegration> Because of error, closing MySQL span with name ${span.getOperationName()}`);

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
