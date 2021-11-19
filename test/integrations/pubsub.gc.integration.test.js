import GoogleCloudPubSubIntegration from '../../dist/integrations/GoogleCloudPubSubIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

describe('Google Cloud PubSub Integration', () => {

    jest.setTimeout(600000);

    let tracer;
    let integration;
    
    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new GoogleCloudPubSubIntegration();
    });
    
    afterEach(() => {
        tracer.destroy();
    });
    
    test('should publish', async () => {
        
        const { PubSub } = require('@google-cloud/pubsub');
        
        const projectId = 'pub-sub-tryer'; // Your Google Cloud Platform project ID
        const topicName = 'pub-sub-tryer-topic'; // Name for the new topic to create
        const subscriptionName = 'pub-sub-tryer-sub';

        const pubsub = new PubSub({projectId});

        // const subscription = pubsub.subscription(subscriptionName);
        // // const [subscription] = await pubsub.topic(topicName).createSubscription(subscriptionName);
        
        // const messageHandler = message => {
        //     // console.log(`Received message ${message.id}:`);
        //     // console.log(`Data: ${message.data}`);
        //     // console.log(`tAttributes: ${message.attributes}`);
            
        //     // Ack the messae
        //     message.ack();
        // };
        
        // subscription.on('message', messageHandler);

        const data = new Date().toString();
        const dataBuffer = Buffer.from(data);

        // pubsub.topic(topicName).publishMessage({
        //     data: dataBuffer,
        // }, function(err, data) {
        //     // console.log(result); 

        //     const span = tracer.getRecorder().spanList[0];
        //     console.log(span);
        //     done();
        // });

        const result = await pubsub.topic(topicName).publishMessage({data: dataBuffer, attributes: { attr1: 'attt1' }});
    
        const span = tracer.getRecorder().spanList[0];
        console.log(span);

        // const result = await pubsub.topic(topicName).publisher.publishMessage({
        //     data: dataBuffer,
        // });



        // projects/pub-sub-tryer/topics/pub-sub-tryer-topic
        // expect(span.operationName).toBe('httpstat.us/200');
        // expect(span.className).toBe('HTTP');
        // expect(span.domainName).toBe('API');
    });


    test('should pull', (done) => {

        const { v1 } = require('@google-cloud/pubsub');

        // Creates a client; cache this for further use.
        const subClient = new v1.SubscriberClient();
        
        const projectId = 'pub-sub-tryer'; // Your Google Cloud Platform project ID
        const subscriptionName = 'pub-sub-tryer-sub'; // Name for the new subscription to create

        const formattedSubscription = subClient.subscriptionPath(
            projectId,
            subscriptionName
        );
      
        // The maximum number of messages returned for this request.
        // Pub/Sub may return fewer than the number specified.
        const request = {
            subscription: formattedSubscription,
            maxMessages: 10,
        };

        subClient.pull(request, async function handler(err, res) {

            console.log('abc');

            const span = tracer.getRecorder().spanList[0];
            console.log(span);
    
            console.log('abvcda');

            const response = res;

            if (response && response.receivedMessages){
                // Process the messages.
                const ackIds = [];
                for (const message of response.receivedMessages) {
                    console.log(`Received message: ${message.message.data}`);
                    ackIds.push(message.ackId);
                }

                if (ackIds.length !== 0) {
                    // Acknowledge all of the messages. You could also acknowledge
                    // these individually, but this is more efficient.
                    const ackRequest = {
                        subscription: formattedSubscription,
                        ackIds: ackIds,
                    };

                    await subClient.acknowledge(ackRequest);
                }
            }

            done();
        });
      
        // The subscriber pulls a specified number of messages.
        // const result = await subClient.pull(request);
      
        // const span = tracer.getRecorder().spanList[0];
        // console.log(span);

        // console.log('abvcda');

        // const [response] = result;

        // if (response && response.receivedMessages){
        //     // Process the messages.
        //     const ackIds = [];
        //     for (const message of response.receivedMessages) {
        //         console.log(`Received message: ${message.message.data}`);
        //         ackIds.push(message.ackId);
        //     }

        //     if (ackIds.length !== 0) {
        //         // Acknowledge all of the messages. You could also acknowledge
        //         // these individually, but this is more efficient.
        //         const ackRequest = {
        //             subscription: formattedSubscription,
        //             ackIds: ackIds,
        //         };

        //         await subClient.acknowledge(ackRequest);
        //     }
        // }
    });
});