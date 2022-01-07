const Thundra = require('../dist/index');
import LambdaHandlerWrapper from '../dist/wrappers/lambda/LambdaHandlerWrapper';
import Utils from '../dist/utils/Utils.js';
import ConfigProvider from '../dist/config/ConfigProvider';
import ConfigNames from '../dist/config/ConfigNames';
import { EnvVariableKeys } from '../dist/Constants';

import TestUtils from './utils.js';
import { createMockContext } from './mocks/mocks';

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

    LambdaHandlerWrapper.prototype.executeAfterInvocationAndReport = jest.fn();
});

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

describe('thundra library', () => {

    describe('with api key', () => {
        describe('by parameter', () => {
            const originalEvent = { key: 'value' };
            const originalContext = createMockContext();
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            let returnedPromise;
            let returnedPromiseResolved;

            beforeAll(() => {
                ConfigProvider.init({ apiKey: 'apiKey' });

                thundraWrapper = Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                returnedPromise = wrappedFunction(originalEvent, originalContext, originalCallback);
                returnedPromise.then(() => returnedPromiseResolved = true);
            });

            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });

            it('should resolve the returned promise', () => {
                expect(returnedPromiseResolved).toBe(true);
            });
        });

        describe('by env variable', () => {
            const originalEvent = { key: 'value' };
            const originalContext = createMockContext();
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => {
                return callback();
            });
            let thundraWrapper;
            let wrappedFunction;
            let returnedPromise;
            let returnedPromiseResolved;

            beforeAll(() => {
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_APIKEY, 'apiKey');
                ConfigProvider.init({ });

                thundraWrapper = Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                returnedPromise = wrappedFunction(originalEvent, originalContext, originalCallback);
                returnedPromise.then(() => returnedPromiseResolved = true);
            });

            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });

            it('should resolve the returned promise', () => {
                expect(returnedPromiseResolved).toBe(true);
            });
        });
    });

    describe('disabled', () => {
        describe('by parameter', () => {
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                ConfigProvider.init({ apiKey: 'apiKey', disableThundra: true, plugins: [] });

                thundraWrapper = Thundra();
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
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_DISABLE, true);
                ConfigProvider.init({ apiKey: 'apiKey' });

                thundraWrapper = Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should not wrap', () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });
    });

    describe('without plugins', () => {
        describe('by parameters', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            let returnedPromise;
            let returnedPromiseResolved;

            beforeAll(() => {
                ConfigProvider.init({ apiKey: 'apiKey', disableTrace: true, disableMetric: true });

                thundraWrapper = Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                returnedPromise = wrappedFunction(originalEvent, originalContext, originalCallback);
                returnedPromise.then(() => returnedPromiseResolved = true);
            });
            
            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should resolve the returned promise', () => {
                expect(returnedPromiseResolved).toBe(true);
            });
        });

        describe('by true env variables', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            let returnedPromise;
            let returnedPromiseResolved;

            beforeAll(() => {
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_TRACE_DISABLE, true);
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_METRIC_DISABLE, true);
                ConfigProvider.init({ apiKey: 'apiKey' });

                thundraWrapper = Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                returnedPromise = wrappedFunction(originalEvent, originalContext, originalCallback);
                returnedPromise.then(() => returnedPromiseResolved = true);
            });

            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should resolve the returned promise', () => {
                expect(returnedPromiseResolved).toBe(true);
            });
        });

        describe('by false env variables', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            let returnedPromise;
            let returnedPromiseResolved;
            
            beforeAll(() => {
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_TRACE_DISABLE, false);
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_METRIC_DISABLE, 'ignore');
                ConfigProvider.init({ apiKey: 'apiKey' });

                thundraWrapper = Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                returnedPromise = wrappedFunction(originalEvent, originalContext, originalCallback);
                returnedPromise.then(() => returnedPromiseResolved = true);
            });

            it('should invoke the function', () => {
                expect(originalFunction).toBeCalled();
            });
            it('should resolve the returned promise', () => {
                expect(returnedPromiseResolved).toBe(true);
            });
        });
    });

    describe('when it is a warmup and warmup env variable is true', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;

        beforeAll(() => {
            ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_LAMBDA_WARMUP_WARMUPAWARE, true);
            ConfigProvider.init({ apiKey: 'apiKey' });

            const thundraWrapper = Thundra();
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

    describe('when it is a warmup and warmup env variable is not set', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;
        
        beforeAll(() => {
            ConfigProvider.init({ apiKey: 'apiKey' });

            thundraWrapper = Thundra();
            wrappedFunction = thundraWrapper(originalFunction);
            
            return wrappedFunction(originalEvent, originalContext, originalCallback);
        });

        it('should invoke the function', () => {
            expect(originalFunction).toBeCalled();
        });
    });

    describe('authorize all certs', () => {
        describe('by parameter', () => {
            const originalEvent = { key: 'value' };
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                ConfigProvider.init({ apiKey: 'apiKey', trustAllCert: true });

                thundraWrapper = new Thundra();
                wrappedFunction = thundraWrapper(originalFunction);
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should set env variable', () => {
                expect(Utils.getEnvVar(EnvVariableKeys.NODE_TLS_REJECT_UNAUTHORIZED)).toBe('0');
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
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_REPORT_REST_TRUSTALLCERTIFICATES, true);
                ConfigProvider.init( { apiKey: 'apiKey' });

                thundraWrapper = new Thundra();
                wrappedFunction = thundraWrapper(originalFunction); 
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should set env variable', () => {
                expect(Utils.getEnvVar(EnvVariableKeys.NODE_TLS_REJECT_UNAUTHORIZED)).toBe('0');
            });
        });
    });

});
