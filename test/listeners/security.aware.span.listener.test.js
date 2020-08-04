import SecurityAwareSpanListener from '../../dist/opentracing/listeners/SecurityAwareSpanListener';
import ThundraSpan from '../../dist/opentracing/Span';
import { SecurityTags, SpanTags } from '../../dist/Constants';

describe('security aware span listener', () => {
    const securityErrorType = 'SecurityError';
    const securityErrorMessage = 'Operation was blocked due to security configuration';

    test('should use the values given in the config', () => {
        const saslConfig = {
            block: true,
            whitelist: [
                {
                    className: 'HTTP',
                    tags: {
                        'http.host': ['www.google.com', 'www.yahoo.com'],
                        'operation.type': ['GET']
                    },
                },
                {
                    className: 'AWS-DynamoDB',
                    tags: {
                        'aws.dynamodb.table.name': ['Users'],
                        'operation.type': ['READ']
                    },
                }
            ],
            blacklist: [
                {
                    className: 'HTTP',
                    tags: {
                        'http.host': ['www.foo.com', 'www.bar.com'],
                        'operation.type': ['POST']
                    },
                },
                {
                    className: 'AWS-SNS',
                    tags: {
                        'aws.sns.topic.name': ['foo-topic'],
                        'operation.type': ['WRITE']
                    },
                }
            ]
        };
    
        const sasl = new SecurityAwareSpanListener(saslConfig);

        expect(sasl.block).toBe(true);
        expect(sasl.whitelist.length).toBe(2);
        expect(sasl.blacklist.length).toBe(2);
        expect(sasl.whitelist[0].className).toBe('HTTP');
        expect(sasl.whitelist[0].tags).toEqual({ 'http.host': ['www.google.com', 'www.yahoo.com'], 'operation.type': ['GET']});
        expect(sasl.whitelist[1].className).toBe('AWS-DynamoDB');
        expect(sasl.whitelist[1].tags).toEqual({ 'aws.dynamodb.table.name': ['Users'], 'operation.type': ['READ']});
        expect(sasl.blacklist[0].className).toBe('HTTP');
        expect(sasl.blacklist[0].tags).toEqual({ 'http.host': ['www.foo.com', 'www.bar.com'], 'operation.type': ['POST']});
        expect(sasl.blacklist[1].className).toBe('AWS-SNS');
        expect(sasl.blacklist[1].tags).toEqual({ 'aws.sns.topic.name': ['foo-topic'], 'operation.type': ['WRITE']});
    });
    
    describe('using whitelist', () => {
        test('should match corresponding operations', () => {
            const wlSaslConfig = {
                block: true,
                whitelist: [
                    {
                        className: 'HTTP',
                        tags: {
                            'http.host': ['host1.com', 'host2.com'],
                            'operation.type': ['GET']
                        },
                    },
                    {
                        className: 'AWS-DynamoDB',
                        tags: {
                            'aws.dynamodb.table.name': ['users'],
                            'operation.type': ['READ']
                        },
                    }
                ]
            };
        
            const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);

            const spans = [
                {className: 'HTTP', operationType: 'GET', resourceNameKey: 'http.host', resourceNameVal: 'host1.com', shouldReject: false},
                {className: 'HTTP', operationType: 'GET', resourceNameKey: 'http.host', resourceNameVal: 'host2.com', shouldReject: false},
                {className: 'AWS-DynamoDB', operationType: 'READ', resourceNameKey: 'aws.dynamodb.table.name', resourceNameVal: 'users', shouldReject: false},
                {className: 'HTTP', operationType: 'POST', resourceNameKey: 'http.host', resourceNameVal: 'host1.com', shouldReject: true},
                {className: 'HTTP', operationType: 'POST', resourceNameKey: 'http.host', resourceNameVal: 'host2.com', shouldReject: true},
                {className: 'AWS-DynamoDB', operationType: 'WRITE', resourceNameKey: 'aws.dynamodb.table.name', resourceNameVal: 'users', shouldReject: true},
            ].map(config => {
                const span = new ThundraSpan();

                span.className = config.className;
                span.setTag(config.resourceNameKey, config.resourceNameVal);
                span.setTag(SpanTags.OPERATION_TYPE, config.operationType);
                span.setTag('shouldReject', config.shouldReject);
                span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                
                return span;
            });

            for (const span of spans) {
                const shouldReject = span.getTag('shouldReject');
                try {
                    wlSasl.onSpanInitialized(span);
                } catch (err) {}

                if (!shouldReject) {
                    expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                    expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
                } else if (shouldReject) {
                    expect(span.getTag('error')).toBeTruthy();
                    expect(span.getTag('error.kind')).toEqual(securityErrorType);
                    expect(span.getTag('error.message')).toEqual(securityErrorMessage);
                    expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
                    expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
                }
            }
        });
        
        test('should block nothing when no whitelist exists', () => {
            const wlSaslConfig = {
                block: true,
            };
        
            const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);

            const span1 = new ThundraSpan();
            span1.className = 'HTTP';
            span1.setTag('http.host', 'www.google.com');
            span1.setTag(SpanTags.OPERATION_TYPE, 'GET');
            span1.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            
            const span2 = new ThundraSpan();
            span2.className = 'AWS-SQS';
            span2.setTag('aws.sqs.queue.name', 'foo');
            span2.setTag(SpanTags.OPERATION_TYPE, 'POST');
            span2.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const span3 = new ThundraSpan();
            span3.className = 'AWS-DynamoDB';
            span3.setTag('aws.dynamodb.table.name', 'foo');
            span3.setTag(SpanTags.OPERATION_TYPE, 'WRITE');
            span3.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const spans = [span1, span2, span3];
            for (const span of spans) {
                wlSasl.onSpanInitialized(span);
        
                expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
            }
        });
        
        test('should block all spans when whitelist is empty', () => {
            const wlSaslConfig = {
                block: true,
                whitelist: [],
            };
        
            const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);
    
            const span1 = new ThundraSpan();
            span1.className = 'HTTP';
            span1.setTag('http.host', 'www.google.com');
            span1.setTag(SpanTags.OPERATION_TYPE, 'GET');
            span1.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            
            const span2 = new ThundraSpan();
            span2.className = 'AWS-SQS';
            span2.setTag('aws.sqs.queue.name', 'foo');
            span2.setTag(SpanTags.OPERATION_TYPE, 'POST');
            span2.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const span3 = new ThundraSpan();
            span3.className = 'AWS-DynamoDB';
            span3.setTag('aws.dynamodb.table.name', 'foo');
            span3.setTag(SpanTags.OPERATION_TYPE, 'WRITE');
            span3.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const spans = [span1, span2, span3];

            for (const span of spans) {
                try {
                    wlSasl.onSpanInitialized(span);
                } catch (err) {}
        
                expect(span.getTag('error')).toBeTruthy();
                expect(span.getTag('error.kind')).toEqual(securityErrorType);
                expect(span.getTag('error.message')).toEqual(securityErrorMessage);
                expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
            }
        });
        
        test('should handle wildcard values', () => {
            const wlSaslConfig = {
                block: true,
                whitelist: [
                    {
                        className: 'HTTP',
                        tags: {
                            'http.host': "*",
                            'operation.type': ['GET']
                        },
                    },
                ],
            };
        
            const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);

            const spansToBeAccepted = [
                {host: 'host1.com', method: 'GET'},
                {host: 'host2.com', method: 'GET'},
                {host: 'host3.com', method: 'GET'},
            ].map((config) => {
                const span = new ThundraSpan();
                span.className = 'HTTP';
                span.setTag('http.host', config.host);
                span.setTag(SpanTags.OPERATION_TYPE, config.method);
                span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                
                return span;
            });
            
            const spansToBeRejected = [
                {host: 'host1.com', method: 'PUT'},
                {host: 'host2.com', method: 'HEAD'},
                {host: 'host3.com', method: 'DELETE'},
            ].map((config) => {
                const span = new ThundraSpan();
                span.className = 'HTTP';
                span.setTag('http.host', config.host);
                span.setTag(SpanTags.OPERATION_TYPE, config.method);
                span.setTag(SpanTags.TOPOLOGY_VERTEX, true);

                return span;
            });

            for (const span of spansToBeAccepted) {
                wlSasl.onSpanInitialized(span);
        
                expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
            }
            
            for (const span of spansToBeRejected) {
                try {
                    wlSasl.onSpanInitialized(span);
                } catch (err) {}
        
                expect(span.getTag('error')).toBeTruthy();
                expect(span.getTag('error.kind')).toEqual(securityErrorType);
                expect(span.getTag('error.message')).toEqual(securityErrorMessage);
                expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
            }
        });
    });

    describe('using blacklist', () => {
        test('should match corresponding operations', () => {
            const blSaslConfig = {
                block: true,
                blacklist: [
                    {
                        className: 'HTTP',
                        tags: {
                            'http.host': ['host1.com', 'host2.com'],
                            'operation.type': ['GET']
                        },
                    },
                    {
                        className: 'AWS-DynamoDB',
                        tags: {
                            'aws.dynamodb.table.name': ['users'],
                            'operation.type': ['READ']
                        },
                    }
                ]
            };
        
            const blSasl = new SecurityAwareSpanListener(blSaslConfig);

            const spans = [
                {className: 'HTTP', operationType: 'GET', resourceNameKey: 'http.host', resourceNameVal: 'host1.com', shouldReject: true},
                {className: 'HTTP', operationType: 'GET', resourceNameKey: 'http.host', resourceNameVal: 'host2.com', shouldReject: true},
                {className: 'AWS-DynamoDB', operationType: 'READ', resourceNameKey: 'aws.dynamodb.table.name', resourceNameVal: 'users', shouldReject: true},
                {className: 'HTTP', operationType: 'POST', resourceNameKey: 'http.host', resourceNameVal: 'host1.com', shouldReject: false},
                {className: 'HTTP', operationType: 'POST', resourceNameKey: 'http.host', resourceNameVal: 'host2.com', shouldReject: false},
                {className: 'AWS-DynamoDB', operationType: 'WRITE', resourceNameKey: 'aws.dynamodb.table.name', resourceNameVal: 'users', shouldReject: false},
            ].map(config => {
                const span = new ThundraSpan();

                span.className = config.className;
                span.setTag(config.resourceNameKey, config.resourceNameVal);
                span.setTag(SpanTags.OPERATION_TYPE, config.operationType);
                span.setTag('shouldReject', config.shouldReject);
                span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                
                return span;
            });

            for (const span of spans) {
                const shouldReject = span.getTag('shouldReject');
                try {
                    blSasl.onSpanInitialized(span);
                } catch (err) {}

                if (!shouldReject) {
                    expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                    expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
                } else if (shouldReject) {
                    expect(span.getTag('error')).toBeTruthy();
                    expect(span.getTag('error.kind')).toEqual(securityErrorType);
                    expect(span.getTag('error.message')).toEqual(securityErrorMessage);
                    expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
                    expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
                }
            }
        });

        test('should block nothing when no whitelist exists', () => {
            const wlSaslConfig = {
                block: true,
            };
        
            const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);

            const span1 = new ThundraSpan();
            span1.className = 'HTTP';
            span1.setTag('http.host', 'www.google.com');
            span1.setTag(SpanTags.OPERATION_TYPE, 'GET');
            span1.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            
            const span2 = new ThundraSpan();
            span2.className = 'AWS-SQS';
            span2.setTag('aws.sqs.queue.name', 'foo');
            span2.setTag(SpanTags.OPERATION_TYPE, 'POST');
            span2.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const span3 = new ThundraSpan();
            span3.className = 'AWS-DynamoDB';
            span3.setTag('aws.dynamodb.table.name', 'foo');
            span3.setTag(SpanTags.OPERATION_TYPE, 'WRITE');
            span3.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const spans = [span1, span2, span3];
            for (const span of spans) {
                wlSasl.onSpanInitialized(span);
        
                expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
            }
        });
        
        test('should block nothing when blacklist is empty', () => {
            const blSaslConfig = {
                block: true,
                blacklist: [],
            };
        
            const blSasl = new SecurityAwareSpanListener(blSaslConfig);
    
            const span1 = new ThundraSpan();
            span1.className = 'HTTP';
            span1.setTag('http.host', 'www.google.com');
            span1.setTag(SpanTags.OPERATION_TYPE, 'GET');
            span1.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            
            const span2 = new ThundraSpan();
            span2.className = 'AWS-SQS';
            span2.setTag('aws.sqs.queue.name', 'foo');
            span2.setTag(SpanTags.OPERATION_TYPE, 'POST');
            span2.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const span3 = new ThundraSpan();
            span3.className = 'AWS-DynamoDB';
            span3.setTag('aws.dynamodb.table.name', 'foo');
            span3.setTag(SpanTags.OPERATION_TYPE, 'WRITE');
            span3.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    
            const spans = [span1, span2, span3];
            for (const span of spans) {
                blSasl.onSpanInitialized(span);

                expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
            }
        });
        
        test('should handle wildcard values', () => {
            const blSaslConfig = {
                block: true,
                blacklist: [
                    {
                        className: 'HTTP',
                        tags: {
                            'http.host': ["*"],
                            'operation.type': ['GET']
                        },
                    },
                ],
            };
        
            const blSasl = new SecurityAwareSpanListener(blSaslConfig);

            const spansToBeRejected = [
                {host: 'host1.com', method: 'GET'},
                {host: 'host2.com', method: 'GET'},
                {host: 'host3.com', method: 'GET'},
            ].map((config) => {
                const span = new ThundraSpan();
                span.className = 'HTTP';
                span.setTag('http.host', config.host);
                span.setTag(SpanTags.OPERATION_TYPE, config.method);
                span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                
                return span;
            });
            
            const spansToBeAccepted = [
                {host: 'host1.com', method: 'PUT'},
                {host: 'host2.com', method: 'HEAD'},
                {host: 'host3.com', method: 'DELETE'},
            ].map((config) => {
                const span = new ThundraSpan();
                span.className = 'HTTP';
                span.setTag('http.host', config.host);
                span.setTag(SpanTags.OPERATION_TYPE, config.method);
                span.setTag(SpanTags.TOPOLOGY_VERTEX, true);

                return span;
            });

            for (const span of spansToBeAccepted) {
                blSasl.onSpanInitialized(span);
        
                expect(span.getTag(SecurityTags.BLOCKED)).toBeUndefined();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeUndefined();
            }
            
            for (const span of spansToBeRejected) {
                try {
                    blSasl.onSpanInitialized(span);
                } catch (err) {}
        
                expect(span.getTag('error')).toBeTruthy();
                expect(span.getTag('error.kind')).toEqual(securityErrorType);
                expect(span.getTag('error.message')).toEqual(securityErrorMessage);
                expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
                expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
            }
        });
    });
});
