import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, MongoDBTags, MongoDBCommandTypes,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, ClassNames,
} from '../../Constants';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');
const get = require('lodash.get');

let mongodb: any = null;
try {
    mongodb = require('mongodb');
} catch (e) {
    // mongodb library not available
}

class MongoDBIntegration implements Integration {
    config: any;
    lib: any;
    version: string;
    hook: any;
    basedir: string;
    listener: any;
    spans: any;

    constructor(config: any) {
        this.spans = {};
        if (mongodb !== null) {
            this.listener = mongodb.instrument();
            this.listener.on('started', (this.onStarted.bind(this)));
            this.listener.on('succeeded', this.onSucceeded.bind(this));
            this.listener.on('failed', this.onFailed.bind(this));
        }
    }

    onStarted(event: any) {
        console.log('on started event: ', event.command[event.commandName]);
        let span: ThundraSpan;
        try {
            const tracer = ThundraTracer.getInstance();

            if (!tracer) {
                return;
            }

            const parentSpan = tracer.getActiveSpan();
            const functionName = InvocationSupport.getFunctionName();
            const commandName: string = get(event, 'commandName', '');
            const collectionName: string = get(event.command, commandName, '');
            const dbName: string = get(event, 'databaseName', '');
            const connectionId: string = get(event, 'connectionId', '');
            const hostPort: string[] = connectionId.split(':', 2);
            const host = hostPort[0];
            const port = hostPort.length === 2 ? hostPort[1] : '';
            const operationType = get(MongoDBCommandTypes, commandName.toUpperCase(), '');

            span = tracer._startSpan(commandName.toUpperCase(), {
                childOf: parentSpan,
                domainName: DomainNames.DB,
                className: ClassNames.MONGODB,
                disableActiveStart: true,
                tags: {
                    [DBTags.DB_TYPE]: DBTypes.MONGODB,
                    [DBTags.DB_HOST]: host,
                    [DBTags.DB_PORT]: port,
                    [DBTags.DB_INSTANCE]: dbName,
                    [MongoDBTags.MONGODB_COMMAND_NAME]: commandName.toUpperCase(),
                    [MongoDBTags.MONGODB_COLLECTION]: collectionName,
                    [SpanTags.OPERATION_TYPE]: operationType,
                    [SpanTags.TOPOLOGY_VERTEX]: true,
                    [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                    [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                    [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
                },
            });

            this.spans[event.requestId] = span;
        } catch (error) {
            if (span) {
                span.close();
            }

            ThundraLogger.getInstance().error(error);
        }
    }

    onSucceeded(event: any) {
        const span: ThundraSpan = get(this.spans, event.requestId, null);
        if (span === null) {
            return;
        }

        try {
            span.close();
        } catch (error) {
            ThundraLogger.getInstance().error(error);
        }
    }

    onFailed(event: any) {
        const span: ThundraSpan = get(this.spans, event.requestId, null);
        if (span === null) {
            return;
        }

        try {
            span.setErrorTag(event.failure);
            span.close();
        } catch (error) {
            ThundraLogger.getInstance().error(error);
        }
    }

    wrap() {
        return;
    }

    unwrap() {
        return;
    }
}

export default MongoDBIntegration;
