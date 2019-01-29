import DurationAwareSampler from '../../dist/opentracing/sampler/DurationAwareSampler';
import ErrorAwareSampler from '../../dist/opentracing/sampler/ErrorAwareSampler';
import TimeAwareSampler from '../../dist/opentracing/sampler/TimeAwareSampler';
import CountAwareSampler from '../../dist/opentracing/sampler/CountAwareSampler';
import ThundraSpan from '../../dist/opentracing/Span';


describe('DurationAwareSampler with duration 500ms and longerThan true', () => {
    const sampler = new DurationAwareSampler(500, true);

    test('should sample root span with duration greater than 500 ms', () => {
        const mockSpan = {
            getDuration: () => 1000
        };
        expect(sampler.isSampled(mockSpan)).toBe(true);
    });

    test('should not sample root span with duration smaller than 500 ms', () => {
        const mockSpan = {
            getDuration: () => 200
        };

        expect(sampler.isSampled(mockSpan)).toBe(false);
    });
});

describe('ErrorAwareSampler', () => {
    const sampler = new ErrorAwareSampler();

    test('should sample root span with error', () => {
        const span = new ThundraSpan();
        span.setTag('error', true);
        expect(sampler.isSampled(span)).toBe(true);
    });

    test('should not sample root span without error', () => {
        const span = new ThundraSpan();
        expect(sampler.isSampled(span)).toBe(false);
    });
});

describe('TimeAwareSampler with time frequency 2 second', () => {
    const sampler = new TimeAwareSampler(2000);

    test('should not sample after calling 1 second', (done) => {
        sampler.isSampled();
        setTimeout(() => {
            expect(sampler.isSampled()).toBe(false);
            done();
        }, 1000);
        
    });

    test('should sample after calling more than 2 seconds', (done) => {
        sampler.isSampled();
        setTimeout(() => {
            expect(sampler.isSampled()).toBe(true);
            done();
        }, 2001);
    });
});

describe('CountAwareSampler with count frequency 5', () => {
    const sampler = new CountAwareSampler(5);
    let sampledCount = 0;

    test('should sample 2 of 10 calls', () => {
        for (let sample = 0; sample < 10; sample++) {
            if (sampler.isSampled()) {
                sampledCount++;
            }
        }

        expect(sampledCount).toBe(2);
    });
});