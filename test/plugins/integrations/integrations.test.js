const Thundra = require('../../../dist/index');
process.env.AWS_LAMBDA_LOG_STREAM_NAME = '2018/03/02/[$LATEST]applicationId';

describe('Integrations', () => {
    let client;

    describe('redis', () => {
        describe('without configuration', () => {
            afterEach(() => {
                client.quit();
                client = null;
            });

            it('should run redis', done => {
                const thundraWrapper = Thundra({ 
                    apiKey: 'api-key',
                    traceConfig : {
                        integrations: ['redis'],
                    },
                });

                const redis = require('redis');
                client = redis.createClient();
                client.on('error', done);
                client.get('foo', (err, reply) => {
                    done();
                });
            });
        });
    });
}); 