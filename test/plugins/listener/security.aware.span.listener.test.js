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

    test('Should use the values given in the config', () => {
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

    const wlSaslConfig = {
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
        ]
    };

    const wlSasl = new SecurityAwareSpanListener(wlSaslConfig);
    test('Should whitelist spans', () => {
        const span1 = new ThundraSpan();
        span1.className = 'HTTP';
        span1.setTag('http.host', 'www.google.com');
        span1.setTag(SpanTags.OPERATION_TYPE, 'GET');
        span1.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        
        const span2 = new ThundraSpan();
        span2.className = 'HTTP';
        span2.setTag('http.host', 'www.yahoo.com');
        span2.setTag(SpanTags.OPERATION_TYPE, 'GET');
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
        span3.setTag(SpanTags.OPERATION_TYPE, 'POST');
        span3.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        const span4 = new ThundraSpan();
        span4.className = 'AWS-DynamoDB';
        span4.setTag(SpanTags.OPERATION_TYPE, 'WRITE');
        span4.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        const span5 = new ThundraSpan();
        span5.className = 'HTTP';
        span5.setTag('http.host', 'www.google.com');
        span5.setTag(SpanTags.OPERATION_TYPE, 'POST');
        span5.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        try {
            wlSasl.onSpanInitialized(span3);
        } catch (err) {}

        expect(span3.getTag('error')).toBeTruthy();
        expect(span3.getTag('error.kind')).toEqual('SecurityError');
        expect(span3.getTag('error.kind')).toEqual('SecurityError');
        expect(span3.getTag(SecurityTags.BLOCKED)).toBeTruthy();

        try {
            wlSasl.onSpanInitialized(span4);
        } catch (err) {}

        expect(span4.getTag('error')).toBeTruthy();
        expect(span4.getTag('error.kind')).toEqual('SecurityError');
        expect(span4.getTag('error.kind')).toEqual('SecurityError');
        expect(span4.getTag(SecurityTags.BLOCKED)).toBeTruthy();

        try {
            wlSasl.onSpanInitialized(span5);
        } catch (err) {}

        expect(span5.getTag('error')).toBeTruthy();
        expect(span5.getTag('error.kind')).toEqual('SecurityError');
        expect(span5.getTag('error.kind')).toEqual('SecurityError');
        expect(span5.getTag(SecurityTags.BLOCKED)).toBeTruthy();
    });
});