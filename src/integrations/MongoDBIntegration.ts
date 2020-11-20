import Integration from './Integration';
import {
    DBTags, SpanTags, DomainNames, DBTypes, MongoDBTags, MongoDBCommandTypes,
    ClassNames, DefaultMongoCommandSizeLimit,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const get = require('lodash.get');

const MODULE_NAME = 'mongodb';
const MODULE_VERSION = '>=1';

/**
 * {@link Integration} implementation for MongoDB integration
 * through {@code mongodb} library
 */
class MongoDBIntegration implements Integration {

    config: any;
    private instrumentContext: any;
    private listener: any;
    private spans: any;

    constructor(config: any) {
        ThundraLogger.debug('<MongoDBIntegration> Activating MongoDB integration');

        this.config = config || {};
        this.spans = {};
        this.instrumentContext = ModuleUtils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    /**
     * Called on the start of MongoDB command
     * @param event the event
     */
    onStarted(event: any) {
        let span: ThundraSpan;
        try {
            ThundraLogger.debug('<MongoDBIntegration> Tracing MongoDB command:', event);

            const { tracer } = ExecutionContextManager.get();

            if (!tracer) {
                ThundraLogger.debug('<MongoDBIntegration> Skipped tracing request as no tracer is available');
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

            ThundraLogger.debug(`<MongoDBIntegration> Starting MongoDB span with name ${dbName}`);

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
                },
            });

            span._initialized();

            this.spans[event.requestId] = span;
        } catch (error) {
            ThundraLogger.error('<MongoDBIntegration> Error occurred while tracing MongoDB command:', error);

            if (span) {
                ThundraLogger.debug(
                    `<MongoDBIntegration> Because of error, closing MongoDB span with name ${span.getOperationName()}`);
                span.close();
            }

            if (error instanceof ThundraChaosError) {
                throw error;
            }
        }
    }

    /**
     * Called on the success of MongoDB command
     * @param event the event
     */
    onSucceeded(event: any) {
        const span: ThundraSpan = get(this.spans, event.requestId, null);
        if (span === null) {
            return;
        }
        delete this.spans[event.requestId];

        try {
            ThundraLogger.debug(`<MongoDBIntegration> Closing MongoDB span with name ${span.getOperationName()}`);
            span.close();
        } catch (error) {
            ThundraLogger.error(
                `<MongoDBIntegration> Error occurred while closing MongoDB span with name ${span.getOperationName()}:`, error);
        }
    }

    /**
     * Called on the fail of MongoDB command
     * @param event the event
     */
    onFailed(event: any) {
        const span: ThundraSpan = get(this.spans, event.requestId, null);
        if (span === null) {
            return;
        }
        delete this.spans[event.requestId];

        try {
            span.setErrorTag(event.failure);
            ThundraLogger.debug(`<MongoDBIntegration> Closing MongoDB span with name ${span.getOperationName()}`);
            span.close();
        } catch (error) {
            ThundraLogger.error(
                `<MongoDBIntegration> Error occurred while closing MongoDB span with name ${span.getOperationName()}:`, error);
        }
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any) {
        ThundraLogger.debug('<MongoDBIntegration> Wrap');

        if (lib) {
            this.listener = lib.instrument();
            ThundraLogger.debug('<MongoDBIntegration> Registering to "started" event');
            this.listener.on('started', (this.onStarted.bind(this)));
            ThundraLogger.debug('<MongoDBIntegration> Registering to "succeeded" event');
            this.listener.on('succeeded', this.onSucceeded.bind(this));
            ThundraLogger.debug('<MongoDBIntegration> Registering to "failed" event');
            this.listener.on('failed', this.onFailed.bind(this));
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<MongoDBIntegration> Do unwrap');

        return;
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<MongoDBIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

}

export default MongoDBIntegration;
