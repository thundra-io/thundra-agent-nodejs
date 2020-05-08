import Integration from './Integration';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, SQLQueryOperationTypes,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, ClassNames,
} from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import Utils from '../utils/Utils';
import ThundraChaosError from '../error/ThundraChaosError';

const shimmer = require('shimmer');
const has = require('lodash.has');

const MODULE_NAME = 'mysql2';
const FILE_NAME = 'lib/connection';
const MODULE_VERSION = '>=1.5';

class MySQL2Integration implements Integration {
    config: any;
    instrumentContext: any;

    constructor(config: any) {
        this.config = config;
        this.instrumentContext = Utils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            config,
            null,
            FILE_NAME);
    }

    wrap(lib: any, config: any) {
        const integration = this;
        function wrapper(query: any) {
            let span: ThundraSpan;

            return function queryWrapper(sql: any, values: any, cb: any) {
                try {
                    const tracer = integration.config.tracer;

                    if (!tracer) {
                        return query.call(this, sql, values, cb);
                    }

                    const me = this;
                    const functionName = InvocationSupport.getFunctionName();
                    const parentSpan = tracer.getActiveSpan();

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

                    span._initialized();

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

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        ThundraLogger.getInstance().error(error);
                        query.call(this, sql, values, cb);
                    }
                }
            };
        }

        if (has(lib, 'prototype.query')) {
            shimmer.wrap(lib.prototype, 'query', wrapper);
        }
    }

    doUnwrap(lib: any) {
        shimmer.unwrap(lib.prototype, 'query');
    }

    unwrap() {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default MySQL2Integration;
