import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';
import ConfigProvider from '../../../dist/config/ConfigProvider';
import {
    ErrorTags,
    ClassNames,
    DomainNames,
    GenericWrapperTags,
} from '../../../dist/Constants';

import * as GenericWrapper from '../../../dist/wrappers/generic/GenericWrapper';
import { createMockReporterInstance } from '../../mocks/mocks';

describe('Generic Wrapper Tests', () => {

    const firstValue = 'FieldValue';
    const changedValue = `changed-${firstValue}`;

    const testError = new Error('TestError');

    class Obj {
        field;
    
        constructor(field1) {
            this.field = field1;
        }
    
        changeFieldValue(){
            this.field = changedValue;
        }
    }

    const syncFunction = (value) => {
        value.changeFieldValue(); 
        return value;
    };

    const asyncFunction = async (value) => {
        value.changeFieldValue();  
        return value;
    };

    const syncErrorFunction = (value) => {
        throw testError;
    };

    const asyncErrorFunction = async (value) => {
        throw testError;
    };

    beforeAll(async () => {

        ConfigProvider.init({ apiKey: 'foo' });

        GenericWrapper.__PRIVATE__.getReporter = jest.fn(() => createMockReporterInstance());
    });
    
    afterAll(() => {
    });
    
    beforeEach(() => {
        ExecutionContextManager.useGlobalProvider();
    });

    test('should sync function wrapped with "wrapper"', async () => {   
        const result = await GenericWrapper.wrapper(syncFunction)(new Obj(firstValue));

        expect(result.field).toBe(changedValue);

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();

        const span = spanList[0];

        expect(span.operationName).toBe(syncFunction.name);
        expect(span.className).toBe(ClassNames.NODE_HANDLER);
        expect(span.domainName).toBe(DomainNames.NODE_GENERIC);
        expect(span.startTime).toBeTruthy();
        expect(span.finishTime).toBeTruthy();
        expect(span.tags[GenericWrapperTags.Function_Name]).toBe(syncFunction.name);
    });

    test('should handle error on sync function wrapped with "wrapper"', async () => { 
        
        try {
            await GenericWrapper.wrapper(syncErrorFunction)(new Obj(firstValue));
        } catch (error) {
            const execContext = ExecutionContextManager.get();
            const spanList = execContext.tracer.getSpanList();
    
            const span = spanList[0];

            expect(span.operationName).toBe(syncErrorFunction.name);
            expect(span.startTime).toBeTruthy();
            expect(span.finishTime).toBeTruthy();
    
            expect(span.tags[ErrorTags.ERROR]).toBeTruthy();
            expect(span.tags[ErrorTags.ERROR_KIND]).toBe(testError.name);
            expect(span.tags[ErrorTags.ERROR_MESSAGE]).toBe(testError.message);
            expect(span.tags[GenericWrapperTags.Function_Name]).toBe(syncErrorFunction.name);
        }
    });

    test('should async function wrapped with "wrapper"', async () => {
        const result = await GenericWrapper.wrapper(asyncFunction)(new Obj(firstValue));

        expect(result.field).toBe(changedValue);

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();

        const span = spanList[0];

        expect(span.operationName).toBe(asyncFunction.name);
        expect(span.className).toBe(ClassNames.NODE_HANDLER);
        expect(span.domainName).toBe(DomainNames.NODE_GENERIC);
        expect(span.startTime).toBeTruthy();
        expect(span.finishTime).toBeTruthy();
        expect(span.tags[GenericWrapperTags.Function_Name]).toBe(asyncFunction.name);
    });

    test('should handle error on async function wrapped with "wrapper"', async () => { 
        
        try {
            await GenericWrapper.wrapper(asyncErrorFunction)(new Obj(firstValue));
        } catch (error) {
            const execContext = ExecutionContextManager.get();
            const spanList = execContext.tracer.getSpanList();
    
            const span = spanList[0];

            expect(span.operationName).toBe(asyncErrorFunction.name);
            expect(span.startTime).toBeTruthy();
            expect(span.finishTime).toBeTruthy();
    
            expect(span.tags[ErrorTags.ERROR]).toBeTruthy();
            expect(span.tags[ErrorTags.ERROR_KIND]).toBe(testError.name);
            expect(span.tags[ErrorTags.ERROR_MESSAGE]).toBe(testError.message);
            expect(span.tags[GenericWrapperTags.Function_Name]).toBe(asyncErrorFunction.name);
        }
    });
});