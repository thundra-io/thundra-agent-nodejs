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

            beforeAll(() => {
                thundraWrapper = Thundra({ apiKey: 'apiKey' });
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

        describe('by env variable', () => {
            const originalEvent = { key: 'value' };
            const originalContext = createMockContext();
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;

            beforeAll(() => {
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_APIKEY, 'apiKey');

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
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_DISABLE, true);
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
        describe('by parameters', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;

            beforeAll(() => {
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

        describe('by true env variables', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;

            beforeAll(() => {
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_TRACE_DISABLE, true);
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_METRIC_DISABLE, true);

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

        describe('by false env variables', () => {
            const originalEvent = {key: 'value'};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((event, context, callback) => callback());
            let thundraWrapper;
            let wrappedFunction;
            
            beforeAll(() => {
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_TRACE_DISABLE, false);
                ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_METRIC_DISABLE, 'ignore');

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

    describe('when it is a warmup and warmup env variable is true', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;

        beforeAll(() => {
            ConfigProvider.setAsEnvVar(ConfigNames.THUNDRA_LAMBDA_WARMUP_WARMUPAWARE, true);

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

    describe('when it is a warmup and warmup env variable is not set', () => {
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((event, context, callback) => callback());
        let thundraWrapper;
        let wrappedFunction;
        
        beforeAll(() => {
            thundraWrapper = Thundra({ apiKey: 'apiKey' });
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
                thundraWrapper = new Thundra({ apiKey: 'apiKey', trustAllCert: true });
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

                thundraWrapper = new Thundra({ apiKey: 'apiKey' });
                wrappedFunction = thundraWrapper(originalFunction); 
                return wrappedFunction(originalEvent, originalContext, originalCallback);
            });

            it('should set env variable', () => {
                expect(Utils.getEnvVar(EnvVariableKeys.NODE_TLS_REJECT_UNAUTHORIZED)).toBe('0');
            });
        });
    });

});
