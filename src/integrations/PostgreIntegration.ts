import Integration from './Integration';
import {
    DBTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    DBTypes,
    SQLQueryOperationTypes,
    INTEGRATIONS,
    MAX_DB_RESULT_COUNT,
} from '../Constants';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');

const INTEGRATION_NAME = 'pg';
/**
 * {@link Integration} implementation for Postgre integration
 * through {@code pg} library
 */
class PostgreIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<PostgreIntegration> Activating Postgre integration');

        this.config = config || {};
        const pgIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            pgIntegration.moduleNames, pgIntegration.moduleVersion,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        const integration = this;
        function wrapper(query: any) {
            return function queryWrapper() {
                let span: ThundraSpan;
                try {
                    ThundraLogger.debug('<PostgreIntegration> Tracing Postgre query:', query);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<PostgreIntegration> Skipped tracing query as no tracer is available');
                        return query.apply(this, arguments);
                    }

                    const parentSpan = tracer.getActiveSpan();

                    const params = this.connectionParameters;
                    const me = this;

                    ThundraLogger.debug(`<PostgreIntegration> Starting Postgre span with name ${params.database}`);

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
                        });
                    }

                    const newArgs = [...arguments];

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

                    let originalCallback: any;
                    let callbackIndex = -1;

                    for (let i = 1; i < newArgs.length; i++) {
                        if (typeof newArgs[i] === 'function') {
                            originalCallback = newArgs[i];
                            callbackIndex = i;
                            break;
                        }
                    }

                    if (callbackIndex >= 0) {
                        const wrappedCallback = (err: any, res: any) => {
                            if (err) {
                                span.setErrorTag(err);
                            } else {
                                try {
                                    let {rowCount, rows} = res;
                                    if (!rowCount && res instanceof Array) {
                                        rowCount = res.length;
                                        rows = res;
                                    }
                                    span.addTags({
                                        [DBTags.DB_RESULT_COUNT]: rowCount,
                                        [DBTags.DB_RESULTS]:
                                            config.maskRdbResult
                                                ? undefined
                                                : (rows.length > MAX_DB_RESULT_COUNT
                                                    ? rows.slice(0, MAX_DB_RESULT_COUNT)
                                                    : rows),
                                    });
                                } catch (e) {
                                    ThundraLogger.debug(`<PostgreIntegration> Unable to capture DB results`, e);
                                }
                            }
                            ThundraLogger.debug(`<PostgreIntegration> Closing Postgre span with name ${span.getOperationName()}`);
                            span.closeWithCallback(me, originalCallback, [err, res]);
                        };
                        newArgs[callbackIndex] = wrappedCallback;
                    }

                    const result = query.apply(this, newArgs);

                    if (result && typeof result.then === 'function') {
                        result.then(function (value: any) {
                            ThundraLogger.debug(`<PostgreIntegration> Closing Postgre span with name ${span.getOperationName()}`);
                            span.close();
                            return value;
                        }).catch(function (error: any) {
                            ThundraLogger.debug(`<PostgreIntegration> Closing Postgre span with name ${span.getOperationName()}`);
                            span.close();
                            return error;
                        });
                    }

                    return result;
                } catch (error) {
                    ThundraLogger.error('<PostgreIntegration> Error occurred while tracing Postgre query:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<PostgreIntegration> Because of error, closing Postgre span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        query.apply(this, arguments);
                    }
                }
            };
        }

        if (has(lib, 'Client.prototype.query')) {
            ThundraLogger.debug('<PostgreIntegration> Wrapping "pg.query"');

            shimmer.wrap(lib.Client.prototype, 'query', wrapper);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<PostgreIntegration> Do unwrap');

        ThundraLogger.debug('<PostgreIntegration> Unwrapping "pg.query"');

        shimmer.unwrap(lib.Client.prototype, 'query');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<PostgreIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private replaceArgs(statement: string, values: any[]): string {
        const args = Array.prototype.slice.call(values);
        const replacer = (value: string) => args[parseInt(value.substr(1), 10) - 1];

        return statement.replace(/(\$\d+)/gm, replacer);
    }

    private getStatement(args: any[]) {
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
            text = this.replaceArgs(text, values);
        }

        return text;
    }

}

export default PostgreIntegration;
