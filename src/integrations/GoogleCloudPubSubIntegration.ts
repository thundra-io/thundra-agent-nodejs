import Integration from './Integration';
import * as opentracing from 'opentracing';
import {
    SpanTags,
    SpanTypes,
    DomainNames,
    ClassNames,
    TriggerHeaderTags,
    INTEGRATIONS,
    GoogleCommonTags,
    GooglePubSubTags,
    GooglePubSubOperationTypes,
} from '../Constants';
import GooglePubSubUtils from '../utils/GooglePubSubUtils';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');

const INTEGRATION_NAME = 'googlecloud.pubsub';

/**
 * {@link Integration} implementation for Google PubSub service publish and pull
 * through {@code publish} and {@code pull} method
 */
class GoogleCloudPubSubIntegration implements Integration {

    config: any;
    private wrappedFuncs: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<GoogleCloudPubSubIntegration> Activating Google PubSub integration');

        this.wrappedFuncs = {};
        this.config = config || {};

        const googleCloudPubSubIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            googleCloudPubSubIntegration.moduleNames, googleCloudPubSubIntegration.moduleVersion,
            (lib: any, cfg: any, moduleName: string) => {
                this.wrap.call(this, lib, cfg, moduleName);
            },
            (lib: any, cfg: any, moduleName: string) => {
                this.doUnwrap.call(this, lib, moduleName);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, thundraConfig: any, moduleName: string): void {
        ThundraLogger.debug('<GoogleCloudPubSubIntegration> Wrap');

        const integration = this;
        function requestWrapper(original: any, wrappedFunctionName: string) {
            integration.wrappedFuncs[wrappedFunctionName] = original;
            return function internalWrapper(config: any, callback: any) {

                const orginalCallback = callback;
                let span: ThundraSpan;
                let reachedToCallOriginalFunc: boolean = false;
                try {

                    ThundraLogger.debug('<GoogleCloudPubSubIntegration> Tracing GoogleCloudPubSubIntegration request:', config);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<GoogleCloudPubSubIntegration> Skipped tracing request as no tracer is available');
                        return original.apply(this, [config, orginalCallback]);
                    }

                    const originalFunction = integration.getOriginalFunction(wrappedFunctionName);
                    const parentSpan = tracer.getActiveSpan();

                    const topic = GooglePubSubUtils.getTopic(config);
                    const operationName = `${topic}`;

                    ThundraLogger.debug(`<GoogleCloudPubSubIntegration> Starting publish span with name ${operationName}`);

                    span = tracer._startSpan(operationName, {
                        childOf: parentSpan,
                        domainName: DomainNames.MESSAGING,
                        className: ClassNames.GOOGLE_PUBSUB,
                        disableActiveStart: true,
                    });

                    const getMessageBody = () => {
                        if (!config || !config.reqOpts || !config.reqOpts.messages) {
                            return;
                        }

                        return GooglePubSubUtils.parseMessages(config.reqOpts.messages);
                    };

                    const meesageContent = getMessageBody();

                    const tags = {
                        [GoogleCommonTags.PROJECT_ID]: this.projectId,
                        [GooglePubSubTags.TOPIC_NAME]: topic,
                        ...((meesageContent && !thundraConfig.maskGooglePubSubMessage) ? {
                            [GooglePubSubTags.MESSAGE]: getMessageBody(),
                        } : undefined),
                        [SpanTags.OPERATION_TYPE]: GooglePubSubOperationTypes.PUBLISH,
                        [SpanTags.SPAN_TYPE]: SpanTypes.GOOGLE_PUBSUB,
                        [SpanTags.TRACE_LINKS]: [span.spanContext.spanId],
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                    };

                    if (config.reqOpts && config.reqOpts.messages) {
                        for (const message of config.reqOpts.messages) {
                            const attributes = message.attributes ? message.attributes : {};
                            tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, attributes);
                            attributes[TriggerHeaderTags.RESOURCE_NAME] = operationName;
                            message.attributes = attributes;
                        }
                    }

                    span.addTags(tags);

                    const me = this;
                    const wrappedCallback = (err: any, res: any) => {
                        if (!span) {
                            orginalCallback(err, res);
                            return;
                        }

                        if (err) {
                            span.setErrorTag(err);
                        } else if (res && res.messageIds) {
                            span.addTags({ [GooglePubSubTags.MESSAGEIDS]: res.messageIds.join(',') });
                        }

                        span.closeWithCallback(me, orginalCallback, [err, res]);
                    };

                    span._initialized();
                    reachedToCallOriginalFunc = true;

                    return originalFunction.apply(this, [config, wrappedCallback]);
                } catch (error) {
                    ThundraLogger.error('<GoogleCloudPubSubIntegration> Error occurred while tracing PubSub request:', error);
                    if (span) {
                        span.setErrorTag(error);
                        span.close();
                    }

                    if (orginalCallback && (reachedToCallOriginalFunc || error instanceof ThundraChaosError)) {
                        return orginalCallback(error);
                    } else {
                        return original.apply(this, [config, orginalCallback]);
                    }
                }
            };
        }

        function pullWrapper(original: any, wrappedFunctionName: string) {
            integration.wrappedFuncs[wrappedFunctionName] = original;
            return function internalWrapper(request: any, options: any, callback: any) {

                let span: ThundraSpan;
                let reachedToCallOriginalFunc: boolean = false;
                try {
                    ThundraLogger.debug('<GoogleCloudPubSubIntegration> Tracing GoogleCloudPubSubIntegration pull');

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<GoogleCloudPubSubIntegration> Skipped tracing pull as no tracer is available');
                        return original.apply(this, [request, options, callback]);
                    }

                    const originalOptions = typeof options !== 'function' ? options : undefined;
                    const originalCallback = typeof options === 'function' ? options : callback;

                    const originalFunction = integration.getOriginalFunction(wrappedFunctionName);
                    const parentSpan = tracer.getActiveSpan();

                    const subscription = request.subscription;
                    const operationName = `${subscription}`;

                    ThundraLogger.debug(`<GoogleCloudPubSubIntegration> Starting pull span with name ${operationName}`);

                    const getMessageBody = (receivedMessages: any []) => {
                        if (!receivedMessages) {
                            return;
                        }

                        const messages = receivedMessages.map((receivedMessage) => receivedMessage.message);
                        return GooglePubSubUtils.parseMessages(messages);
                    };

                    const getProjectId = () => {
                        if (!subscription) {
                            return;
                        }

                        const topicInfo = subscription.split('/');
                        if (topicInfo.lenght < 1) {
                            return;
                        }

                        return topicInfo[1];
                    };

                    span = tracer._startSpan(operationName, {
                        childOf: parentSpan,
                        domainName: DomainNames.MESSAGING,
                        className: ClassNames.GOOGLE_PUBSUB,
                        disableActiveStart: true,
                    });

                    const tags = {
                        [GoogleCommonTags.PROJECT_ID]: getProjectId(),
                        [GooglePubSubTags.SUBSCRIPTION]: subscription,
                        [SpanTags.OPERATION_TYPE]: GooglePubSubOperationTypes.PULL,
                        [SpanTags.SPAN_TYPE]: SpanTypes.GOOGLE_PUBSUB,
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                    };

                    span.addTags(tags);
                    span._initialized();
                    reachedToCallOriginalFunc = true;

                    const wrappedCallback = (err: any, res: any)  => {
                        if (!span) {
                            if (originalCallback) {
                                originalCallback(err, res);
                            }

                            return;
                        }

                        if (err) {
                            span.setErrorTag(err);
                        } else if (res && res.receivedMessages) {
                            const messages = getMessageBody(res.receivedMessages);
                            if (messages) {
                                span.addTags({
                                    [GooglePubSubTags.MESSAGES]: thundraConfig.maskGooglePubSubMessage ? undefined
                                        : messages,
                                });
                            }
                        }

                        if (originalCallback) {
                            span.closeWithCallback(this, originalCallback, [err, res]);
                        } else {
                            span.close();
                        }
                    };

                    if (originalCallback) {
                        return originalFunction.apply(this, [request, originalOptions, wrappedCallback]);
                    } else {
                        return originalFunction.apply(this, [request, options, callback]).then(
                            (res: any) => {
                                const [response] = res;
                                wrappedCallback(null, response);
                                return res;
                            }, (err: any) => {
                                wrappedCallback(err, null);
                                throw err;
                            },
                        );
                    }
                } catch (error) {
                    ThundraLogger.error('<GoogleCloudPubSubIntegration> Error occurred while tracing PubSub pull:', error);

                    if (span) {
                        span.close();
                    }

                    if (reachedToCallOriginalFunc || error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return original.apply(this, [request, options, callback]);
                    }
                }
            };
        }

        if (has(lib, 'PubSub.prototype.request')) {
            ThundraLogger.debug('<GoogleCloudPubSubIntegration> Wrapping "PubSub.prototype.request"');
            shimmer.wrap(lib.PubSub.prototype, 'request', (wrapped: Function) => requestWrapper(wrapped, 'request'));
        }

        if (has(lib, 'v1.SubscriberClient.prototype.pull')) {
            ThundraLogger.debug('<GoogleCloudPubSubIntegration> Wrapping "v1.SubscriberClient.prototype.pull"');
            shimmer.wrap(lib.v1.SubscriberClient.prototype, 'pull', (wrapped: Function) => pullWrapper(wrapped, 'pull'));
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any, moduleName: string) {
        ThundraLogger.debug('<GoogleCloudPubSubIntegration> Do unwrap');

        if (has(lib, 'PubSub.prototype.request')) {
            ThundraLogger.debug('<GoogleCloudPubSubIntegration> Unwrapping "request"');
            shimmer.unwrap(lib.PubSub.prototype, 'request');
        }

        if (has(lib, 'v1.SubscriberClient.prototype.pull')) {
            ThundraLogger.debug('<GoogleCloudPubSubIntegration> Unwrapping "pull"');
            shimmer.unwrap(lib.v1.SubscriberClient.prototype, 'pull');
        }
    }

    /**
     * @inheritDoc
     */
    unwrap(): void {
        ThundraLogger.debug('<GoogleCloudPubSubIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private getOriginalFunction(wrappedFunctionName: string) {
        return get(this, `wrappedFuncs.${wrappedFunctionName}`);
    }
}

export default GoogleCloudPubSubIntegration;
