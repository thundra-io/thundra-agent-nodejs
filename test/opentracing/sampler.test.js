import DurationAwareSampler from '../../dist/opentracing/sampler/DurationAwareSampler';
import ErrorAwareSampler from '../../dist/opentracing/sampler/ErrorAwareSampler';
import TimeAwareSampler from '../../dist/opentracing/sampler/TimeAwareSampler';
import CountAwareSampler from '../../dist/opentracing/sampler/CountAwareSampler';
import CompositeSampler from '../../dist/opentracing/sampler/CompositeSampler';
import { SamplerCompositionOperator } from '../../dist/opentracing/sampler/CompositeSampler';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';

describe('duration aware sampler with duration 500ms and longerThan true', () => {
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

describe('error aware sampler', () => {
    const sampler = new ErrorAwareSampler();

    test('should sample root span with error', () => {
        const mockExecContext = new ExecutionContext({ error: new Error() });
        ExecutionContextManager.set(mockExecContext);

        expect(sampler.isSampled()).toBe(true);
    });

    test('should not sample root span without error', () => {
        const mockExecContext = new ExecutionContext();
        ExecutionContextManager.set(mockExecContext);

        expect(sampler.isSampled()).toBe(false);
    });
});

describe('time aware sampler with time frequency 2 second', () => {
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

describe('count aware sampler with count frequency 5', () => {
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

describe('composite sampler with error and count aware samplers with frequency 5 with OR operator', () => {
    const sampler1 = new CountAwareSampler(5);
    const sampler2 = new ErrorAwareSampler();

    const samplers = [];
    samplers.push(sampler1);
    samplers.push(sampler2);

    const sampler = new CompositeSampler(samplers);
    let sampledCount = 0;

    test('should sample 10 of 10 calls', () => {
        const mockExecContext = new ExecutionContext({ error: new Error() });
        ExecutionContextManager.set(mockExecContext);

        for (let sample = 0; sample < 10; sample++) {
            if (sampler.isSampled()) {
                sampledCount++;
            }
        }
        expect(sampledCount).toBe(10);
    });
});

describe('composite sampler with error and count aware samplers with frequency 5 with AND operator.', () => {
    const sampler1 = new CountAwareSampler(5);
    const sampler2 = new ErrorAwareSampler();

    const samplers = [];
    samplers.push(sampler1);
    samplers.push(sampler2);

    const sampler = new CompositeSampler(samplers, SamplerCompositionOperator.AND);
    let sampledCount = 0;

    test('should sample 2 of 10 calls', () => {
        const mockExecContext = new ExecutionContext({ error: new Error() });
        ExecutionContextManager.set(mockExecContext);

        for (let sample = 0; sample < 10; sample++) {
            if (sampler.isSampled()) {
                sampledCount++;
            }
        }
        expect(sampledCount).toBe(2);
    });
});

describe('composite sampler should pass data to underlying sampler', () => {
    const sampler1 = new DurationAwareSampler(500, true);

    const samplers = [];
    samplers.push(sampler1);

    const sampler = new CompositeSampler(samplers, SamplerCompositionOperator.AND);

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