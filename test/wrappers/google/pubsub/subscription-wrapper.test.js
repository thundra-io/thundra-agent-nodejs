import ExecutionContextManager from '../../../../dist/context/ExecutionContextManager';
import ConfigProvider from '../../../../dist/config/ConfigProvider';
import {
    SpanTags,
    ClassNames,
    SpanTypes,
    DomainNames,
    GooglePubSubTags,
} from '../../../../dist/Constants';

import * as SubscriptionWrapper from '../../../../dist/wrappers/google/pubsub/SubscriptionWrapper';
import { createMockReporterInstance } from '../../../mocks/mocks';

const { PubSub } = require('@google-cloud/pubsub');

describe('Google subscription Wrapper Tests', () => {
    const projectId = 'project-test';
    const subscriptionName = 'pub-sub-tryer-sub';

    const getMessage = () => {
        return new function() {
            const data = {
                _handled: true,
                attributes: {
                    'x-thundra-transaction-id': 'incomingTransactionId',
                    'x-thundra-trace-id': 'incomingTraceId',
                    'x-thundra-span-id': 'incomingSpanId',
                    'x-thundra-resource-name': 'incomingResourceName',
                },
                data: {},
                _subscriber: {
                    _subscription: {
                        metadata: {
                            topic: subscriptionName 
                        },
                        pubsub: {
                            projectId,
                        }
                    }
                }
            };

            return data;
        };
    };

    let pubsub;

    beforeAll(async () => {

        ConfigProvider.init({ apiKey: 'foo' });

        SubscriptionWrapper.__PRIVATE__.getReporter = jest.fn(() => createMockReporterInstance());
        SubscriptionWrapper.init();

        pubsub = new PubSub({
            projectId,
        });
    });
    
    afterAll(() => {
    });
    
    beforeEach(() => {
        ExecutionContextManager.useGlobalProvider();
    });

    test('should subscribe', (done) => {
        const testVerifier = () => {
            const execContext = ExecutionContextManager.get();
            const spanList = execContext.tracer.getSpanList();
            const rootSpan = spanList[0];

            expect(spanList.length).toBe(1);

            expect(rootSpan.operationName).toBe('incomingResourceName');
            expect(rootSpan.className).toBe(ClassNames.GOOGLE_PUBSUB_NODE_HANDLER);
            expect(rootSpan.domainName).toBe(DomainNames.MESSAGING);
            expect(rootSpan.startTime).toBeTruthy();
            expect(rootSpan.finishTime).toBeTruthy();
            expect(rootSpan.tags[GooglePubSubTags.PROJECT_ID]).toBe(projectId);
            expect(rootSpan.tags[GooglePubSubTags.SUBSCRIPTION]).toBe(subscriptionName);
            expect(rootSpan.tags[GooglePubSubTags.MESSAGES]).not.toBeTruthy();
            expect(rootSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_PUBSUB);

            done();
        };
        
        try {
            const subscription = pubsub.subscription(subscriptionName);
            const messageHandler = async (message) => {
            };
            
            subscription.once('message', messageHandler);
            subscription.emit('message', getMessage());
        } catch (error) {/** */}
        finally {
            setTimeout(testVerifier, 2000);
        }
    });
});