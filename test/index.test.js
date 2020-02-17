const Thundra = require('../dist/index');
import Utils from '../dist/plugins/utils/Utils.js';
import { createMockContext } from './mocks/mocks';
import ThundraWrapper from '../dist/ThundraWrapper';

beforeAll(() => {
    Utils.readProcIoPromise = jest.fn(() => {
        return new Promise((resolve, reject) => {
            return resolve({ readBytes: 1024, writeBytes: 4096 });
        });
    });
    
    Utils.readProcMetricPromise = jest.fn(() => {
        return new Promise((resolve, reject) => {
            return resolve({ threadCount: 10 });
        });
    });

    ThundraWrapper.prototype.executeAfteInvocationAndReport = jest.fn();
});

describe('thundra library', () => {
    describe('with env apiKey', () => {
        const originalEvent = { key: 'value' };
        const originalContext = createMockContext();
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;

        beforeAll(() => {
            process.env.thundra_apiKey = 'apiKey';

            thundraWrapper = Thundra();
            wrappedFunction = thundraWrapper(originalFunction);
            return wrappedFunction(originalEvent, originalContext, originalCallback);
        });

        it('should invoke the function', () => {
            expect(originalFunction).toBeCalled();
        });

        it('should invoke the callback', () => {
            expect(originalCallback).toBeCalled();
        });
    });

    describe('thundra disabled', () => {
        describe('by parameter', () => {
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                delete process.env.thundra_agent_lambda_disable;
                
                thundraWrapper = Thundra({ apiKey: 'apiKey', disableThundra: true, plugins: [] });
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should not wrap', () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });

        describe('by env variable', () => {
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;

            beforeAll(() => {
                process.env.thundra_agent_lambda_disable = 'true';
                thundraWrapper = Thundra({ apiKey: 'apiKey' });
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should not wrap', () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });
    });

    describe('without plugins', () => {
        describe('using parameters', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;

            beforeAll(() => {
                delete process.env.thundra_agent_lambda_trace_disable;
                delete process.env.thundra_agent_lambda_metric_disable;
                delete process.env.thundra_agent_lambda_log_disable;
                delete process.env.thundra_apiKey;

                thundraWrapper = Thundra({apiKey: 'apiKey', disableTrace: true, disableMetric: true});
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });
            
            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should invoke the callback', () => {
                expect(originalCallback).toBeCalled();
            });
        });

        describe('using true env variables', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;

            beforeAll(() => {
                delete process.env.thundra_agent_lambda_disable;
                delete process.env.thundra_apiKey;
                process.env.thundra_agent_lambda_trace_disable = 'true';
                process.env.thundra_agent_lambda_metric_disable = 'true';

                thundraWrapper = Thundra({apiKey: 'apiKey'});
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should invoke the callback', () => {
                expect(originalCallback).toBeCalled();
            });
        });

        describe('using false env variables', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                delete process.env.thundra_agent_lambda_disable;
                delete process.env.thundra_apiKey;
                process.env.thundra_agent_lambda_trace_disable = 'false';
                process.env.thundra_agent_lambda_metric_disable = 'ignore';

                thundraWrapper = Thundra({apiKey: 'apiKey'});
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should invoke the callback', () => {
                expect(originalCallback).toBeCalled();
            });
        });
    });

    describe('when it is a warmup and thundra_agent_lambda_warmup_warmupAware is true', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;

        beforeAll(() => {
            process.env.thundra_agent_lambda_warmup_warmupAware = 'true';
            const thundraWrapper = Thundra({ apiKey: 'apiKey' });
            const wrappedFunction = thundraWrapper(originalFunction);

            console.log = jest.fn();
            jest.useFakeTimers();
            return wrappedFunction(originalEvent, originalContext, originalCallback);
            jest.runAllTimers();
        });

        it('should not invoke the function', () => {
            expect(originalFunction).not.toBeCalled();
        });
    });

    describe('when it is a warmup and thundra_agent_lambda_warmup_warmupAware is not set', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;
        
        beforeAll(() => {
            delete process.env.thundra_agent_lambda_warmup_warmupAware;
            thundraWrapper = Thundra({ apiKey: 'apiKey' });
            wrappedFunction = thundraWrapper(originalFunction);
            
            return wrappedFunction(originalEvent, originalContext, originalCallback);
        });

        it('should invoke the function', () => {
            expect(originalFunction).toBeCalled();
        });

    });

    describe('authorize All Certs', () => {
        describe('enabled by config', () => {
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                delete process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates;
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
                
                thundraWrapper = new Thundra({ apiKey: 'apiKey', trustAllCert: true });
                wrappedFunction = new thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should set environment variable', () => {
                expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
            });
        });

        describe('enabled by environment variable', () => {
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                delete process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates;
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
                process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates = true;

                thundraWrapper = new Thundra({ apiKey: 'apiKey', trustAllCert: true });
                wrappedFunction = new thundraWrapper(originalFunction); 
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should set environment variable', () => {
                expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
            });
        });
    });
});