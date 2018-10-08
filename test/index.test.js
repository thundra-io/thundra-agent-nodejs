const Thundra = require('../dist/index');
import Utils from '../dist/plugins/Utils.js';
import { createMockContext } from './mocks/mocks';

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

process.env.AWS_LAMBDA_LOG_STREAM_NAME = '2018/03/02/[$LATEST]applicationId';
delete process.env.thundra_agent_lambda_trace_disable;
delete process.env.thundra_agent_lambda_metric_disable;
delete process.env.thundra_agent_lambda_log_disable;
delete process.env.thundra_apiKey;
delete process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates;
delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

describe('Thundra library', () => {

    describe('With env apiKey', () => {
        delete process.env.thundra_agent_lambda_disable;
        process.env.thundra_apiKey = 'apiKey';
        const originalEvent = { key: 'value' };
        const originalContext = createMockContext();
        const originalCallback = jest.fn();
        const originalFunction = jest.fn(() => originalCallback());
        const ThundraWrapper = Thundra();
        const wrappedFunction = ThundraWrapper(originalFunction);
        wrappedFunction(originalEvent, originalContext, originalCallback);
        it('should invoke the function', () => {
            expect(originalFunction).toBeCalled();
        });
        it('should invoke the callback', () => {
            expect(originalCallback).toBeCalled();
        });
    });

    describe('Thundra disabled', () => {
        describe('By no apiKey', () => {
            delete process.env.thundra_agent_lambda_disable;
            delete process.env.thundra_apiKey;
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra();
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);
            it('Should not wrap', () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });

        describe('By parameter', () => {
            delete process.env.thundra_agent_lambda_disable;
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({ apiKey: 'apiKey', disableThundra: true, plugins: [] });
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);
            it('Should not wrap', () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });

        describe('By env variable', () => {
            process.env.thundra_agent_lambda_disable = 'true';
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({ apiKey: 'apiKey' });
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);
            it('Should not wrap', () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });
    });

    describe('Without plugins', () => {
        describe('Using parameters', () => {
            delete process.env.thundra_agent_lambda_trace_disable;
            delete process.env.thundra_agent_lambda_metric_disable;
            delete process.env.thundra_agent_lambda_log_disable;
            delete process.env.thundra_apiKey;
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: 'apiKey', disableTrace: true, disableMetric: true});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);
            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should invoke the callback', () => {
                expect(originalCallback).toBeCalled();
            });
        });

        describe('Using true env variables', () => {
            delete process.env.thundra_agent_lambda_disable;
            delete process.env.thundra_apiKey;
            process.env.thundra_agent_lambda_trace_disable = 'true';
            process.env.thundra_agent_lambda_metric_disable = 'true';
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: 'apiKey'});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);
            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should invoke the callback', () => {
                expect(originalCallback).toBeCalled();
            });
        });

        describe('Using false env variables', () => {
            delete process.env.thundra_agent_lambda_disable;
            delete process.env.thundra_apiKey;
            process.env.thundra_agent_lambda_trace_disable = 'false';
            process.env.thundra_agent_lambda_metric_disable = 'ignore';
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: 'apiKey'});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);
            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should invoke the callback', () => {
                expect(originalCallback).toBeCalled();
            });
        });
    });

    describe('when it is a warmup', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn(() => originalCallback());
        const ThundraWrapper = Thundra({ apiKey: 'apiKey' });
        const wrappedFunction = ThundraWrapper(originalFunction);
        console['log'] = jest.fn();
        jest.useFakeTimers();
        wrappedFunction(originalEvent, originalContext, originalCallback);
        jest.runAllTimers();
        it('should not invoke the function', () => {
            expect(originalFunction).not.toBeCalled();
        });

    });

    describe('Authorize All Certs', () => {
        describe('enabled by config', () => {
            delete process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates;
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = new Thundra({ apiKey: 'apiKey', trustAllCert: true });
            const wrappedFunction = new ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);

            it('should set environment variable', () => {
                expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
            });
        });

        describe('enabled by environment variable', () => {
            delete process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates;
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

            process.env.thundra_agent_lambda_publish_report_rest_trustAllCertificates = true;

            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = new Thundra({ apiKey: 'apiKey', trustAllCert: true });
            const wrappedFunction = new ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent, originalContext, originalCallback);

            it('should set environment variable', () => {
                expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
            });
        });
    });
});