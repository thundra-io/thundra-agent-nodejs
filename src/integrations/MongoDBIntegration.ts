import Integration from './Integration';
import {
    DBTags, SpanTags, DomainNames, DBTypes, MongoDBTags, MongoDBCommandTypes,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, ClassNames,
    DefaultMongoCommandSizeLimit,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import Utils from '../utils/Utils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const get = require('lodash.get');

const MODULE_NAME = 'mongodb';
const MODULE_VERSION = '>=1';

class MongoDBIntegration implements Integration {
    config: any;
    instrumentContext: any;
    listener: any;
    spans: any;

    constructor(config: any) {
        this.config = config || {};
        this.spans = {};
        this.instrumentContext = Utils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    onStarted(event: any) {
        let span: ThundraSpan;
        try {
            const { tracer } = ExecutionContextManager.get();

            if (!tracer) {
                return;
            }
            let hostPort: string[];
            const parentSpan = tracer.getActiveSpan();
            const commandName: string = get(event, 'commandName', '');
            const commandNameUpper: string = commandName.toUpperCase();
            const collectionName: string = get(event.command, commandName, '');
            const dbName: string = get(event, 'databaseName', '');
            const connectionId = get(event, 'connectionId', '');
            if (typeof connectionId === 'object') {
                hostPort = [
                    get(connectionId, 'host', '' ),
                    get(connectionId, 'port', '' ),
                ];
            } else if (typeof connectionId === 'string') {
                hostPort = connectionId.split(':', 2);
            } else if (typeof connectionId === 'number') {
                const address = get(event, 'address', ':');
                hostPort = address.split(':', 2);
            }

            const host = hostPort[0];
            const port = hostPort.length === 2 ? hostPort[1] : '';
            const operationType = get(MongoDBCommandTypes, commandNameUpper, '');
            let maskedCommand;

            if (!this.config.maskMongoDBCommand) {
                maskedCommand = JSON.stringify(event.command).substr(0, DefaultMongoCommandSizeLimit);
            }

            span = tracer._startSpan(dbName, {
                childOf: parentSpan,
                domainName: DomainNames.DB,
                className: ClassNames.MONGODB,
                disableActiveStart: true,
                tags: {
                    [DBTags.DB_TYPE]: DBTypes.MONGODB,
                    [DBTags.DB_HOST]: host,
                    [DBTags.DB_PORT]: port,
                    [DBTags.DB_INSTANCE]: dbName,
                    [DBTags.DB_STATEMENT]: maskedCommand,
                    [MongoDBTags.MONGODB_COMMAND_NAME]: commandNameUpper,
                    [MongoDBTags.MONGODB_COLLECTION]: collectionName,
                    [MongoDBTags.MONGODB_COMMAND]: maskedCommand,
                    [SpanTags.OPERATION_TYPE]: operationType,
                    [SpanTags.TOPOLOGY_VERTEX]: true,
                    [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                    [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                },
            });

            span._initialized();

            this.spans[event.requestId] = span;
        } catch (error) {
            if (span) {
                span.close();
            }

            if (error instanceof ThundraChaosError) {
                throw error;
            } else {
                ThundraLogger.error(error);
            }
        }
    }

    onSucceeded(event: any) {
        const span: ThundraSpan = get(this.spans, event.requestId, null);
        if (span === null) {
            return;
        }
        delete this.spans[event.requestId];

        try {
            span.close();
        } catch (error) {
            ThundraLogger.error(error);
        }
    }

    onFailed(event: any) {
        const span: ThundraSpan = get(this.spans, event.requestId, null);
        if (span === null) {
            return;
        }
        delete this.spans[event.requestId];

        try {
            span.setErrorTag(event.failure);
            span.close();
        } catch (error) {
            ThundraLogger.error(error);
        }
    }

    wrap(lib: any) {
        if (lib) {
            this.listener = lib.instrument();
            this.listener.on('started', (this.onStarted.bind(this)));
            this.listener.on('succeeded', this.onSucceeded.bind(this));
            this.listener.on('failed', this.onFailed.bind(this));
        }
    }

    doUnwrap(lib: any) {
        return;
    }

    unwrap() {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default MongoDBIntegration;
