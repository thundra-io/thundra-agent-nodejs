import SecurityAwareSpanListener from '../../../dist/plugins/listeners/SecurityAwareSpanListener';
import ThundraSpan from '../../../dist/opentracing/Span';
import { SecurityTags, SpanTags } from '../../../dist/Constants';

describe('SecurityAwareSpanListener', () => {
    const saslConfig = {
        block: true,
        whitelist: [
            {
                className: 'HTTP',
                tags: {
                    'http.host': ['www.google.com', 'www.yahoo.com']
                },
                operationTypes: [
                    'TODO'
                ],
            },
            {
                className: 'AWS-DynamoDB',
                tags: {
                    'aws.dynamodb.table.name': ['Users']
                },
                operationTypes: [
                    'TODO'
                ],
            }
        ],
        blacklist: [
            {
                className: 'HTTP',
                tags: {
                    'http.host': ['www.foo.com', 'www.bar.com']
                },
                operationTypes: [
                    'TODO'
                ],
            },
            {
                className: 'AWS-SNS',
                tags: {
                    'aws.sns.topic.name': ['foo-topic'] 
                },
                operationTypes: [
                    'TODO'
                ],
            }
        ]
    };

    const sasl = new SecurityAwareSpanListener(saslConfig);

    it('Should use the values given in the config', () => {
        expect(sasl.block).toBe(true);
        expect(sasl.whitelist.length).toBe(2);
        expect(sasl.blacklist.length).toBe(2);
        expect(sasl.whitelist[0].className).toBe('HTTP');
        expect(sasl.whitelist[0].tags).toEqual({ 'http.host': ['www.google.com', 'www.yahoo.com']});
        expect(sasl.whitelist[0].operationTypes).toEqual(['TODO']);
        expect(sasl.whitelist[1].className).toBe('AWS-DynamoDB');
        expect(sasl.whitelist[1].tags).toEqual({ 'aws.dynamodb.table.name': ['Users']});
        expect(sasl.whitelist[1].operationTypes).toEqual(['TODO']);
    });

    const wlSaslConfig = {
        block: true,
        whitelist: [
            {
                className: 'HTTP',
                tags: {
                    'http.host': ['www.google.com', 'www.yahoo.com']
                },
                operationTypes: [
                    'TODO'
                ],
            },
            {
                className: 'AWS-DynamoDB',
                tags: {
                    'aws.dynamodb.table.name': ['Users']
                },
                operationTypes: [
                    'TODO'
                ],
            }
        ]
    };

    const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);
    it('Should whitelist spans', () => {
        const span1 = new ThundraSpan();
        span1.className = 'HTTP';
        span1.setTag('http.host', 'www.google.com');
        span1.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        
        const span2 = new ThundraSpan();
        span2.className = 'HTTP';
        span2.setTag('http.host', 'www.yahoo.com');
        span2.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        wlSasl.onSpanStarted(span1);
        wlSasl.onSpanStarted(span2);

        expect(span1.getTag(SecurityTags.BLOCKED)).toBeUndefined();
        expect(span1.getTag(SecurityTags.VIOLATED)).toBeUndefined();
        expect(span2.getTag(SecurityTags.BLOCKED)).toBeUndefined();
        expect(span2.getTag(SecurityTags.VIOLATED)).toBeUndefined();

        const span3 = new ThundraSpan();
        span3.className = 'HTTP';
        span3.setTag('http.host', 'www.example.com');
        span3.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        const span4 = new ThundraSpan();
        span4.className = 'AWS-DynamoDB';
        span4.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        try {
            wlSasl.onSpanStarted(span3);
        } catch (err) {}

        expect(span3.getTag('error')).toBeTruthy();
        expect(span3.getTag('error.kind')).toEqual('SecurityError');
        expect(span3.getTag('error.kind')).toEqual('SecurityError');
        expect(span3.getTag(SecurityTags.BLOCKED)).toBeTruthy();

        try {
            wlSasl.onSpanStarted(span4);
        } catch (err) {}

        expect(span4.getTag('error')).toBeTruthy();
        expect(span4.getTag('error.kind')).toEqual('SecurityError');
        expect(span4.getTag('error.kind')).toEqual('SecurityError');
        expect(span4.getTag(SecurityTags.BLOCKED)).toBeTruthy();
    });
});