import GoogleCloudPubSubIntegration from '../../dist/integrations/GoogleCloudPubSubIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';
import {
    ErrorTags,
    SpanTags,
    ClassNames,
    SpanTypes,
    DomainNames,
    GooglePubSubOperationTypes,
    GooglePubSubTags,
    GoogleCommonTags,
} from '../../dist/Constants';

import Utils from '../../dist/utils/Utils';

const { PubSub } = require('@google-cloud/pubsub');

describe('Google Cloud PubSub Integration', () => {
    const projectId = 'project-test';
    const topicName = 'pub-sub-tryer-topic';
    const subscriptionName = 'pub-sub-tryer-sub'; 
    const consoleTopicName = `projects/${projectId}/topics/${topicName}`;
    const consoleSubscriptionName = `projects/${projectId}/subscriptions/${subscriptionName}`;

    const error = new Error('Test Error!');

    let tracer;
    let integration;
    let pubsub;

    let defaultTopic;

    const mockReqeust = jest.fn((config, wrappedCallback) => {
        const method = config.method.toUpperCase();
    
        let currentInstance = mockReqeust.mock.instances[0];
    
        let result;
        switch(method) {
        case 'CREATETOPIC':
            result = [
                currentInstance.topic(topicName),
                {}
            ];
            break;
        case 'PUBLISH':
            result = Utils.generateId();
            break;
        default:
            break;
        }
    
        if (!mockReqeust.injectError) {
            wrappedCallback(null, result);
        } else {
            wrappedCallback(error, null);
            mockReqeust.injectError = false;
        }
    });
    
    const mockPull = jest.fn(async (request, options, callback) => {
        if (!mockPull.injectError) {
            return [{
                receivedMessages: []
            }];
        } else {
            mockReqeust.injectError = false;
            throw error;
        }
    });

    const getData = () => {
        return Buffer.from(JSON.stringify({ 
            date: new Date()
        }));
    };

    const getTopic = async (_topicName) => {
        let _topic;
        try {
            const result = await pubsub.createTopic(_topicName);
            [_topic] = result;
        } catch (error) {
            console.warn(error);
        } finally {
            if (!_topic) {
                _topic = await pubsub.topic(_topicName);
            }
        }

        return _topic;
    };

    beforeAll(async () => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new GoogleCloudPubSubIntegration();
        pubsub = new PubSub({
            projectId,
        });

        defaultTopic = await getTopic(topicName);
        tracer.destroy();
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument create & publish', async () => {
       
        integration.getOriginalFunction = () => mockReqeust;

        const data = getData();
        const topic = await getTopic(topicName);
        const result = await topic.publishMessage({ data });
        const spanList = tracer.getRecorder().spanList;

        expect(spanList.length).toBe(2);

        const createTopicSpan = spanList[0];

        expect(createTopicSpan.operationName).toBe(`${consoleTopicName}`);
        expect(createTopicSpan.className).toBe(ClassNames.GOOGLE_PUBSUB);
        expect(createTopicSpan.domainName).toBe(DomainNames.MESSAGING);
        expect(createTopicSpan.tags[SpanTags.OPERATION_TYPE]).toBe(GooglePubSubOperationTypes.CREATE_TOPIC);
        expect(createTopicSpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
        expect(createTopicSpan.tags[GooglePubSubTags.TOPIC_NAME]).toBe(consoleTopicName);
        expect(createTopicSpan.tags[GooglePubSubTags.MESSAGE]).not.toBeTruthy();
        expect(createTopicSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_PUBSUB);
        expect(createTopicSpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);

        const publishSpan = spanList[1];

        expect(publishSpan.operationName).toBe(`${consoleTopicName}`);
        expect(publishSpan.className).toBe(ClassNames.GOOGLE_PUBSUB);
        expect(publishSpan.domainName).toBe(DomainNames.MESSAGING);
        expect(publishSpan.tags[SpanTags.OPERATION_TYPE]).toBe(GooglePubSubOperationTypes.PUBLISH);
        expect(publishSpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
        expect(publishSpan.tags[GooglePubSubTags.TOPIC_NAME]).toBe(consoleTopicName);
        expect(publishSpan.tags[GooglePubSubTags.MESSAGEIDS]).toBe(result);
        expect(publishSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_PUBSUB);
        expect(publishSpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
    });

    test('should instrument publish error', (done) => {
        mockReqeust.injectError = true;
        integration.getOriginalFunction = () => mockReqeust;

        const data = getData();
        defaultTopic.publishMessage({ data }, function(err, data) {
            const publishSpan = tracer.getRecorder().spanList[0];

            expect(publishSpan.operationName).toBe(`${consoleTopicName}`);
            expect(publishSpan.className).toBe(ClassNames.GOOGLE_PUBSUB);
            expect(publishSpan.domainName).toBe(DomainNames.MESSAGING);
            expect(publishSpan.tags[SpanTags.OPERATION_TYPE]).toBe(GooglePubSubOperationTypes.PUBLISH);
            expect(publishSpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
            expect(publishSpan.tags[GooglePubSubTags.TOPIC_NAME]).toBe(consoleTopicName);
            expect(publishSpan.tags[GooglePubSubTags.MESSAGE]).toBeTruthy();
            expect(publishSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_PUBSUB);
            expect(publishSpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
            expect(publishSpan.tags[ErrorTags.ERROR]).toBe(true);
            expect(publishSpan.tags[ErrorTags.ERROR_KIND]).toBe('Error');
            expect(publishSpan.tags[ErrorTags.ERROR_MESSAGE]).toBe(error.message);

            done();
        });
    });

    test('should instrument pull', async () => {

        integration.getOriginalFunction = () => mockPull;

        const { v1 } = require('@google-cloud/pubsub');

        const subClient = new v1.SubscriberClient();
        const formattedSubscription = subClient.subscriptionPath(
            projectId,
            subscriptionName
        );

        const pullRequest = {
            subscription: formattedSubscription,
            maxMessages: 10,
        };
        
        const [response] = await subClient.pull(pullRequest);

        const pullSpan = tracer.getRecorder().spanList[0];

        expect(pullSpan.operationName).toBe(`${consoleSubscriptionName}`);
        expect(pullSpan.className).toBe(ClassNames.GOOGLE_PUBSUB);
        expect(pullSpan.domainName).toBe(DomainNames.MESSAGING);
        expect(pullSpan.tags[SpanTags.OPERATION_TYPE]).toBe(GooglePubSubOperationTypes.PULL);
        expect(pullSpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
        expect(pullSpan.tags[GooglePubSubTags.SUBSCRIPTION]).toBe(consoleSubscriptionName);
        expect(pullSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_PUBSUB);
        expect(pullSpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
    });

    test('should instrument pull error', async () => {
        mockPull.injectError = true;
        integration.getOriginalFunction = () => mockPull;

        const { v1 } = require('@google-cloud/pubsub');

        const subClient = new v1.SubscriberClient();
        const formattedSubscription = subClient.subscriptionPath(
            projectId,
            subscriptionName
        );

        const pullRequest = {
            subscription: formattedSubscription,
            maxMessages: 10,
        };
        
        try {
            await subClient.pull(pullRequest);  
        } catch(err) {/** */} 
        finally {
            const pullSpan = tracer.getRecorder().spanList[0];

            expect(pullSpan.operationName).toBe(`${consoleSubscriptionName}`);
            expect(pullSpan.className).toBe(ClassNames.GOOGLE_PUBSUB);
            expect(pullSpan.domainName).toBe(DomainNames.MESSAGING);
            expect(pullSpan.tags[SpanTags.OPERATION_TYPE]).toBe(GooglePubSubOperationTypes.PULL);
            expect(pullSpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
            expect(pullSpan.tags[GooglePubSubTags.SUBSCRIPTION]).toBe(consoleSubscriptionName);
            expect(pullSpan.tags[GooglePubSubTags.MESSAGES]).not.toBeTruthy();
            expect(pullSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_PUBSUB);
            expect(pullSpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
            expect(pullSpan.tags[ErrorTags.ERROR]).toBe(true);
            expect(pullSpan.tags[ErrorTags.ERROR_KIND]).toBe('Error');
            expect(pullSpan.tags[ErrorTags.ERROR_MESSAGE]).toBe(error.message);
        }
    });
});