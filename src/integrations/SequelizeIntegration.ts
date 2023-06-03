import Integration from './Integration';
import {
    DBTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    SQLQueryOperationTypes,
    INTEGRATIONS,
    MAX_DB_RESULT_COUNT,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';
import ScopeContext from '../context/ScopeContext';

const shimmer = require('shimmer');
const has = require('lodash.has');

const INTEGRATION_NAME = 'sequelize';

/**
 * {@link Integration} implementation for database integration
 * through {@code sequelize} ORM library
 */
class SequelizeIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<SequelizeIntegration> Activating Sequelize integration');

        this.config = config || {};
        const sequelizeIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            sequelizeIntegration.moduleNames, sequelizeIntegration.moduleVersion,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    private static extractTableFromQuery(query: string) {
        try {
            const result = query?.match(/(?<=from|join|truncate)\s+\"?\`?(\w+)\"?\`?/gi);
            if (!Array.isArray(result)) {
                return;
            }

            return result
                .map((table) =>
                    table
                        .trim()
                        .replace(/^"(.*)"$/, '$1')
                        .replace(/^`(.*)`$/, '$1'),
                )
                .sort()
                .join(',');
        } catch {
            return;
        }
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        ThundraLogger.debug('<SequelizeIntegration> Wrap');

        function wrapper(query: any) {
            return function queryWrapper(sql: any, options: any) {
                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<SequelizeIntegration> Tracing Sequelize query:', sql);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<SequelizeIntegration> Skipped tracing query as no tracer is available');
                        return query.call(this, sql, options);
                    }

                    let statement = sql?.query ? sql.query : sql;
                    let operation = options?.type;

                    if (typeof statement === 'string') {
                        statement = statement.trim();
                        if (!operation) {
                            operation = statement.split(' ')[0];
                        }
                    }

                    const sequelizeInstance = this;
                    const sequelizeConfig = sequelizeInstance?.config;

                    let tableName: string = options?.instance?.constructor?.tableName;
                    if (!tableName) {
                        if (Array.isArray(options?.tableNames) && options.tableNames.length > 0) {
                            tableName = options?.tableNames.sort().join(',');
                        } else {
                            tableName = SequelizeIntegration.extractTableFromQuery(statement);
                        }
                    }

                    const parentSpan = tracer.getActiveSpan();

                    ThundraLogger.debug(`<MySQLIntegration> Starting MySQL span with name ${this.config.database}`);

                    const dbType: string = sequelizeInstance.getDialect();
                    const dbName: string = sequelizeConfig?.database || sequelizeConfig?.host || tableName;

                    span = tracer._startSpan(dbName, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: dbType.toUpperCase(),
                        disableActiveStart: true,
                    });

                    span.addTags({
                        [SpanTags.SPAN_TYPE]: SpanTypes.RDB,
                        [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[operation] || operation,
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                        [DBTags.DB_INSTANCE]: sequelizeConfig?.database,
                        [DBTags.DB_USER]: sequelizeConfig?.username,
                        [DBTags.DB_HOST]: sequelizeConfig?.host,
                        [DBTags.DB_PORT]: sequelizeConfig?.port ? Number(sequelizeConfig?.port) : undefined,
                        [DBTags.DB_TYPE]: dbType.toLowerCase(),
                        [DBTags.DB_STATEMENT_TYPE]: operation,
                        [DBTags.DB_STATEMENT]: config.maskRdbStatement ? undefined : statement,
                    });

                    span._initialized();

                    const scopeContext: ScopeContext = ExecutionContextManager.getScope();
                    if (scopeContext) {
                        scopeContext.stopTracing();
                    }

                    return query.call(this, sql, options)
                        .then((res: any) => {
                            ThundraLogger.debug(
                                `<SequelizeIntegration> Closing Sequelize span with name ${span.getOperationName()}`);
                            try {
                                if (res) {
                                    if (res instanceof Array) {
                                       span.setTag(DBTags.DB_RESULT_COUNT, res.length);
                                       if (!config.maskRdbResult) {
                                            span.setTag(
                                                DBTags.DB_RESULTS,
                                                res.length > MAX_DB_RESULT_COUNT
                                                    ? res.slice(0, MAX_DB_RESULT_COUNT)
                                                    : res);
                                        }
                                    } else {
                                        span.setTag(DBTags.DB_RESULT_COUNT, 1);
                                        if (!config.maskRdbResult) {
                                            span.setTag(DBTags.DB_RESULTS, [res]);
                                        }
                                    }
                                }
                            } catch (e) {
                                ThundraLogger.debug(`<SequelizeIntegration> Unable to capture DB results`, e);
                            }
                            span.close();
                            return res;
                        })
                        .catch((err: Error) => {
                            ThundraLogger.debug(
                                `<SequelizeIntegration> Closing Sequelize span with name ${span.getOperationName()} ` +
                                `because of error:`, err);
                            span.setErrorTag(err);
                            span.close();
                            throw err;
                        });
                } catch (error) {
                    ThundraLogger.error(
                        '<SequelizeIntegration> Error occurred while tracing Sequelize query:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<SequelizeIntegration> Because of error, ` +
                            `closing Sequelize span with name ${span.getOperationName()}`);
                        span.setErrorTag(error);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return query.call(this, sql, options);
                    }
                }
            };
        }

        if (has(lib, 'Sequelize.prototype.query')) {
            ThundraLogger.debug('<SequelizeIntegration> Wrapping "sequelize.query"');

            shimmer.wrap(lib.Sequelize.prototype, 'query', wrapper);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<SequelizeIntegration> Do unwrap');

        ThundraLogger.debug('<SequelizeIntegration> Unwrapping "sequelize.query"');

        shimmer.unwrap(lib.Sequelize.prototype, 'query');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<SequelizeIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

}

export default SequelizeIntegration;
